import type { GameMode } from '../engine/game'
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

const WALLET_KEY = 'ai-battleship:wallet'

export function loadWallet(): Wallet {
  try {
    return parseWallet(JSON.parse(localStorage.getItem(WALLET_KEY) ?? 'null'))
  } catch {
    return parseWallet(null)
  }
}

export function saveWallet(wallet: Wallet) {
  try {
    localStorage.setItem(WALLET_KEY, JSON.stringify(wallet))
  } catch {
    // See saveSettings.
  }
}
