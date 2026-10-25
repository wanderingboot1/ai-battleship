import { describe, expect, it } from 'vitest'
import { getAIView } from './aiView'
import { applyAction, createMatch, statsFor, type GameState } from './game'
import type { Cell, PlayerId, Ship } from './types'

const fleetA: Ship[] = [
  { type: 'carrier', cells: [0, 1, 2, 3, 4] },
  { type: 'battleship', cells: [10, 11, 12, 13] },
  { type: 'cruiser', cells: [20, 21, 22] },
  { type: 'submarine', cells: [30, 31, 32] },
  { type: 'patrol', cells: [40, 41] },
]
const fleetB: Ship[] = [
  { type: 'carrier', cells: [90, 91, 92, 93, 94] },
  { type: 'battleship', cells: [80, 81, 82, 83] },
  { type: 'cruiser', cells: [70, 71, 72] },
  { type: 'submarine', cells: [60, 61, 62] },
  { type: 'patrol', cells: [50, 51] },
]

function fire(state: GameState, by: PlayerId, cell: Cell) {
  return applyAction(state, { type: 'fire', matchId: state.matchId, by, cell })
}

function mustFire(state: GameState, by: PlayerId, cell: Cell): GameState {
  const r = fire(state, by, cell)
  if (!r.ok) throw new Error(r.reason)
  return r.state
}

const newMatch = () => createMatch(7, { human: fleetA, ai: fleetB })

describe('turns', () => {
  it('alternates after a miss and after a hit', () => {
    let s = newMatch()
    expect(s.turn).toBe('human')
    s = mustFire(s, 'human', 0) // miss
    expect(s.turn).toBe('ai')
    s = mustFire(s, 'ai', 0) // hit
    expect(s.turn).toBe('human')
  })

  it('rejects out-of-turn actions', () => {
    const r = fire(newMatch(), 'ai', 5)
    expect(r).toEqual({ ok: false, reason: 'not-your-turn' })
  })

  it('rejects a second shot at the same cell', () => {
    let s = newMatch()
    s = mustFire(s, 'human', 55)
    s = mustFire(s, 'ai', 55)
    expect(fire(s, 'human', 55)).toEqual({ ok: false, reason: 'already-targeted' })
  })

  it('rejects actions from an earlier match', () => {
    const s = newMatch()
    const r = applyAction(s, { type: 'fire', matchId: 6, by: 'human', cell: 0 })
    expect(r).toEqual({ ok: false, reason: 'stale-match' })
  })

  it('rejects off-board cells', () => {
    expect(fire(newMatch(), 'human', 100)).toEqual({ ok: false, reason: 'invalid-cell' })
    expect(fire(newMatch(), 'human', -1)).toEqual({ ok: false, reason: 'invalid-cell' })
  })
})

describe('sinking and victory', () => {
  it('reports hits, then names the ship when sunk', () => {
    let s = newMatch()
    const r1 = fire(s, 'human', 50)
    expect(r1.ok && r1.events[0]).toMatchObject({ result: 'hit' })
    s = mustFire((r1.ok && r1.state) as GameState, 'ai', 99)
    const r2 = fire(s, 'human', 51)
    expect(r2.ok && r2.events[0]).toMatchObject({ result: 'sunk', sunkShip: 'patrol' })
  })

  it('ends the game when the last ship sinks and blocks further actions', () => {
    let s = newMatch()
    const targets = fleetB.flatMap((ship) => ship.cells)
    const aiMisses = [5, 6, 7, 8, 9, 14, 15, 16, 17, 18, 19, 23, 24, 25, 26, 27, 28]
    targets.forEach((cell, i) => {
      s = mustFire(s, 'human', cell)
      if (i < targets.length - 1) s = mustFire(s, 'ai', aiMisses[i])
    })
    expect(s.phase).toBe('over')
    expect(s.winner).toBe('human')
    expect(fire(s, 'ai', 99)).toEqual({ ok: false, reason: 'game-over' })
    expect(statsFor(s, 'human')).toEqual({ shots: 17, hits: 17, accuracy: 1 })
  })
})

describe('getAIView', () => {
  it('reveals only shot results, sunk ships and remaining lengths', () => {
    let s = createMatch(1, { human: fleetA, ai: fleetB }, 'ai')
    s = mustFire(s, 'ai', 40) // patrol hit
    s = mustFire(s, 'human', 99)
    s = mustFire(s, 'ai', 41) // patrol sunk
    s = mustFire(s, 'human', 98)
    s = mustFire(s, 'ai', 0) // carrier hit, not sunk
    const view = getAIView(s)
    expect(view.sunkShips).toEqual([{ type: 'patrol', cells: [40, 41] }])
    expect(view.remainingShipLengths).toEqual([5, 4, 3, 3])
    expect(view.marks[0]).toBe('hit')
    expect(view.marks[1]).toBe('none')
    expect(JSON.stringify(view)).not.toContain('carrier')
  })
})
