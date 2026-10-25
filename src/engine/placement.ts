import { colOf, inBounds, rowOf, toCell } from './board'
import { FLEET, type Cell, type Orientation, type Placement, type Rng, type Ship, type ShipType } from './types'
import { randomInt } from './rng'

export function shipLength(type: ShipType): number {
  const spec = FLEET.find((s) => s.type === type)
  if (!spec) throw new Error(`Unknown ship type: ${type}`)
  return spec.length
}

/** Cells a ship would cover, or null if any part falls off the board. */
export function cellsFor(origin: Cell, length: number, orientation: Orientation): Cell[] | null {
  const r = rowOf(origin)
  const c = colOf(origin)
  const cells: Cell[] = []
  for (let i = 0; i < length; i++) {
    const row = orientation === 'vertical' ? r + i : r
    const col = orientation === 'horizontal' ? c + i : c
    if (!inBounds(row, col)) return null
    cells.push(toCell(row, col))
  }
  return cells
}

export type PlacementProblem = 'out-of-bounds' | 'overlap' | 'already-placed'

/** Validates a placement against ships already on the board. Ships may touch but not overlap. */
export function checkPlacement(placed: readonly Ship[], placement: Placement): PlacementProblem | null {
  if (placed.some((s) => s.type === placement.type)) return 'already-placed'
  const cells = cellsFor(placement.origin, shipLength(placement.type), placement.orientation)
  if (!cells) return 'out-of-bounds'
  const occupied = new Set(placed.flatMap((s) => s.cells))
  if (cells.some((c) => occupied.has(c))) return 'overlap'
  return null
}

export function placeShip(placed: readonly Ship[], placement: Placement): Ship[] {
  const problem = checkPlacement(placed, placement)
  if (problem) throw new Error(`Invalid placement: ${problem}`)
  const cells = cellsFor(placement.origin, shipLength(placement.type), placement.orientation)!
  return [...placed, { type: placement.type, cells }]
}

/** True when the fleet has exactly one of each ship, correctly sized, straight, on-board and non-overlapping. */
export function isValidFleet(ships: readonly Ship[]): boolean {
  if (ships.length !== FLEET.length) return false
  const seen = new Set<Cell>()
  for (const spec of FLEET) {
    const matches = ships.filter((s) => s.type === spec.type)
    if (matches.length !== 1) return false
    const cells = [...matches[0].cells].sort((a, b) => a - b)
    if (cells.length !== spec.length) return false
    const expected =
      cellsFor(cells[0], spec.length, 'horizontal') ?? []
    const expectedV = cellsFor(cells[0], spec.length, 'vertical') ?? []
    const straight =
      (expected.length === spec.length && expected.every((c, i) => c === cells[i])) ||
      (expectedV.length === spec.length && expectedV.every((c, i) => c === cells[i]))
    if (!straight) return false
    for (const c of cells) {
      if (seen.has(c)) return false
      seen.add(c)
    }
  }
  return true
}

/** Random legal fleet. Ships may touch, matching the game rules. */
export function randomFleet(rng: Rng): Ship[] {
  for (;;) {
    let ships: Ship[] = []
    let failed = false
    for (const spec of FLEET) {
      let placed = false
      for (let attempt = 0; attempt < 200 && !placed; attempt++) {
        const placement: Placement = {
          type: spec.type,
          origin: randomInt(rng, 100),
          orientation: rng() < 0.5 ? 'horizontal' : 'vertical',
        }
        if (!checkPlacement(ships, placement)) {
          ships = placeShip(ships, placement)
          placed = true
        }
      }
      if (!placed) {
        failed = true
        break
      }
    }
    if (!failed) return ships
  }
}
