import type { AIView } from '../engine/aiView'
import { cellsFor } from '../engine/placement'
import { CELL_COUNT, type Cell } from '../engine/types'

export type SearchMode = 'hunt' | 'target'

export interface Heatmap {
  mode: SearchMode
  /** Score per cell; 0 for cells already targeted or impossible. */
  scores: number[]
}

/** Placements through several unresolved hits are far more likely to be the real ship. */
export const DEFAULT_TARGET_WEIGHT = 40

/**
 * Probability-density search: for every enemy ship still afloat, enumerate every
 * position it could legally occupy given what we know, and score each untargeted
 * cell by how many of those positions cover it.
 *
 * Ships may touch, so cells next to a sunk ship stay possible, and hits that are
 * not part of a sunk ship remain targets.
 */
export function computeHeatmap(view: AIView, targetWeight = DEFAULT_TARGET_WEIGHT): Heatmap {
  const sunkCells = new Set(view.sunkShips.flatMap((s) => s.cells))
  const blocked = (c: Cell) => view.marks[c] === 'miss' || sunkCells.has(c)
  const unresolved = new Set<Cell>()
  view.marks.forEach((m, c) => {
    if (m === 'hit' && !sunkCells.has(c)) unresolved.add(c)
  })

  const mode: SearchMode = unresolved.size > 0 ? 'target' : 'hunt'
  const scores = Array<number>(CELL_COUNT).fill(0)

  for (const length of view.remainingShipLengths) {
    for (let origin = 0; origin < CELL_COUNT; origin++) {
      for (const orientation of ['horizontal', 'vertical'] as const) {
        const cells = cellsFor(origin, length, orientation)
        if (!cells || cells.some(blocked)) continue
        const covered = cells.filter((c) => unresolved.has(c)).length
        if (mode === 'target' && covered === 0) continue
        const weight = mode === 'target' ? targetWeight ** covered : 1
        for (const c of cells) {
          if (view.marks[c] === 'none') scores[c] += weight
        }
      }
    }
  }
  return { mode, scores }
}
