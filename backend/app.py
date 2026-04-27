import json
import os
import queue
import sqlite3
import threading
import time
import uuid

from flask import Flask, Response, jsonify, request, stream_with_context
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

DB_PATH = os.path.join(os.path.dirname(__file__), "polls.db")

# SSE subscribers: poll_id -> list of Queue objects
_subscribers: dict[str, list[queue.Queue]] = {}
_subscribers_lock = threading.Lock()


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_db()
    conn.execute("""
        CREATE TABLE IF NOT EXISTS polls (
            id TEXT PRIMARY KEY,
            question TEXT NOT NULL,
            option_a TEXT NOT NULL,
            option_b TEXT NOT NULL,
            created_at REAL NOT NULL,
            expires_at REAL NOT NULL
        )
    """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS votes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            poll_id TEXT NOT NULL,
            option TEXT NOT NULL,
            created_at REAL NOT NULL
        )
    """)
    conn.commit()
    conn.close()


def notify_subscribers(poll_id, data):
    with _subscribers_lock:
        queues = list(_subscribers.get(poll_id, []))
    for q in queues:
        try:
            q.put_nowait(data)
        except Exception:
            pass


def get_vote_counts(conn, poll_id):
    votes_a = conn.execute(
        "SELECT COUNT(*) FROM votes WHERE poll_id = ? AND option = 'a'", (poll_id,)
    ).fetchone()[0]
    votes_b = conn.execute(
        "SELECT COUNT(*) FROM votes WHERE poll_id = ? AND option = 'b'", (poll_id,)
    ).fetchone()[0]
    return votes_a, votes_b


# ---------------------------------------------------------------------------
# API routes
# ---------------------------------------------------------------------------

@app.route("/api/polls", methods=["POST"])
def create_poll():
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "No data provided"}), 400

    question = (data.get("question") or "").strip()
    option_a = (data.get("option_a") or "").strip()
    option_b = (data.get("option_b") or "").strip()
    duration = data.get("duration", 86400)

    if not question or not option_a or not option_b:
        return jsonify({"error": "Missing required fields"}), 400

    poll_id = str(uuid.uuid4())
    now = time.time()
    expires_at = now + float(duration)

    conn = get_db()
    conn.execute(
        "INSERT INTO polls (id, question, option_a, option_b, created_at, expires_at) VALUES (?, ?, ?, ?, ?, ?)",
        (poll_id, question, option_a, option_b, now, expires_at),
    )
    conn.commit()
    conn.close()

    return jsonify({"id": poll_id}), 201


@app.route("/api/polls/<poll_id>", methods=["GET"])
def get_poll(poll_id):
    conn = get_db()
    poll = conn.execute("SELECT * FROM polls WHERE id = ?", (poll_id,)).fetchone()
    if not poll:
        conn.close()
        return jsonify({"error": "Poll not found"}), 404

    now = time.time()
    locked = now > poll["expires_at"]
    votes_a, votes_b = get_vote_counts(conn, poll_id)
    conn.close()

    return jsonify({
        "id": poll_id,
        "question": poll["question"],
        "option_a": poll["option_a"],
        "option_b": poll["option_b"],
        "votes_a": votes_a,
        "votes_b": votes_b,
        "locked": locked,
        "expires_at": poll["expires_at"],
    })


@app.route("/api/polls/<poll_id>/vote", methods=["POST"])
def vote(poll_id):
    conn = get_db()
    poll = conn.execute("SELECT * FROM polls WHERE id = ?", (poll_id,)).fetchone()
    if not poll:
        conn.close()
        return jsonify({"error": "Poll not found"}), 404

    now = time.time()
    if now > poll["expires_at"]:
        conn.close()
        return jsonify({"error": "Poll is locked"}), 403

    data = request.get_json(silent=True) or {}
    option = None
    for key in ["option", "choice", "vote"]:
        val = str(data.get(key, "")).lower()
        if val in ("a", "b"):
            option = val
            break

    if not option:
        conn.close()
        return jsonify({"error": "Invalid option"}), 400

    conn.execute(
        "INSERT INTO votes (poll_id, option, created_at) VALUES (?, ?, ?)",
        (poll_id, option, now),
    )
    conn.commit()

    votes_a, votes_b = get_vote_counts(conn, poll_id)
    conn.close()

    update = {"votes_a": votes_a, "votes_b": votes_b}
    notify_subscribers(poll_id, update)

    return jsonify(update), 200


@app.route("/api/polls/<poll_id>/stream", methods=["GET"])
def stream(poll_id):
    def event_generator():
        q: queue.Queue = queue.Queue()
        with _subscribers_lock:
            if poll_id not in _subscribers:
                _subscribers[poll_id] = []
            _subscribers[poll_id].append(q)

        try:
            # Send current state immediately
            conn = get_db()
            poll = conn.execute("SELECT * FROM polls WHERE id = ?", (poll_id,)).fetchone()
            if poll:
                votes_a, votes_b = get_vote_counts(conn, poll_id)
                conn.close()
                yield f"data: {json.dumps({'votes_a': votes_a, 'votes_b': votes_b})}\n\n"
            else:
                conn.close()

            while True:
                try:
                    data = q.get(timeout=25)
                    yield f"data: {json.dumps(data)}\n\n"
                except queue.Empty:
                    yield ": heartbeat\n\n"
        finally:
            with _subscribers_lock:
                subs = _subscribers.get(poll_id, [])
                try:
                    subs.remove(q)
                except ValueError:
                    pass

    return Response(
        stream_with_context(event_generator()),
        content_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )


@app.route("/api/trending", methods=["GET"])
def trending():
    one_hour_ago = time.time() - 3600
    conn = get_db()
    rows = conn.execute(
        """
        SELECT p.id, p.question, COUNT(v.id) as recent_votes
        FROM polls p
        JOIN votes v ON p.id = v.poll_id
        WHERE v.created_at >= ?
        GROUP BY p.id
        ORDER BY recent_votes DESC
        LIMIT 5
        """,
        (one_hour_ago,),
    ).fetchall()
    conn.close()

    return jsonify([
        {"id": row["id"], "question": row["question"], "recent_votes": row["recent_votes"]}
        for row in rows
    ])


if __name__ == "__main__":
    init_db()
    app.run(host="0.0.0.0", port=3001, threaded=True, debug=False)
