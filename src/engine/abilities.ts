import { colOf, inBounds, rowOf, toCell } from './board'
import type { Cell, Orientation, Rng } from './types'

export type AbilityId = 'recon' | 'flare' | 'broadside' | 'depthCharge' | 'torpedo'

export const ABILITY_POOL: readonly AbilityId[] = ['recon', 'flare', 'broadside', 'depthCharge', 'torpedo']
export const HAND_SIZE = 3
export const BROADSIDE_SHOTS = 3

/** Scouting abilities reveal information and still let you take your normal shot; attacks replace it. */
export const SCOUTING: ReadonlySet<AbilityId> = new Set(['recon', 'flare'])

export const ABILITY_INFO: Record<AbilityId, { summary: string; needsTarget: boolean }> = {
  recon: { summary: 'Scan a 3×3 area: learn how many unhit ship squares it holds. Then take your shot.', needsTarget: true },
  flare: { summary: 'Reveal one random unhit enemy ship square. Then take your shot.', needsTarget: false },
  broadside: { summary: `Fire ${BROADSIDE_SHOTS} shots at squares you choose.`, needsTarget: true },
  depthCharge: { summary: 'Hit a + shape: the target square and the four around it.', needsTarget: true },
  torpedo: { summary: 'Runs along a row (from the left) or column (from the top) until it hits a ship.', needsTarget: true },
}

/** Draw a hand without duplicates from the shared pool. */
export function drawHand(rng: Rng): AbilityId[] {
  const pool = [...ABILITY_POOL]
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  return pool.slice(0, HAND_SIZE)
}

const around = (center: Cell, offsets: readonly [number, number][]): Cell[] =>
  offsets.flatMap(([dr, dc]) => {
    const r = rowOf(center) + dr
    const c = colOf(center) + dc
    return inBounds(r, c) ? [toCell(r, c)] : []
  })

const SQUARE: [number, number][] = [-1, 0, 1].flatMap((dr) => [-1, 0, 1].map((dc): [number, number] => [dr, dc]))
const PLUS: [number, number][] = [[0, 0], [-1, 0], [1, 0], [0, -1], [0, 1]]

/** 3×3 square around `center`, clipped at the board edge. */
export const reconArea = (center: Cell): Cell[] => around(center, SQUARE)

/** `center` plus its orthogonal neighbours, clipped at the board edge. */
export const depthChargeArea = (center: Cell): Cell[] => around(center, PLUS)

/** The full lane a torpedo travels, in travel order: a row from column 1, or a column from row A. */
export function torpedoLane(cell: Cell, orientation: Orientation): Cell[] {
  return Array.from({ length: 10 }, (_, i) =>
    orientation === 'horizontal' ? toCell(rowOf(cell), i) : toCell(i, colOf(cell)),
  )
}
