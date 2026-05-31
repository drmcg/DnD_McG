import React, { useEffect, useState } from 'react'
import { Settings, Player, Character, GameState } from '../types'
import { loadSettings, saveSettings, loadLastGame, saveLastGame } from '../utils/storage'
import { v4 as uuid } from 'uuid'

function defaultCharacter(id?: string): Character {
  const attrs = { STR:10, DEX:10, CON:10, INT:10, WIS:10, CHA:10 } as any
  const hp = 10
  return {
    id: id||uuid(),
    name: 'Adventurer',
    race: 'Human',
    class: 'Fighter',
    level: 1,
    attributes: attrs,
    hp,
    maxHp: hp,
    ac: 10,
    speed: 30,
    passivePerception: 10,
    hitDie: 'd10',
    skills: {},
    spells: [],
    features: [],
    inventory: [],
    carryCapacity: 15 * attrs.STR,
    locked: false
  }
}

export default function StartPage({ onStart }: { onStart: (gs: GameState)=>void }) {
  const saved = loadSettings()
  const [settings, setSettings] = useState<Settings>(saved)
  const [models, setModels] = useState<string[]>([])
  const [loadingModels, setLoadingModels] = useState(false)
  const [players, setPlayers] = useState<Player[]>(() => {
    const p = localStorage.getItem('tmp_players_v1')
    if (p) return JSON.parse(p)
    const c = defaultCharacter()
    return [{ id: uuid(), label: 'Player 1', character: c }]
  })

  useEffect(()=> localStorage.setItem('tmp_players_v1', JSON.stringify(players)), [players])

  useEffect(() => {
    if (!settings.ollamaUrl) return
    setLoadingModels(true)
    const controller = new AbortController()
    fetch(settings.ollamaUrl.replace(/\/$/, '') + '/v1/models', { signal: controller.signal })
      .then(r => r.json())
      .then((data) => {
        let ms: string[] = []
        if (Array.isArray(data)) ms = data.map((m:any)=>m.name ?? m.id ?? String(m))
        else if (data.models) ms = data.models.map((m:any)=>m.name ?? m.id)
        setModels(ms)
      }).catch(()=> setModels([])).finally(()=> setLoadingModels(false))
    return ()=> controller.abort()
  }, [settings.ollamaUrl])

  function updateSettings(k: Partial<Settings>) {
    const s = {...settings, ...k}
    setSettings(s)
    saveSettings(s)
  }

  function addPlayer() {
    setPlayers(prev => {
      const id = uuid()
      return [...prev, { id, label: `Player ${prev.length + 1}`, character: defaultCharacter() }]
    })
  }
  function removePlayer() {
    setPlayers(prev => prev.length > 1 ? prev.slice(0,-1) : prev)
  }

  function editPlayer(i: number, update: Partial<Player>) {
    setPlayers(prev => {
      const copy = [...prev]
      copy[i] = { ...copy[i], ...update }
      return copy
    })
  }

  function startGame(name = 'Campaign') {
    // lock characters
    const playersLocked = players.map(p => ({...p, character: {...p.character, locked: true}}))
    const gs: GameState = {
      id: uuid(),
      name,
      players: playersLocked,
      currentPlayerIndex: 0,
      history: [],
      summary: '',
      settings,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    saveLastGame(gs)
    onStart(gs)
  }

  function loadLast() {
    const g = loadLastGame()
    if (g) onStart(g)
    else alert('No last save found')
  }

  function importFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const json = JSON.parse(String(reader.result))
        if (json && json.players) {
          // basic validation
          if (!json.settings) json.settings = settings
          saveLastGame(json)
          onStart(json)
        } else alert('Invalid save JSON')
      } catch (err) { alert('Invalid JSON') }
    }
    reader.readAsText(f)
  }

  return (
    <div className="card">
      <div className="header">
        <h1>DND — Ollama Dungeon Master</h1>
        <div className="controls">
          <button className="button" onClick={()=>loadLast()}>Load Last Save</button>
          <label className="button ghost">
            Import
            <input style={{display:'none'}} type="file" accept=".json,application/json" onChange={importFile} />
          </label>
        </div>
      </div>

      <div className="flex" style={{marginTop:12}}>
        <div className="col card">
          <h3>Ollama Server</h3>
          <div className="smallMuted">Enter your Ollama base URL (e.g. http://localhost:11434)</div>
          <input className="input" value={settings.ollamaUrl || ''} onChange={(e)=>updateSettings({ollamaUrl:e.target.value})} placeholder="http://localhost:11434" />
          <div style={{marginTop:8}}>
            <div className="smallMuted">Models</div>
            {loadingModels ? <div className="smallMuted">Loading models...</div> : (
              <select className="input" value={settings.model || ''} onChange={(e)=>updateSettings({model: e.target.value})}>
                <option value="">Select model</option>
                {models.map(m=> <option key={m} value={m}>{m}</option>)}
              </select>
            )}
          </div>
        </div>

        <div className="col card">
          <h3>Players</h3>
          <div className="smallMuted">Add or remove players (min 1). Characters can be edited later.</div>
          <div style={{display:'flex', gap:8, marginTop:8, alignItems:'center'}}>
            <button className="button" onClick={addPlayer}>+</button>
            <button className="button" onClick={removePlayer}>-</button>
            <div className="smallMuted">Players: {players.length}</div>
          </div>
          <div className="playerList" style={{marginTop:8}}>
            {players.map((p,i)=>(
              <div key={p.id} style={{display:'flex', gap:8, alignItems:'center', justifyContent:'space-between'}}>
                <div>
                  <div className="playerBadge">{p.label}</div>
                  <div className="small">{p.character.name} — {p.character.class} {p.character.race}</div>
                </div>
                <div style={{display:'flex', gap:6}}>
                  <button className="button ghost" onClick={()=> {
                    const name = prompt('Player label', p.label) || p.label
                    editPlayer(i,{...p, label:name})
                  }}>Edit</button>
                  <button className="button" onClick={() => {
                    // quick customize char name/class
                    const name = prompt('Character name', p.character.name) || p.character.name
                    const cls = prompt('Class', p.character.class) || p.character.class
                    const race = prompt('Race', p.character.race) || p.character.race
                    const char = {...p.character, name, class: cls, race}
                    editPlayer(i, {...p, character: char})
                  }}>Quick Set</button>
                </div>
              </div>
            ))}
          </div>
          <div style={{marginTop:12}}>
            <button className="button" onClick={()=> startGame('New Campaign') }>Start Game</button>
          </div>
        </div>
      </div>
    </div>
  )
}
