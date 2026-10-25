import { describe, expect, it } from 'vitest'
import { decideTurn } from '../ai/opponent'
import { ABILITY_POOL, drawHand } from './abilities'
import { getAIView } from './aiView'
import { applyAction, createMatch, type AbilityUse, type GameState } from './game'
import { randomFleet } from './placement'
import { createRng } from './rng'
import type { PlayerId, Ship } from './types'

// Rows A, C, E, G, I from column 1.
const fleet: Ship[] = [
  { type: 'carrier', cells: [0, 1, 2, 3, 4] },
  { type: 'battleship', cells: [20, 21, 22, 23] },
  { type: 'cruiser', cells: [40, 41, 42] },
  { type: 'submarine', cells: [60, 61, 62] },
  { type: 'patrol', cells: [80, 81] },
]

const special = (hand = [...ABILITY_POOL]) =>
  createMatch(1, { human: fleet, ai: fleet }, { mode: 'special', hands: { human: hand, ai: hand } })

function act(state: GameState, use: AbilityUse, by: PlayerId = 'human') {
  return applyAction(state, { type: 'ability', matchId: state.matchId, by, use })
}
function ok(result: ReturnType<typeof applyAction>) {
  if (!result.ok) throw new Error(result.reason)
  return result
}

describe('abilities', () => {
  it('draws three different abilities from the shared pool', () => {
    for (let seed = 1; seed < 50; seed++) {
      const hand = drawHand(createRng(seed))
      expect(hand).toHaveLength(3)
      expect(new Set(hand).size).toBe(3)
      hand.forEach((id) => expect(ABILITY_POOL).toContain(id))
    }
  })

  it('are rejected in Classic mode', () => {
    const s = createMatch(1, { human: fleet, ai: fleet })
    expect(act(s, { id: 'depthCharge', cell: 55 })).toEqual({ ok: false, reason: 'abilities-disabled' })
  })

  it('Recon counts unhit ship squares, keeps the turn, and allows only a normal shot after', () => {
    const r = ok(act(special(), { id: 'recon', cell: 11 })) // B2: A1–C3
    expect(r.record.intel).toMatchObject({ kind: 'recon', count: 6 })
    expect(r.state.turn).toBe('human')
    expect(act(r.state, { id: 'depthCharge', cell: 55 })).toEqual({ ok: false, reason: 'one-ability-per-turn' })
    const shot = ok(applyAction(r.state, { type: 'fire', matchId: 1, by: 'human', cell: 0 }))
    expect(shot.state.turn).toBe('ai')
    expect(shot.state.scoutedThisTurn).toBe(false)
  })

  it('Recon is clipped at the board edge', () => {
    const r = ok(act(special(), { id: 'recon', cell: 99 }))
    expect(r.record.intel).toMatchObject({ cells: [88, 89, 98, 99], count: 0 })
  })

  it('a used ability cannot be used again', () => {
    const r = ok(act(special(), { id: 'recon', cell: 11 }))
    const next = ok(applyAction(r.state, { type: 'fire', matchId: 1, by: 'human', cell: 50 }))
    const back = ok(applyAction(next.state, { type: 'fire', matchId: 1, by: 'ai', cell: 50 }))
    expect(act(back.state, { id: 'recon', cell: 55 })).toEqual({ ok: false, reason: 'ability-unavailable' })
  })

  it('Flare reveals an unhit ship square without firing', () => {
    const r = ok(act(special(), { id: 'flare', roll: 0.5 }))
    const intel = r.record.intel!
    expect(intel.kind).toBe('flare')
    if (intel.kind === 'flare') expect(fleet.flatMap((s) => s.cells)).toContain(intel.cell)
    expect(r.state.marks.ai.every((m) => m === 'none')).toBe(true)
    expect(r.state.turn).toBe('human')
  })

  it('Broadside fires three distinct untargeted squares and passes the turn', () => {
    const s = special()
    expect(act(s, { id: 'broadside', cells: [0, 0, 5] }).ok).toBe(false)
    expect(act(s, { id: 'broadside', cells: [0, 5] }).ok).toBe(false)
    const r = ok(act(s, { id: 'broadside', cells: [0, 5, 20] }))
    expect(r.events.map((e) => e.result)).toEqual(['hit', 'miss', 'hit'])
    expect(r.events.every((e) => e.via === 'broadside')).toBe(true)
    expect(r.state.turn).toBe('ai')
  })

  it('Depth Charge hits a + shape, clipped at edges and skipping fired squares', () => {
    const s = special()
    const corner = ok(act(s, { id: 'depthCharge', cell: 0 }))
    expect(corner.events.map((e) => e.cell).sort((a, b) => a - b)).toEqual([0, 1, 10])
  })

  it('Torpedo runs from the edge and stops at the first ship square', () => {
    const s = special()
    const row = ok(act(s, { id: 'torpedo', cell: 15, orientation: 'horizontal' })) // row B: empty
    expect(row.events).toHaveLength(10)
    expect(row.events.every((e) => e.result === 'miss')).toBe(true)
    const s2 = special()
    const col = ok(act(s2, { id: 'torpedo', cell: 45, orientation: 'vertical' })) // column 6 from A6
    expect(col.events.map((e) => e.result)).toEqual(['miss', 'miss', 'miss', 'miss', 'miss', 'miss', 'miss', 'miss', 'miss', 'miss'])
    const s3 = special()
    const col1 = ok(act(s3, { id: 'torpedo', cell: 50, orientation: 'vertical' })) // column 1: A1 is a ship
    expect(col1.events.map((e) => e.cell)).toEqual([0])
  })

  it('stops resolving shots once the fleet is destroyed', () => {
    let s = createMatch(1, { human: fleet, ai: fleet }, { mode: 'special', hands: { human: ['broadside'], ai: [] } })
    const remaining = fleet.flatMap((sh) => sh.cells)
    for (const cell of remaining.slice(0, -1)) {
      s = ok(applyAction(s, { type: 'fire', matchId: 1, by: 'human', cell })).state
      s = ok(applyAction(s, { type: 'fire', matchId: 1, by: 'ai', cell: 99 - remaining.indexOf(cell) })).state
    }
    const r = ok(act(s, { id: 'broadside', cells: [remaining.at(-1)!, 98, 97] }))
    expect(r.events).toHaveLength(1)
    expect(r.state.phase).toBe('over')
    expect(r.state.winner).toBe('human')
  })

  it('AI plays full Special-mode games using only legal actions, and uses its abilities', () => {
    const used = new Set<string>()
    for (let seed = 1; seed <= 40; seed++) {
      const rng = createRng(seed)
      let s = createMatch(seed, { human: randomFleet(rng), ai: randomFleet(rng) }, {
        mode: 'special',
        hands: { human: drawHand(rng), ai: drawHand(rng) },
      })
      for (let i = 0; i < 300 && s.phase === 'battle'; i++) {
        const turn = decideTurn(getAIView(s, s.turn), rng)
        const action =
          turn.type === 'fire'
            ? { type: 'fire' as const, matchId: s.matchId, by: s.turn, cell: turn.cell }
            : { type: 'ability' as const, matchId: s.matchId, by: s.turn, use: turn.use }
        if (turn.type === 'ability') used.add(turn.use.id)
        s = ok(applyAction(s, action)).state
      }
      expect(s.phase).toBe('over')
    }
    expect(used).toEqual(new Set(ABILITY_POOL))
  })
})
