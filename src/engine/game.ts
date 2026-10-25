import { ABILITY_POOL, BROADSIDE_SHOTS, SCOUTING, depthChargeArea, reconArea, torpedoLane, type AbilityId } from './abilities'
import { isValidCell } from './board'
import { isValidFleet } from './placement'
import { CELL_COUNT, type Cell, type Orientation, type PlayerId, type Ship, type ShipType, type ShotMark } from './types'

export type GameMode = 'classic' | 'special'

export interface ShotEvent {
  by: PlayerId
  cell: Cell
  result: 'miss' | 'hit' | 'sunk'
  sunkShip?: ShipType
  /** Set when the shot came from an ability rather than a normal turn. */
  via?: AbilityId
}

export interface AbilityCard {
  id: AbilityId
  used: boolean
}

/** What a player learned by scouting. `hitsAtScan` lets later hits in the area be subtracted from `count`. */
export type Intel =
  | { kind: 'recon'; center: Cell; cells: Cell[]; count: number; hitsAtScan: number }
  | { kind: 'flare'; cell: Cell }

/** One player action: a normal shot or an ability, with everything it produced. */
export interface ActionRecord {
  by: PlayerId
  ability?: AbilityId
  shots: ShotEvent[]
  intel?: Intel
}

export interface GameState {
  /** Changes on every new match so actions queued for an earlier match (e.g. a delayed AI move) are rejected. */
  matchId: number
  mode: GameMode
  phase: 'battle' | 'over'
  turn: PlayerId
  fleets: Record<PlayerId, Ship[]>
  /** Shots received on each player's own board. */
  marks: Record<PlayerId, ShotMark[]>
  winner: PlayerId | null
  history: ShotEvent[]
  log: ActionRecord[]
  hands: Record<PlayerId, AbilityCard[]>
  /** Intel each player has gathered about the opponent's board. */
  intel: Record<PlayerId, Intel[]>
  /** A scouting ability was used this turn; no further abilities until the turn passes. */
  scoutedThisTurn: boolean
}

export type AbilityUse =
  | { id: 'recon'; cell: Cell }
  | { id: 'flare'; roll: number }
  | { id: 'broadside'; cells: Cell[] }
  | { id: 'depthCharge'; cell: Cell }
  | { id: 'torpedo'; cell: Cell; orientation: Orientation }

export type GameAction =
  | { type: 'fire'; matchId: number; by: PlayerId; cell: Cell }
  | { type: 'ability'; matchId: number; by: PlayerId; use: AbilityUse }

export type RejectReason =
  | 'stale-match'
  | 'game-over'
  | 'not-your-turn'
  | 'invalid-cell'
  | 'already-targeted'
  | 'abilities-disabled'
  | 'ability-unavailable'
  | 'one-ability-per-turn'
  | 'invalid-target'

export type ActionResult =
  | { ok: true; state: GameState; events: ShotEvent[]; record: ActionRecord }
  | { ok: false; reason: RejectReason }

export const opponentOf = (player: PlayerId): PlayerId => (player === 'human' ? 'ai' : 'human')

const emptyMarks = (): ShotMark[] => Array<ShotMark>(CELL_COUNT).fill('none')

export interface MatchOptions {
  firstPlayer?: PlayerId
  mode?: GameMode
  hands?: Record<PlayerId, AbilityId[]>
}

export function createMatch(matchId: number, fleets: Record<PlayerId, Ship[]>, options: MatchOptions = {}): GameState {
  if (!isValidFleet(fleets.human) || !isValidFleet(fleets.ai)) throw new Error('Invalid fleet')
  const mode = options.mode ?? 'classic'
  const toCards = (ids: AbilityId[] = []) => {
    if (new Set(ids).size !== ids.length || ids.some((id) => !ABILITY_POOL.includes(id))) throw new Error('Invalid hand')
    return mode === 'special' ? ids.map((id) => ({ id, used: false })) : []
  }
  return {
    matchId,
    mode,
    phase: 'battle',
    turn: options.firstPlayer ?? 'human',
    fleets,
    marks: { human: emptyMarks(), ai: emptyMarks() },
    winner: null,
    history: [],
    log: [],
    hands: { human: toCards(options.hands?.human), ai: toCards(options.hands?.ai) },
    intel: { human: [], ai: [] },
    scoutedThisTurn: false,
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

  const defender = opponentOf(action.by)
  const open = (c: Cell) => isValidCell(c) && state.marks[defender][c] === 'none'

  if (action.type === 'fire') {
    if (!isValidCell(action.cell)) return { ok: false, reason: 'invalid-cell' }
    if (!open(action.cell)) return { ok: false, reason: 'already-targeted' }
    return attack(state, action.by, [action.cell])
  }

  if (state.mode !== 'special') return { ok: false, reason: 'abilities-disabled' }
  const { use } = action
  const card = state.hands[action.by].find((c) => c.id === use.id && !c.used)
  if (!card) return { ok: false, reason: 'ability-unavailable' }
  if (state.scoutedThisTurn) return { ok: false, reason: 'one-ability-per-turn' }

  let next: GameState = {
    ...state,
    hands: { ...state.hands, [action.by]: state.hands[action.by].map((c) => (c === card ? { ...c, used: true } : c)) },
  }

  if (SCOUTING.has(use.id)) {
    const intel = scout(state, defender, use)
    if (!intel) return { ok: false, reason: 'invalid-target' }
    const record: ActionRecord = { by: action.by, ability: use.id, shots: [], intel }
    next = {
      ...next,
      intel: { ...state.intel, [action.by]: [...state.intel[action.by], intel] },
      log: [...state.log, record],
      scoutedThisTurn: true,
    }
    return { ok: true, state: next, events: [], record }
  }

  let cells: Cell[]
  if (use.id === 'broadside') {
    const openCount = state.marks[defender].filter((m) => m === 'none').length
    const distinct = new Set(use.cells)
    if (distinct.size !== use.cells.length || use.cells.length !== Math.min(BROADSIDE_SHOTS, openCount)) {
      return { ok: false, reason: 'invalid-target' }
    }
    if (!use.cells.every(open)) return { ok: false, reason: 'invalid-target' }
    cells = use.cells
  } else if (use.id === 'depthCharge') {
    cells = isValidCell(use.cell) ? depthChargeArea(use.cell).filter(open) : []
  } else if (use.id === 'torpedo') {
    cells = []
    if (isValidCell(use.cell)) {
      for (const c of torpedoLane(use.cell, use.orientation).filter(open)) {
        cells.push(c)
        if (state.fleets[defender].some((s) => s.cells.includes(c))) break
      }
    }
  } else {
    cells = []
  }
  if (cells.length === 0) return { ok: false, reason: 'invalid-target' }
  return attack(next, action.by, cells, use.id)
}

function scout(state: GameState, defender: PlayerId, use: AbilityUse): Intel | null {
  const marks = state.marks[defender]
  const shipCells = new Set(state.fleets[defender].flatMap((s) => s.cells))
  if (use.id === 'recon') {
    if (!isValidCell(use.cell)) return null
    const cells = reconArea(use.cell)
    return {
      kind: 'recon',
      center: use.cell,
      cells,
      count: cells.filter((c) => shipCells.has(c) && marks[c] !== 'hit').length,
      hitsAtScan: cells.filter((c) => marks[c] === 'hit').length,
    }
  }
  if (use.id === 'flare') {
    const unhit = [...shipCells].filter((c) => marks[c] !== 'hit').sort((a, b) => a - b)
    const spotted = new Set(state.intel[opponentOf(defender)].flatMap((i) => (i.kind === 'flare' ? [i.cell] : [])))
    const fresh = unhit.filter((c) => !spotted.has(c))
    const pool = fresh.length ? fresh : unhit
    const roll = Math.min(Math.max(use.roll, 0), 0.999999)
    return pool.length ? { kind: 'flare', cell: pool[Math.floor(roll * pool.length)] } : null
  }
  return null
}

/** Resolve shots in order, stopping early if the defender's fleet is destroyed, then pass the turn. */
function attack(state: GameState, by: PlayerId, cells: Cell[], via?: AbilityId): ActionResult {
  const defender = opponentOf(by)
  const marks = [...state.marks[defender]]
  const events: ShotEvent[] = []
  let fleetDestroyed = false
  for (const cell of cells) {
    const ship = state.fleets[defender].find((s) => s.cells.includes(cell))
    marks[cell] = ship ? 'hit' : 'miss'
    const event: ShotEvent = { by, cell, result: ship ? 'hit' : 'miss', ...(via ? { via } : {}) }
    if (ship && isSunk(ship, marks)) {
      event.result = 'sunk'
      event.sunkShip = ship.type
    }
    events.push(event)
    fleetDestroyed = state.fleets[defender].every((s) => isSunk(s, marks))
    if (fleetDestroyed) break
  }
  const record: ActionRecord = { by, shots: events, ...(via ? { ability: via } : {}) }
  const next: GameState = {
    ...state,
    marks: { ...state.marks, [defender]: marks },
    history: [...state.history, ...events],
    log: [...state.log, record],
    turn: fleetDestroyed ? state.turn : defender,
    phase: fleetDestroyed ? 'over' : 'battle',
    winner: fleetDestroyed ? by : null,
    scoutedThisTurn: false,
  }
  return { ok: true, state: next, events, record }
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
