import { opponentOf, sunkShipsOf, type GameState } from './game'
import { shipLength } from './placement'
import { FLEET, type PlayerId, type Ship, type ShotMark } from './types'

/**
 * Everything an attacker is legally allowed to know about the opponent's board:
 * its own shot results, the ships it has sunk (revealed on sinking), and the
 * lengths of ships still afloat. Unsunk ship positions are never included.
 */
export interface AIView {
  marks: readonly ShotMark[]
  sunkShips: readonly Ship[]
  remainingShipLengths: readonly number[]
}

export function getAIView(state: GameState, attacker: PlayerId = 'ai'): AIView {
  const defender = opponentOf(attacker)
  const sunkShips = sunkShipsOf(state, defender).map((s) => ({ type: s.type, cells: [...s.cells] }))
  const sunkTypes = new Set(sunkShips.map((s) => s.type))
  return {
    marks: [...state.marks[defender]],
    sunkShips,
    remainingShipLengths: FLEET.filter((s) => !sunkTypes.has(s.type)).map((s) => shipLength(s.type)),
  }
}
