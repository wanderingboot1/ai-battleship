import type { AbilityId } from './abilities'
import { opponentOf, sunkShipsOf, type GameState, type Intel } from './game'
import { shipLength } from './placement'
import { FLEET, type PlayerId, type Ship, type ShotMark } from './types'

export type { AbilityUse, Intel } from './game'

/**
 * Everything an attacker is legally allowed to know about the opponent's board:
 * its own shot results, the ships it has sunk (revealed on sinking), the lengths
 * of ships still afloat, and intel from its own scouting abilities. Unsunk ship
 * positions are never included.
 */
export interface AIView {
  marks: readonly ShotMark[]
  sunkShips: readonly Ship[]
  remainingShipLengths: readonly number[]
  intel?: readonly Intel[]
  /** The attacker's unused abilities. */
  abilities?: readonly AbilityId[]
  scoutedThisTurn?: boolean
}

export function getAIView(state: GameState, attacker: PlayerId = 'ai'): AIView {
  const defender = opponentOf(attacker)
  const sunkShips = sunkShipsOf(state, defender).map((s) => ({ type: s.type, cells: [...s.cells] }))
  const sunkTypes = new Set(sunkShips.map((s) => s.type))
  return {
    marks: [...state.marks[defender]],
    sunkShips,
    remainingShipLengths: FLEET.filter((s) => !sunkTypes.has(s.type)).map((s) => shipLength(s.type)),
    intel: state.intel[attacker].map((i) => ({ ...i })),
    abilities: state.hands[attacker].filter((c) => !c.used).map((c) => c.id),
    scoutedThisTurn: state.turn === attacker && state.scoutedThisTurn,
  }
}
