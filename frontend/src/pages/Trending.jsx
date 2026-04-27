import React, { useEffect, useState } from 'react'

const API = 'http://localhost:3001/api'

export default function Trending() {
  const [polls, setPolls] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`${API}/trending`)
      .then((r) => r)
      .then((data) => {
        setPolls(Array.isArray(data) ? data : [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  if (loading) return <p>Loading...</p>

  return (
    <div>
      <h1>Trending Polls</h1>
      <div data-testid="trending-list" style={{ marginTop: '1.5rem' }}>
        {polls.length === 0 && <p>No trending polls yet.</p>}
        {polls.map((poll) => (
          <div key={poll.id} data-testid="trending-item" className="trending-item">
            <span data-testid="trending-question">{poll.question}</span>
            <span data-testid="trending-votes" className="trending-votes-badge">
              {poll.recent_votes}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
