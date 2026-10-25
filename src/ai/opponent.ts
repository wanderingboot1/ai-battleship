import { BROADSIDE_SHOTS, depthChargeArea, reconArea, torpedoLane } from '../engine/abilities'
import type { AbilityUse, AIView } from '../engine/aiView'
import { toCell } from '../engine/board'
import type { Cell, Orientation, Rng } from '../engine/types'
import { computeHeatmap } from './heatmap'

export type AIDecision = { type: 'fire'; cell: Cell }
export type AITurn = AIDecision | { type: 'ability'; use: AbilityUse }

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

/** Like decideAction, but may spend an ability first (Special mode). */
export function decideTurn(view: AIView, rng: Rng, settings: AISettings = DEFAULT_AI_SETTINGS): AITurn {
  const use = chooseAbility(view, rng, settings)
  return use ? { type: 'ability', use } : decideAction(view, rng, settings)
}

/**
 * Ability policy, using the same heat map as normal shots:
 * - Broadside is saved for finishing damaged ships (target mode), or the late game.
 * - Flare and Recon are free scouting, used once the easy early shots are gone.
 * - Depth Charge and Torpedo are spent occasionally in hunt mode on the area or lane
 *   with the highest combined score, so they cover the likeliest squares.
 */
export function chooseAbility(view: AIView, rng: Rng, settings: AISettings = DEFAULT_AI_SETTINGS): AbilityUse | null {
  const owned = new Set(view.abilities ?? [])
  if (owned.size === 0 || view.scoutedThisTurn) return null
  const { mode, scores } = computeHeatmap(view, settings.targetWeight)
  const shotsTaken = view.marks.filter((m) => m !== 'none').length
  const ranked = scores.flatMap((s, c) => (s > 0 ? [c] : [])).sort((a, b) => scores[b] - scores[a])
  const sum = (cells: Cell[]) => cells.reduce((t, c) => t + (view.marks[c] === 'none' ? scores[c] : 0), 0)
  const bestBy = (value: (c: Cell) => number) =>
    ranked.length ? Array.from({ length: 100 }, (_, c) => c).reduce((b, c) => (value(c) > value(b) ? c : b), 0) : null

  if (mode === 'target') {
    return owned.has('broadside') && ranked.length >= BROADSIDE_SHOTS
      ? { id: 'broadside', cells: ranked.slice(0, BROADSIDE_SHOTS) }
      : null
  }
  if (owned.has('flare') && shotsTaken >= 12) return { id: 'flare', roll: rng() }
  if (owned.has('recon') && shotsTaken >= 4) {
    const cell = bestBy((c) => sum(reconArea(c)))
    if (cell !== null) return { id: 'recon', cell }
  }
  if (owned.has('broadside') && shotsTaken >= 30 && ranked.length >= BROADSIDE_SHOTS) {
    return { id: 'broadside', cells: ranked.slice(0, BROADSIDE_SHOTS) }
  }
  if (shotsTaken < 6 || rng() > 0.35) return null

  const options: { use: AbilityUse; value: number }[] = []
  if (owned.has('depthCharge')) {
    const cell = bestBy((c) => sum(depthChargeArea(c)))
    if (cell !== null) options.push({ use: { id: 'depthCharge', cell }, value: sum(depthChargeArea(cell)) })
  }
  if (owned.has('torpedo')) {
    const lanes = Array.from({ length: 10 }, (_, i) =>
      (['horizontal', 'vertical'] as Orientation[]).map((orientation) => {
        const cell = orientation === 'horizontal' ? toCell(i, 0) : toCell(0, i)
        // A torpedo stops at its first hit, so it is worth roughly half its lane.
        return { use: { id: 'torpedo', cell, orientation } as AbilityUse, value: sum(torpedoLane(cell, orientation)) * 0.5 }
      }),
    ).flat()
    options.push(lanes.reduce((b, l) => (l.value > b.value ? l : b)))
  }
  const best = options.filter((o) => o.value > 0).sort((a, b) => b.value - a.value)[0]
  return best ? best.use : null
}
