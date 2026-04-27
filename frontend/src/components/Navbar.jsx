import React from 'react'
import { Link } from 'react-router-dom'

export default function Navbar() {
  return (
    <nav>
      <Link to="/" data-testid="nav-home">Home</Link>
      <Link to="/trending" data-testid="nav-trending">Trending</Link>
    </nav>
  )
}
