import { GameState, Settings } from '../types'

const SETTINGS_KEY = 'dnd_settings_v1'
const LAST_SAVE_KEY = 'dnd_last_save_v1'

export function saveSettings(s: Settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s))
}

export function loadSettings(): Settings {
  const v = localStorage.getItem(SETTINGS_KEY)
  if (!v) return { ollamaUrl: '' }
  return JSON.parse(v)
}

export function saveLastGame(gs: GameState) {
  localStorage.setItem(LAST_SAVE_KEY, JSON.stringify(gs))
}

export function loadLastGame(): GameState | null {
  const v = localStorage.getItem(LAST_SAVE_KEY)
  if (!v) return null
  return JSON.parse(v)
}
