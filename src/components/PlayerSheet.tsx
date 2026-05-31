import React from 'react'
import { Player } from '../types'

export default function PlayerSheet({ player, onDamage }: { player: Player, onDamage: (id:string, delta:number)=>void }) {
  const c = player.character
  return (
    <div className="card">
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
        <div>
          <h3>{player.label} — {c.name}</h3>
          <div className="small">{c.race} {c.class} Lv{c.level}</div>
        </div>
        <div style={{textAlign:'right'}}>
          <div>HP: {c.hp}/{c.maxHp}</div>
          <div>AC: {c.ac}</div>
          <div className="smallMuted">Carry: {c.inventory.reduce((a,b)=>a+b.weight,0)} / {c.carryCapacity} lbs</div>
        </div>
      </div>
      <div style={{marginTop:8}}>
        <div className="smallMuted">Inventory</div>
        <ul>
          {c.inventory.map(it=>(
            <li key={it.id}>{it.name} {it.equipped ? '(equipped)' : ''} - wt:{it.weight} - dur:{it.durability}/{it.maxDurability}</li>
          ))}
        </ul>
      </div>
      <div style={{marginTop:8}}>
        <button className="button ghost" onClick={()=> onDamage(player.id, -1)}>Take 1 damage</button>
        <button className="button ghost" onClick={()=> onDamage(player.id, +1)}>Heal 1</button>
      </div>
    </div>
  )
}
