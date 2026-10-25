import { useEffect, useMemo, useRef, useState } from 'react'
import { cellLabel, colOf, rowOf, toCell } from '../engine/board'
import { cellsFor, checkPlacement, placeShip, randomFleet, shipLength } from '../engine/placement'
import { createRng, randomSeed } from '../engine/rng'
import { FLEET, type Cell, type Orientation, type Ship, type ShipType } from '../engine/types'
import type { Theme } from '../themes/types'
import { Board } from './Board'
import { orientationOf } from './geometry'

interface Props {
  theme: Theme
  initialShips?: Ship[]
  onStart: (ships: Ship[]) => void
  onBack: () => void
}

/** Shift the origin so a ship tapped near an edge still fits on the board. */
function clampOrigin(cell: Cell, length: number, orientation: Orientation): Cell {
  const row = orientation === 'vertical' ? Math.min(rowOf(cell), 10 - length) : rowOf(cell)
  const col = orientation === 'horizontal' ? Math.min(colOf(cell), 10 - length) : colOf(cell)
  return toCell(row, col)
}

const nextUnplaced = (ships: Ship[]): ShipType | null =>
  FLEET.find((s) => !ships.some((p) => p.type === s.type))?.type ?? null

export function PlacementScreen({ theme, initialShips, onStart, onBack }: Props) {
  const [ships, setShips] = useState<Ship[]>(initialShips ?? [])
  const [selected, setSelected] = useState<ShipType | null>(initialShips ? null : 'carrier')
  const [orientation, setOrientation] = useState<Orientation>('horizontal')
  const [hover, setHover] = useState<Cell | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const rng = useRef(createRng(randomSeed()))

  const rotate = () => setOrientation((o) => (o === 'horizontal' ? 'vertical' : 'horizontal'))

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'r' || e.key === 'R') rotate()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const preview = useMemo(() => {
    if (!selected || hover === null) return null
    const length = shipLength(selected)
    const origin = clampOrigin(hover, length, orientation)
    const cells = cellsFor(origin, length, orientation)!
    return { cells, valid: !checkPlacement(ships, { type: selected, origin, orientation }) }
  }, [selected, hover, orientation, ships])

  const pickUp = (ship: Ship) => {
    setShips((s) => s.filter((p) => p.type !== ship.type))
    setSelected(ship.type)
    setOrientation(orientationOf(ship))
    setMessage(`Moving your ${theme.shipNames[ship.type]}. Tap where it should go.`)
  }

  const onCellClick = (cell: Cell) => {
    const occupant = ships.find((s) => s.cells.includes(cell))
    if (!selected) {
      if (occupant) pickUp(occupant)
      return
    }
    const length = shipLength(selected)
    const origin = clampOrigin(cell, length, orientation)
    const problem = checkPlacement(ships, { type: selected, origin, orientation })
    if (problem) {
      if (occupant) {
        pickUp(occupant)
        return
      }
      setMessage('That spot overlaps another ship. Try somewhere else or rotate.')
      return
    }
    const next = placeShip(ships, { type: selected, origin, orientation })
    setShips(next)
    setSelected(nextUnplaced(next))
    setMessage(null)
  }

  const autoPlace = () => {
    setShips(randomFleet(rng.current))
    setSelected(null)
    setMessage(null)
  }

  const reset = () => {
    setShips([])
    setSelected('carrier')
    setMessage(null)
  }

  const ready = ships.length === FLEET.length

  return (
    <div className="placement">
      <div className="placement-header">
        <h2>Deploy your fleet</h2>
        <p className="hint">
          Pick a ship, then tap the board to place it. Tap a placed ship to move it. Ships can touch but not overlap.
        </p>
      </div>
      <div className="placement-body">
        <Board
          themeId={theme.id}
          label={`${theme.terms.ownBoard}, placement`}
          ships={ships.map((ship) => ({ ship }))}
          preview={preview}
          onCellClick={onCellClick}
          onCellHover={setHover}
          describeCell={(cell) => {
            const ship = ships.find((s) => s.cells.includes(cell))
            return ship ? `${cellLabel(cell)}, ${theme.shipNames[ship.type]}` : `${cellLabel(cell)}, empty`
          }}
          className="board-own"
        />
        <div className="placement-panel">
          <ul className="dock" aria-label="Ships to place">
            {FLEET.map((spec) => {
              const placed = ships.some((s) => s.type === spec.type)
              return (
                <li key={spec.type}>
                  <button
                    type="button"
                    className={`dock-ship ${selected === spec.type ? 'dock-selected' : ''} ${placed ? 'dock-placed' : ''}`}
                    aria-pressed={selected === spec.type}
                    onClick={() => {
                      const ship = ships.find((s) => s.type === spec.type)
                      if (ship) pickUp(ship)
                      else setSelected(spec.type)
                    }}
                  >
                    <span className="fleet-name">{theme.shipNames[spec.type]}</span>
                    <span className="pips" aria-hidden="true">
                      {Array.from({ length: spec.length }, (_, i) => (
                        <span key={i} className="pip pip-solid" />
                      ))}
                    </span>
                    <span className="dock-state">{placed ? '✓ Placed' : `${spec.length} squares`}</span>
                  </button>
                </li>
              )
            })}
          </ul>
          <div className="placement-actions">
            <button type="button" className="btn" onClick={rotate}>
              ⟳ Rotate ({orientation === 'horizontal' ? 'horizontal' : 'vertical'})
            </button>
            <button type="button" className="btn" onClick={autoPlace}>
              🎲 Auto-place
            </button>
            <button type="button" className="btn btn-quiet" onClick={reset} disabled={ships.length === 0}>
              Reset
            </button>
          </div>
          <p className="placement-message" role="status">
            {message ?? (ready ? 'Fleet ready.' : selected ? `Placing: ${theme.shipNames[selected]}` : '')}
          </p>
          <div className="placement-footer">
            <button type="button" className="btn btn-quiet" onClick={onBack}>
              ← Change opponent
            </button>
            <button type="button" className="btn btn-primary" disabled={!ready} onClick={() => onStart(ships)}>
              Start battle
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
