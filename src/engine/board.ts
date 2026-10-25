import { BOARD_SIZE, CELL_COUNT, type Cell } from './types'

const ROW_LABELS = 'ABCDEFGHIJ'

export const rowOf = (cell: Cell): number => Math.floor(cell / BOARD_SIZE)
export const colOf = (cell: Cell): number => cell % BOARD_SIZE
export const toCell = (row: number, col: number): Cell => row * BOARD_SIZE + col

export function inBounds(row: number, col: number): boolean {
  return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE
}

export function isValidCell(cell: Cell): boolean {
  return Number.isInteger(cell) && cell >= 0 && cell < CELL_COUNT
}

/** Human-readable coordinate, e.g. 0 -> "A1", 99 -> "J10". */
export function cellLabel(cell: Cell): string {
  return `${ROW_LABELS[rowOf(cell)]}${colOf(cell) + 1}`
}

export function rowLabel(row: number): string {
  return ROW_LABELS[row]
}

/** Orthogonal neighbours that are on the board. */
export function neighbours(cell: Cell): Cell[] {
  const r = rowOf(cell)
  const c = colOf(cell)
  const out: Cell[] = []
  for (const [dr, dc] of [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ]) {
    if (inBounds(r + dr, c + dc)) out.push(toCell(r + dr, c + dc))
  }
  return out
}
