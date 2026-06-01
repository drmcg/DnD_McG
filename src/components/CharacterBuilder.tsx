import React, { useState } from 'react'
import { Character, Attribute } from '../types'
import { v4 as uuid } from 'uuid'

const ATTRS: Attribute[] = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA']

export default function CharacterBuilder({ initial, onChange }: { initial?: Character, onChange: (c: Character) => void }) {
  const init = initial ?? {
    id: uuid(),
    name: 'Adventurer',
    race: 'Human',
    class: 'Fighter',
    level: 1,
    attributes: { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 },
    hp: 10, maxHp: 10, ac: 10, speed: 30, passivePerception: 10, hitDie: 'd10',
    skills: {}, spells: [], features: [], inventory: [], carryCapacity: 150, locked: false
  }
  const [char, setChar] = useState<Character>(init)
  const [pointsLeft, setPointsLeft] = useState<number>(27 - Object.values(char.attributes).reduce((a, b) => a + (b - 8), 0))

  function updateAttr(attr: Attribute, val: number) {
    // enforce bounds 8-15 typical point-buy
    const clamped = Math.max(8, Math.min(15, Math.floor(val)))
    const newAttrs = { ...char.attributes, [attr]: clamped }
    const spent = Object.values(newAttrs).reduce((a, b) => a + (b - 8), 0)
    setPointsLeft(27 - spent)
    setChar(c => ({ ...c, attributes: newAttrs, carryCapacity: 15 * newAttrs.STR }))
    onChange({ ...char, attributes: newAttrs, carryCapacity: 15 * newAttrs.STR })
  }

  function quickDefault() {
    const def = { STR: 15, DEX: 14, CON: 13, INT: 10, WIS: 12, CHA: 8 }
    setChar(c => ({ ...c, ...{ attributes: def, carryCapacity: 15 * def.STR } }))
    setPointsLeft(0)
    onChange({ ...char, attributes: def, carryCapacity: 15 * def.STR })
  }

  return (
    <div className="card">
      <h3>Character Builder</h3>
      <div style={{ display: 'flex', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div>
            <div className="smallMuted">Name</div>
            <input className="input" value={char.name} onChange={e => { setChar(c => ({ ...c, name: e.target.value })); onChange({ ...char, name: e.target.value }) }} />
          </div>
          <div style={{ marginTop: 8 }}>
            <div className="smallMuted">Race / Class</div>
            <input className="input" value={char.race} onChange={e => setChar(c => ({ ...c, race: e.target.value }))} placeholder="Race" />
            <input className="input" value={char.class} onChange={e => setChar(c => ({ ...c, class: e.target.value }))} placeholder="Class" style={{ marginTop: 6 }} />
          </div>
          <div style={{ marginTop: 8 }}>
            <button className="button ghost" onClick={quickDefault}>Apply Quick Defaults</button>
            <div className="smallMuted">Points left: {pointsLeft}</div>
          </div>
        </div>
        <div style={{ width: 300 }}>
          <div className="smallMuted">Attributes (8-15, 27 point-buy)</div>
          {ATTRS.map(a => (
            <div key={a} style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
              <div style={{ width: 40 }}>{a}</div>
              <input type="range" min={8} max={15} value={char.attributes[a]} onChange={(e) => updateAttr(a, Number(e.target.value))} />
              <div style={{ width: 36 }}>{char.attributes[a]}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
