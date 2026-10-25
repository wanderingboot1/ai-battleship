import type { Orientation, Ship } from '../engine/types'

export function orientationOf(ship: Ship): Orientation {
  return ship.cells.length > 1 && ship.cells[1] - ship.cells[0] === 1 ? 'horizontal' : 'vertical'
}
