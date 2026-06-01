import React from 'react'
import { Attribute, Character } from '../types'

function rollDice(s: string) {
  // simple dice parser like "1d20+3"
  const m = s.match(/(\d*)d(\d+)([+-]\d+)?/)
  if (!m) return 0
  const count = Number(m[1] || 1)
  const sides = Number(m[2])
  const mod = Number(m[3] || 0)
  let total = 0
  for (let i = 0; i < count; i++) total += 1 + Math.floor(Math.random() * sides)
  return total + mod
}

export default function DiceRoller({ character, onRoll }: { character: Character, onRoll: (result: number, label: string) => void }) {
  const baseModifiers = {
    STR: Math.floor((character.attributes.STR - 10) / 2),
    DEX: Math.floor((character.attributes.DEX - 10) / 2),
    CON: Math.floor((character.attributes.CON - 10) / 2),
    INT: Math.floor((character.attributes.INT - 10) / 2),
    WIS: Math.floor((character.attributes.WIS - 10) / 2),
    CHA: Math.floor((character.attributes.CHA - 10) / 2)
  }
  const attrList = Object.keys(baseModifiers) as Array<keyof typeof baseModifiers>

  function doCheck(attr: keyof typeof baseModifiers) {
    const mod = baseModifiers[attr]
    const roll = rollDice('1d20+' + mod)
    onRoll(roll, `${attr} check (mod ${mod >= 0 ? '+' + mod : mod})`)
  }

  return (
    <div className="card">
      <h4>Dice</h4>
      <div className="smallMuted">Click an attribute to roll 1d20 + modifier</div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
        {attrList.map(a => (
          <button key={a} className="button ghost" onClick={() => doCheck(a as Attribute)}>{a} ({baseModifiers[a] >= 0 ? '+' + baseModifiers[a] : baseModifiers[a]})</button>
        ))}
      </div>
    </div>
  )
}
