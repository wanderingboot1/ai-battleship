export const BOARD_SIZE = 10
export const CELL_COUNT = BOARD_SIZE * BOARD_SIZE

/** Board cells are indexed 0..99, row-major: index = row * 10 + col. Rows are A–J, columns 1–10. */
export type Cell = number

export type Orientation = 'horizontal' | 'vertical'

export type ShipType = 'carrier' | 'battleship' | 'cruiser' | 'submarine' | 'patrol'

export interface ShipSpec {
  type: ShipType
  length: number
}

export const FLEET: readonly ShipSpec[] = [
  { type: 'carrier', length: 5 },
  { type: 'battleship', length: 4 },
  { type: 'cruiser', length: 3 },
  { type: 'submarine', length: 3 },
  { type: 'patrol', length: 2 },
]

export interface Placement {
  type: ShipType
  origin: Cell
  orientation: Orientation
}

export interface Ship {
  type: ShipType
  cells: Cell[]
}

export type PlayerId = 'human' | 'ai'

/** What the attacker has learned about a cell on the defender's board. */
export type ShotMark = 'none' | 'miss' | 'hit'

export type Rng = () => number
