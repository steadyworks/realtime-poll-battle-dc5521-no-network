import React from 'react'
import { Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar.jsx'
import Home from './pages/Home.jsx'
import Poll from './pages/Poll.jsx'
import Trending from './pages/Trending.jsx'

export default function App() {
  return (
    <>
      <Navbar />
      <div className="container">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/poll/:id" element={<Poll />} />
          <Route path="/trending" element={<Trending />} />
        </Routes>
      </div>
    </>
  )
}
