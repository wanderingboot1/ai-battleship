import { isValidCell } from './board'
import { isValidFleet } from './placement'
import { CELL_COUNT, type Cell, type PlayerId, type Ship, type ShipType, type ShotMark } from './types'

export interface ShotEvent {
  by: PlayerId
  cell: Cell
  result: 'miss' | 'hit' | 'sunk'
  sunkShip?: ShipType
}

export interface GameState {
  /** Changes on every new match so actions queued for an earlier match (e.g. a delayed AI move) are rejected. */
  matchId: number
  phase: 'battle' | 'over'
  turn: PlayerId
  fleets: Record<PlayerId, Ship[]>
  /** Shots received on each player's own board. */
  marks: Record<PlayerId, ShotMark[]>
  winner: PlayerId | null
  history: ShotEvent[]
}

export type GameAction = { type: 'fire'; matchId: number; by: PlayerId; cell: Cell }

export type RejectReason = 'stale-match' | 'game-over' | 'not-your-turn' | 'invalid-cell' | 'already-targeted'

export type ActionResult =
  | { ok: true; state: GameState; events: ShotEvent[] }
  | { ok: false; reason: RejectReason }

export const opponentOf = (player: PlayerId): PlayerId => (player === 'human' ? 'ai' : 'human')

const emptyMarks = (): ShotMark[] => Array<ShotMark>(CELL_COUNT).fill('none')

export function createMatch(
  matchId: number,
  fleets: Record<PlayerId, Ship[]>,
  firstPlayer: PlayerId = 'human',
): GameState {
  if (!isValidFleet(fleets.human) || !isValidFleet(fleets.ai)) throw new Error('Invalid fleet')
  return {
    matchId,
    phase: 'battle',
    turn: firstPlayer,
    fleets,
    marks: { human: emptyMarks(), ai: emptyMarks() },
    winner: null,
    history: [],
  }
}

export function isSunk(ship: Ship, marks: readonly ShotMark[]): boolean {
  return ship.cells.every((c) => marks[c] === 'hit')
}

/** Ships of `owner` that have been sunk, in fleet order. */
export function sunkShipsOf(state: GameState, owner: PlayerId): Ship[] {
  return state.fleets[owner].filter((s) => isSunk(s, state.marks[owner]))
}

export function applyAction(state: GameState, action: GameAction): ActionResult {
  if (action.matchId !== state.matchId) return { ok: false, reason: 'stale-match' }
  if (state.phase !== 'battle') return { ok: false, reason: 'game-over' }
  if (action.by !== state.turn) return { ok: false, reason: 'not-your-turn' }
  if (!isValidCell(action.cell)) return { ok: false, reason: 'invalid-cell' }

  const defender = opponentOf(action.by)
  if (state.marks[defender][action.cell] !== 'none') return { ok: false, reason: 'already-targeted' }

  const marks = [...state.marks[defender]]
  const ship = state.fleets[defender].find((s) => s.cells.includes(action.cell))
  marks[action.cell] = ship ? 'hit' : 'miss'

  const event: ShotEvent = { by: action.by, cell: action.cell, result: ship ? 'hit' : 'miss' }
  if (ship && isSunk(ship, marks)) {
    event.result = 'sunk'
    event.sunkShip = ship.type
  }

  const fleetDestroyed = state.fleets[defender].every((s) => isSunk(s, marks))
  const next: GameState = {
    ...state,
    marks: { ...state.marks, [defender]: marks },
    history: [...state.history, event],
    turn: fleetDestroyed ? state.turn : defender,
    phase: fleetDestroyed ? 'over' : 'battle',
    winner: fleetDestroyed ? action.by : null,
  }
  return { ok: true, state: next, events: [event] }
}

export interface PlayerStats {
  shots: number
  hits: number
  accuracy: number
}

export function statsFor(state: GameState, player: PlayerId): PlayerStats {
  const shots = state.history.filter((e) => e.by === player)
  const hits = shots.filter((e) => e.result !== 'miss').length
  return { shots: shots.length, hits, accuracy: shots.length ? hits / shots.length : 0 }
}
