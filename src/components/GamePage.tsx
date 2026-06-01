import React, { useEffect, useState } from 'react'
import { GameState, Player } from '../types'
import PlayerSheet from './PlayerSheet'
import DiceRoller from './DiceRoller'
import { saveLastGame } from '../utils/storage'
import { generateWithStreaming } from '../utils/ollama'
import { summarizeConversation } from '../utils/summarizer'

export default function GamePage({ initial, onExit }: { initial: GameState, onExit: () => void }) {
  const [gs, setGs] = useState<GameState>(initial)
  const [busy, setBusy] = useState(false)
  const [lastDmText, setLastDmText] = useState<string>('')

  useEffect(() => {
    saveLastGame(gs)
  }, [gs])

  function updateGame(up: Partial<GameState>) {
    const next = { ...gs, ...up, updatedAt: new Date().toISOString() }
    setGs(next)
    saveLastGame(next)
  }

  function nextPlayerIndex(): number {
    return (gs.currentPlayerIndex + 1) % gs.players.length
  }

  async function handlePlayerAction(player: Player, actionText: string, diceResult?: { value: number, label: string }) {
    if (busy) return
    setBusy(true)
    setLastDmText('')
    // Append player's action to history
    const playEntry = { role: 'player' as const, playerId: player.id, text: `${player.label}: ${actionText}${diceResult ? ` (Dice: ${diceResult.label} => ${diceResult.value})` : ''}`, timestamp: new Date().toISOString() }
    const history1 = [...gs.history, playEntry]
    updateGame({ history: history1 })

    // Build prompt: send only the summary (per your rule) plus the player's action details. Include attribute/dice if present.
    const promptParts = [
      "You are the Dungeon Master. Use the summary below as the only context of the world. Then respond to the player's action with a short creative DM response (3-5 sentences). Do NOT invent long irrelevant details.",
      "Summary:",
      gs.summary || '(No summary yet - be conservative and short)',
      "Player action:",
      `${player.label} (${player.character.name}): ${actionText}`
    ]
    if (diceResult) {
      promptParts.push("Dice roll info:")
      promptParts.push(`${diceResult.label}: ${diceResult.value}`)
      promptParts.push("Character attribute snapshot:")
      promptParts.push(JSON.stringify(player.character, null, 2))
    }
    const prompt = promptParts.join('\n\n')

    try {
      // request DM response
      const dmText = await generateWithStreaming({
        settings: gs.settings,
        prompt,
        maxRuntimeMs: 5 * 60 * 1000, // 5 minutes
        retry: 3,
        onChunk: (c) => {
          // streaming chunks can be shown in UI if desired
          setLastDmText(prev => prev + c)
        }
      })
      // Save DM response
      const dmEntry = { role: 'dm' as const, text: dmText, timestamp: new Date().toISOString() }
      const history2 = [...history1, dmEntry]
      updateGame({ history: history2 })

      // Summarize (use model) combining previous summary + this turn
      const latestEventsText = `${playEntry.text}\n\nDM: ${dmText}`
      let newSummary = ''
      try {
        newSummary = await summarizeConversation(gs.settings, gs.summary, latestEventsText)
      } catch (err) {
        // fallback: append concise manual summary
        newSummary = (gs.summary ? gs.summary + ' ' : '') + ` ${player.label} acted: ${actionText}. DM: ${dmText}`.slice(0, 1000)
      }
      // update summary and advance turn
      updateGame({ summary: newSummary, currentPlayerIndex: nextPlayerIndex() })
    } catch (err: any) {
      alert('Error from Ollama: ' + (err?.message || String(err)))
    } finally {
      setBusy(false)
    }
  }

  function onDamage(playerId: string, delta: number) {
    const players = gs.players.map(p => {
      if (p.id !== playerId) return p
      const c = { ...p.character }
      c.hp = Math.max(0, Math.min(c.maxHp, c.hp + delta))
      return { ...p, character: c }
    })
    updateGame({ players })
  }

  function exportSave() {
    const blob = new Blob([JSON.stringify(gs, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${gs.name || 'dnd-save'}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  function newGame() {
    if (!confirm('Start a new game? Current progress will be saved as last save.')) return
    onExit()
  }

  const curPlayer = gs.players[gs.currentPlayerIndex]

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2>{gs.name}</h2>
          <div className="smallMuted">Current player: <span className="turnIndicator">{curPlayer.label}</span></div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="button" onClick={exportSave}>Export JSON</button>
          <button className="button ghost" onClick={newGame}>New Game</button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
        <div style={{ flex: 2 }}>
          <h3>Players</h3>
          {gs.players.map(p => <PlayerSheet key={p.id} player={p} onDamage={onDamage} />)}
        </div>
        <div style={{ width: 360 }}>
          <div className="card">
            <h4>Action / Dice</h4>
            <div className="smallMuted">You are controlling: <strong>{curPlayer.label} — {curPlayer.character.name}</strong></div>
            <ActionForm onSubmit={(text, dice) => handlePlayerAction(curPlayer, text, dice)} disabled={busy} />
          </div>

          <DiceRoller character={curPlayer.character} onRoll={(value, label) => {
            // Immediately treat dice roll as part of action; prompt for quick description
            const desc = prompt(`Describe the player's action that used ${label}`, `${curPlayer.label} attempts a check (dice ${value})`) || `${curPlayer.label} makes a ${label}`
            handlePlayerAction(curPlayer, desc, { value, label })
          }} />

          <div className="card" style={{ marginTop: 8 }}>
            <h4>Last DM Response (streaming)</h4>
            <pre style={{ whiteSpace: 'pre-wrap' }}>{lastDmText}</pre>
          </div>
        </div>
      </div>
    </div>
  )
}

function ActionForm({ onSubmit, disabled }: { onSubmit: (text: string, dice?: { value: number, label: string }) => void, disabled?: boolean }) {
  const [text, setText] = React.useState('')
  return (
    <div>
      <textarea className="input" value={text} onChange={e => setText(e.target.value)} rows={4} />
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <button className="button" onClick={() => { if (!text.trim()) return alert('Describe your action'); onSubmit(text.trim()); setText('') }} disabled={disabled}>Submit Action</button>
      </div>
    </div>
  )
}
