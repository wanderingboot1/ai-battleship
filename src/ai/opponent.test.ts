import { describe, expect, it } from 'vitest'
import type { AIView } from '../engine/aiView'
import { getAIView } from '../engine/aiView'
import { toCell } from '../engine/board'
import { applyAction, createMatch, type GameState } from '../engine/game'
import { randomFleet } from '../engine/placement'
import { createRng } from '../engine/rng'
import { CELL_COUNT, type Ship, type ShotMark } from '../engine/types'
import { decideAction } from './opponent'

/** Plays the AI alone against a fleet until it sinks everything; returns the shots it needed. */
function simulate(seed: number): number {
  const rng = createRng(seed)
  let state: GameState = createMatch(1, { human: randomFleet(rng), ai: randomFleet(rng) }, { firstPlayer: 'ai' })
  const seen = new Set<number>()
  while (state.phase === 'battle') {
    const { cell } = decideAction(getAIView(state), rng)
    expect(seen.has(cell), `duplicate shot at ${cell}`).toBe(false)
    seen.add(cell)
    const result = applyAction(state, { type: 'fire', matchId: 1, by: 'ai', cell })
    if (!result.ok) throw new Error(`AI made an invalid move: ${result.reason}`)
    state = { ...result.state, turn: 'ai' }
  }
  return seen.size
}

function view(marks: Record<number, ShotMark>, sunkShips: Ship[] = [], remaining = [5, 4, 3, 3, 2]): AIView {
  const all = Array<ShotMark>(CELL_COUNT).fill('none')
  for (const [cell, mark] of Object.entries(marks)) all[Number(cell)] = mark
  return { marks: all, sunkShips, remainingShipLengths: remaining }
}

describe('AI over many simulated games', () => {
  it('never repeats or makes invalid shots, and lands in the "competent but beatable" range', () => {
    const games = 600
    let total = 0
    for (let seed = 1; seed <= games; seed++) total += simulate(seed)
    const average = total / games
    console.info(`AI average shots to sink a random fleet over ${games} games: ${average.toFixed(1)}`)
    // Random firing needs ~95 shots; a perfect heat-map player ~45.
    expect(average).toBeGreaterThan(50)
    expect(average).toBeLessThan(62)
  }, 60_000)
})

describe('AI targeting', () => {
  it('follows up next to a single hit', () => {
    const hit = toCell(4, 4)
    for (let seed = 0; seed < 20; seed++) {
      const { cell } = decideAction(view({ [hit]: 'hit' }), createRng(seed))
      expect([hit - 10, hit + 10, hit - 1, hit + 1]).toContain(cell)
    }
  })

  it('infers orientation from two adjacent hits', () => {
    const marks = { [toCell(4, 4)]: 'hit', [toCell(4, 5)]: 'hit' } as const
    for (let seed = 0; seed < 20; seed++) {
      const { cell } = decideAction(view(marks), createRng(seed))
      expect([toCell(4, 3), toCell(4, 6)]).toContain(cell)
    }
  })

  it('keeps targeting hits left over after a touching ship was sunk', () => {
    // Patrol boat sunk at E5–E6; E7 was also hit, so another ship touches it.
    const sunk: Ship[] = [{ type: 'patrol', cells: [toCell(4, 4), toCell(4, 5)] }]
    const marks = { [toCell(4, 4)]: 'hit', [toCell(4, 5)]: 'hit', [toCell(4, 6)]: 'hit' } as const
    const { cell } = decideAction(view(marks, sunk, [5, 4, 3, 3]), createRng(1))
    expect([toCell(3, 6), toCell(5, 6), toCell(4, 7)]).toContain(cell)
  })

  it('does not hunt in gaps too small for any remaining ship', () => {
    // Only the carrier (5) remains; a 1-cell gap surrounded by misses can't hold it.
    const marks: Record<number, ShotMark> = {}
    for (let c = 0; c < CELL_COUNT; c++) marks[c] = 'miss'
    marks[toCell(0, 0)] = 'none'
    for (let col = 3; col < 8; col++) marks[toCell(9, col)] = 'none'
    const { cell } = decideAction(view(marks, [], [5]), createRng(3))
    expect(cell).toBeGreaterThanOrEqual(toCell(9, 3))
  })
})

describe('AI fairness', () => {
  it('makes identical decisions when only hidden ship positions differ', () => {
    const rng = createRng(99)
    const aiFleet = randomFleet(rng)
    // Two human fleets that differ only in where the unhit ships are.
    const shared: Ship = { type: 'patrol', cells: [0, 1] }
    const humanA: Ship[] = [
      shared,
      { type: 'carrier', cells: [20, 21, 22, 23, 24] },
      { type: 'battleship', cells: [40, 41, 42, 43] },
      { type: 'cruiser', cells: [60, 61, 62] },
      { type: 'submarine', cells: [80, 81, 82] },
    ]
    const humanB: Ship[] = [
      shared,
      { type: 'carrier', cells: [29, 39, 49, 59, 69] },
      { type: 'battleship', cells: [27, 37, 47, 57] },
      { type: 'cruiser', cells: [95, 96, 97] },
      { type: 'submarine', cells: [75, 76, 77] },
    ]
    const play = (human: Ship[]) => {
      let s = createMatch(1, { human, ai: aiFleet }, { firstPlayer: 'ai' })
      for (const cell of [0, 1, 99]) {
        const r = applyAction(s, { type: 'fire', matchId: 1, by: 'ai', cell })
        if (!r.ok) throw new Error(r.reason)
        s = { ...r.state, turn: 'ai' }
      }
      return s
    }
    const a = play(humanA)
    const b = play(humanB)
    expect(getAIView(a)).toEqual(getAIView(b))
    for (let seed = 0; seed < 50; seed++) {
      expect(decideAction(getAIView(a), createRng(seed))).toEqual(decideAction(getAIView(b), createRng(seed)))
    }
  })
})
