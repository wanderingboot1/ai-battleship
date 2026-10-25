import type { GameMode, GameState } from '../engine/game'
import type { Ship } from '../engine/types'
import { parseWallet, type Wallet } from '../pets/pets'
import type { ThemeId } from '../themes/types'

const KEY = 'ai-battleship:settings'

export interface Settings {
  banter: boolean
  lastTheme: ThemeId
  mode: GameMode
}

const DEFAULTS: Settings = { banter: true, lastTheme: 'classic', mode: 'classic' }

export function loadSettings(): Settings {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') }
  } catch {
    return DEFAULTS
  }
}

export function saveSettings(settings: Settings) {
  try {
    localStorage.setItem(KEY, JSON.stringify(settings))
  } catch {
    // Storage can be unavailable (private mode); settings just won't persist.
  }
}

const BATTLE_KEY = 'ai-battleship:battle'

/** An unfinished battle, kept so the player can resume after leaving or reloading. */
export interface SavedBattle {
  themeId: ThemeId
  mode: GameMode
  humanShips: Ship[]
  key: number
  game: GameState
}

const isBoard = (marks: unknown) => Array.isArray(marks) && marks.length === 100

export function loadBattle(): SavedBattle | null {
  try {
    const b = JSON.parse(localStorage.getItem(BATTLE_KEY) ?? 'null')
    const g = b?.game
    const valid =
      ['classic', 'roman', 'pirate'].includes(b?.themeId) &&
      ['classic', 'special'].includes(b?.mode) &&
      typeof b?.key === 'number' &&
      Array.isArray(b?.humanShips) &&
      g?.phase === 'battle' &&
      Array.isArray(g.fleets?.human) &&
      Array.isArray(g.fleets?.ai) &&
      isBoard(g.marks?.human) &&
      isBoard(g.marks?.ai) &&
      Array.isArray(g.log)
    return valid ? b : null
  } catch {
    return null
  }
}

export function saveBattle(battle: SavedBattle | null) {
  try {
    if (battle) localStorage.setItem(BATTLE_KEY, JSON.stringify(battle))
    else localStorage.removeItem(BATTLE_KEY)
  } catch {
    // See saveSettings.
  }
}

export const WALLET_KEY = 'ai-battleship:wallet'

/** The saved wallet, or null if storage is unavailable. */
export function readWallet(): Wallet | null {
  try {
    return parseWallet(JSON.parse(localStorage.getItem(WALLET_KEY) ?? 'null'))
  } catch {
    return null
  }
}

export const loadWallet = (): Wallet => readWallet() ?? parseWallet(null)

/** Returns false if the wallet could not be saved. */
export function saveWallet(wallet: Wallet): boolean {
  try {
    localStorage.setItem(WALLET_KEY, JSON.stringify(wallet))
    return true
  } catch {
    return false
  }
}
