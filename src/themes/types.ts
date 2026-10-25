import type { AbilityId } from '../engine/abilities'
import type { ShipType } from '../engine/types'

export type ThemeId = 'classic' | 'roman' | 'pirate'

export type Mood = 'neutral' | 'smug' | 'annoyed' | 'defeated'

/** Moments the opponent may react to. "player" is the human; "ai" is the opponent. */
export type DialogueEvent =
  | 'intro'
  | 'playerMiss'
  | 'playerHit'
  | 'aiShipSunk'
  | 'aiHit'
  | 'aiMiss'
  | 'playerShipSunk'
  | 'aiWins'
  | 'aiLoses'
  | 'aiAbility'
  | 'playerAbility'

export interface Theme {
  id: ThemeId
  name: string
  tagline: string
  opponent: {
    name: string
    title: string
    /** Used in status messages, e.g. "Hale is aiming…". */
    shortName: string
  }
  shipNames: Record<ShipType, string>
  /** Theme names for the shared Special-mode abilities. */
  abilityNames: Record<AbilityId, string>
  terms: {
    enemyBoard: string
    ownBoard: string
  }
  /** Lines may include {ship} or {ability}, replaced with the theme's names. */
  dialogue: Record<DialogueEvent, string[]>
}
