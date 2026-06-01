export type Attribute = 'STR' | 'DEX' | 'CON' | 'INT' | 'WIS' | 'CHA'

export interface Item {
  id: string
  name: string
  weight: number
  durability: number
  maxDurability: number
  equipped: boolean
  slot?: string
  description?: string
}

export interface Spell {
  id: string
  name: string
  level: number
  description?: string
}

export interface Feature {
  id: string
  name: string
  description?: string
}

export interface Character {
  id: string
  name: string
  race: string
  class: string
  level: number
  attributes: Record<Attribute, number>
  hp: number
  maxHp: number
  ac: number
  speed: number
  passivePerception: number
  hitDie: string
  skills: Record<string, number> // skill name -> modifier
  spells: Spell[]
  features: Feature[]
  inventory: Item[]
  carryCapacity: number
  locked: boolean
}

export interface Player {
  id: string
  label: string
  character: Character
}

export interface Settings {
  ollamaUrl: string
  model?: string
}

export interface GameState {
  id: string
  name: string
  players: Player[]
  currentPlayerIndex: number
  history: Array<{ role: 'player' | 'dm' | 'system', playerId?: string, text: string, timestamp: string }>
  summary: string
  settings: Settings
  createdAt: string
  updatedAt: string
}
