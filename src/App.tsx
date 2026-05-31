import React, { useState } from 'react'
import StartPage from './components/StartPage'
import GamePage from './components/GamePage'
import { loadLastGame } from './utils/storage'

export default function App() {
  const last = loadLastGame()
  const [game, setGame] = useState(last ?? null)

  function handleStart(gs: any) {
    setGame(gs)
  }
  function handleExit() {
    setGame(null)
  }

  return (
    <div className="app">
      {game ? <GamePage initial={game} onExit={handleExit} /> : <StartPage onStart={handleStart} />}
    </div>
  )
}
