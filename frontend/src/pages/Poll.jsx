import React, { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'

const API = 'http://localhost:3001/api'

function calcPct(a, b) {
  const total = a + b
  if (total === 0) return { aPct: 50, bPct: 50 }
  const aPct = Math.round((a / total) * 100)
  return { aPct, bPct: 100 - aPct }
}

export default function Poll() {
  const { id } = useParams()
  const [poll, setPoll] = useState(null)
  const [voted, setVoted] = useState(false)
  const [votesA, setVotesA] = useState(0)
  const [votesB, setVotesB] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const esRef = useRef(null)

  // Load poll data on mount
  useEffect(() => {
    fetch(`${API}/polls/${id}`)
      .then((r) => r)
      .then((data) => {
        if (data.error) {
          setError(data.error)
        } else {
          setPoll(data)
          setVotesA(data.votes_a || 0)
          setVotesB(data.votes_b || 0)
          // If poll is locked, show results immediately
          if (data.locked) {
            setVoted(true)
          }
        }
        setLoading(false)
      })
      .catch(() => {
        setError('Failed to load poll.')
        setLoading(false)
      })
  }, [id])

  // Subscribe to SSE when results panel is shown (voted = true)
  useEffect(() => {
    if (!voted) return

    const es = new EventSource(`${API}/polls/${id}/stream`)
    esRef.current = es

    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data)
        if (typeof data.votes_a === 'number') setVotesA(data.votes_a)
        if (typeof data.votes_b === 'number') setVotesB(data.votes_b)
      } catch {
        // ignore parse errors
      }
    }

    es.onerror = () => {
      es.close()
    }

    return () => {
      es.close()
    }
  }, [id, voted])

  async function handleVote(option) {
    try {
      const res = await fetch(`${API}/polls/${id}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ option }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to cast vote.')
        return
      }
      if (typeof data.votes_a === 'number') setVotesA(data.votes_a)
      if (typeof data.votes_b === 'number') setVotesB(data.votes_b)
      setVoted(true)
    } catch {
      setError('Network error. Please try again.')
    }
  }

  if (loading) return <p>Loading...</p>
  if (error) return <p className="error">{error}</p>
  if (!poll) return <p>Poll not found.</p>

  const locked = poll.locked
  const showResults = voted || locked
  const { aPct, bPct } = calcPct(votesA, votesB)

  return (
    <div className="poll-card">
      <h1 data-testid="poll-question">{poll.question}</h1>

      {locked && (
        <div data-testid="poll-locked" className="locked-badge">
          Poll Closed
        </div>
      )}

      {!showResults && (
        <div style={{ marginTop: '1.5rem' }}>
          <button
            data-testid="option-a-btn"
            className="vote-btn"
            onClick={() => handleVote('a')}
          >
            {poll.option_a}
          </button>
          <button
            data-testid="option-b-btn"
            className="vote-btn"
            onClick={() => handleVote('b')}
          >
            {poll.option_b}
          </button>
        </div>
      )}

      {showResults && (
        <div className="results">
          <div data-testid="tug-bar" className="tug-bar-wrap">
            <div className="tug-a" style={{ width: `${aPct}%` }} />
            <div className="tug-b" style={{ width: `${bPct}%` }} />
          </div>

          <div className="vote-row">
            <span>{poll.option_a}</span>
            <span>
              <span data-testid="option-a-count">{votesA}</span>
              {' votes — '}
              <span data-testid="option-a-pct">{aPct}%</span>
            </span>
          </div>

          <div className="vote-row">
            <span>{poll.option_b}</span>
            <span>
              <span data-testid="option-b-count">{votesB}</span>
              {' votes — '}
              <span data-testid="option-b-pct">{bPct}%</span>
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
