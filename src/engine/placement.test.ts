import { describe, expect, it } from 'vitest'
import { toCell } from './board'
import { cellsFor, checkPlacement, isValidFleet, placeShip, randomFleet } from './placement'
import { createRng } from './rng'
import type { Ship } from './types'

describe('cellsFor', () => {
  it('lays ships out horizontally and vertically', () => {
    expect(cellsFor(toCell(0, 0), 3, 'horizontal')).toEqual([0, 1, 2])
    expect(cellsFor(toCell(0, 0), 3, 'vertical')).toEqual([0, 10, 20])
  })

  it('returns null when a ship would extend past an edge', () => {
    expect(cellsFor(toCell(0, 8), 3, 'horizontal')).toBeNull()
    expect(cellsFor(toCell(8, 0), 3, 'vertical')).toBeNull()
    expect(cellsFor(toCell(9, 5), 5, 'vertical')).toBeNull()
    expect(cellsFor(toCell(5, 5), 5, 'horizontal')).toEqual([55, 56, 57, 58, 59])
  })
})

describe('checkPlacement', () => {
  const carrier = placeShip([], { type: 'carrier', origin: toCell(0, 0), orientation: 'horizontal' })

  it('rejects overlap', () => {
    expect(checkPlacement(carrier, { type: 'patrol', origin: toCell(0, 4), orientation: 'vertical' })).toBe('overlap')
  })

  it('allows ships to touch', () => {
    expect(checkPlacement(carrier, { type: 'patrol', origin: toCell(1, 0), orientation: 'horizontal' })).toBeNull()
    expect(checkPlacement(carrier, { type: 'patrol', origin: toCell(0, 5), orientation: 'horizontal' })).toBeNull()
  })

  it('rejects off-board placements and duplicates', () => {
    expect(checkPlacement(carrier, { type: 'battleship', origin: toCell(9, 7), orientation: 'horizontal' })).toBe(
      'out-of-bounds',
    )
    expect(checkPlacement(carrier, { type: 'carrier', origin: toCell(5, 0), orientation: 'horizontal' })).toBe(
      'already-placed',
    )
  })
})

describe('isValidFleet', () => {
  const valid: Ship[] = [
    { type: 'carrier', cells: [0, 1, 2, 3, 4] },
    { type: 'battleship', cells: [10, 11, 12, 13] },
    { type: 'cruiser', cells: [20, 21, 22] },
    { type: 'submarine', cells: [30, 40, 50] },
    { type: 'patrol', cells: [98, 99] },
  ]

  it('accepts a correct fleet (touching ships allowed)', () => {
    expect(isValidFleet(valid)).toBe(true)
  })

  it('rejects missing ships, overlaps, wrong sizes and bent or wrapped ships', () => {
    expect(isValidFleet(valid.slice(1))).toBe(false)
    expect(isValidFleet([...valid.slice(0, 4), { type: 'patrol', cells: [0, 10] }])).toBe(false)
    expect(isValidFleet([...valid.slice(0, 4), { type: 'patrol', cells: [97, 98, 99] }])).toBe(false)
    expect(isValidFleet([...valid.slice(0, 4), { type: 'patrol', cells: [88, 99] }])).toBe(false)
    expect(isValidFleet([...valid.slice(0, 4), { type: 'patrol', cells: [9, 10] }])).toBe(false)
  })
})

describe('randomFleet', () => {
  it('always produces a valid fleet', () => {
    const rng = createRng(42)
    for (let i = 0; i < 500; i++) expect(isValidFleet(randomFleet(rng))).toBe(true)
  })
})
