import type { AIView } from '../engine/aiView'
import type { Cell, Rng } from '../engine/types'
import { computeHeatmap } from './heatmap'

export type AIDecision = { type: 'fire'; cell: Cell }

export interface AISettings {
  /**
   * How strongly hunt-mode shots favour high-scoring cells: 0 picks evenly among
   * cells where a ship could still fit; higher values approach a perfect heat-map
   * player. This is the main difficulty knob.
   */
  huntSharpness: number
  /** Multiplier per unresolved hit a candidate ship position passes through (see computeHeatmap). */
  targetWeight: number
}

/** Tuned by simulation (see opponent.test.ts) to be competent but beatable. */
export const DEFAULT_AI_SETTINGS: AISettings = { huntSharpness: 0, targetWeight: 4 }

/**
 * Chooses the AI's action using only legally available information.
 * Hunt mode (no unresolved hits) samples from plausible cells; target mode
 * (finishing a damaged ship) always plays the highest-scoring cell.
 */
export function decideAction(view: AIView, rng: Rng, settings: AISettings = DEFAULT_AI_SETTINGS): AIDecision {
  const { mode, scores } = computeHeatmap(view, settings.targetWeight)
  const candidates = scores.flatMap((score, cell) => (score > 0 ? [{ cell, score }] : []))

  if (candidates.length === 0) {
    const open = view.marks.flatMap((m, c) => (m === 'none' ? [c] : []))
    return { type: 'fire', cell: open[Math.floor(rng() * open.length)] }
  }

  const max = Math.max(...candidates.map((x) => x.score))
  if (mode === 'target') {
    const top = candidates.filter((x) => x.score === max)
    return { type: 'fire', cell: top[Math.floor(rng() * top.length)].cell }
  }

  const weights = candidates.map((x) => (x.score / max) ** settings.huntSharpness)
  let roll = rng() * weights.reduce((a, b) => a + b, 0)
  for (let i = 0; i < candidates.length; i++) {
    roll -= weights[i]
    if (roll <= 0) return { type: 'fire', cell: candidates[i].cell }
  }
  return { type: 'fire', cell: candidates[candidates.length - 1].cell }
}
