import React, { useState } from 'react'

const API = 'http://localhost:3001/api'

export default function Home() {
  const [question, setQuestion] = useState('')
  const [optionA, setOptionA] = useState('')
  const [optionB, setOptionB] = useState('')
  const [duration, setDuration] = useState('86400')
  const [shareLink, setShareLink] = useState(null)
  const [error, setError] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setShareLink(null)

    if (!question.trim() || !optionA.trim() || !optionB.trim()) {
      setError('Please fill in all fields.')
      return
    }

    try {
      const res = await fetch(`${API}/polls`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: question.trim(),
          option_a: optionA.trim(),
          option_b: optionB.trim(),
          duration: parseInt(duration, 10) || 86400,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to create poll.')
        return
      }
      const id = data.id || data.poll_id
      setShareLink(`/poll/${id}`)
    } catch {
      setError('Network error. Please try again.')
    }
  }

  return (
    <div>
      <h1>Create a Poll</h1>
      <form onSubmit={handleSubmit}>
        <input
          data-testid="question-input"
          type="text"
          placeholder="Poll question (e.g. Tabs vs Spaces?)"
          value={question}
        />
        <input
          data-testid="option-a-input"
          type="text"
          placeholder="Option A"
          value={optionA}
        />
        <input
          data-testid="option-b-input"
          type="text"
          placeholder="Option B"
          value={optionB}
        />
        <input
          data-testid="duration-input"
          type="number"
          placeholder="Duration (seconds)"
          value={duration}
          min="1"
        />
        <button data-testid="create-poll-btn" type="submit">
          Create Poll
        </button>
      </form>

      {error && (
        <p data-testid="create-error" className="error">
          {error}
        </p>
      )}

      {shareLink && (
        <div className="link-box">
          <p>Share this link:</p>
          <a data-testid="shareable-link" href={shareLink}>
            {`http://localhost:3000${shareLink}`}
          </a>
        </div>
      )}
    </div>
  )
}
