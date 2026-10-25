import type { ReactNode } from 'react'
import { cellLabel, colOf, rowLabel, rowOf } from '../engine/board'
import { CELL_COUNT, type Cell, type Ship, type ShotMark } from '../engine/types'
import { ShipSprite } from '../themes/ShipSprite'
import type { ThemeId } from '../themes/types'
import { orientationOf } from './geometry'

export interface BoardShip {
  ship: Ship
  sunk?: boolean
}

interface BoardProps {
  themeId: ThemeId
  label: string
  marks?: readonly ShotMark[]
  ships?: readonly BoardShip[]
  /** Cells covered by a sunk ship get a distinct marker. */
  sunkCells?: ReadonlySet<Cell>
  /** Cells hit by the most recent action on this board (several for area abilities). */
  lastShots?: readonly Cell[]
  /** Highlighted regions, e.g. Recon scans, with a short badge. */
  areas?: readonly { key: string; cells: readonly Cell[]; label: string }[]
  /** Squares revealed as ship squares by a Flare. */
  spotted?: readonly Cell[]
  preview?: { cells: Cell[]; valid: boolean } | null
  isCellEnabled?: (cell: Cell) => boolean
  onCellClick?: (cell: Cell) => void
  onCellHover?: (cell: Cell | null) => void
  describeCell?: (cell: Cell) => string
  className?: string
  children?: ReactNode
  /** Rendered over the first cell of `lastShots`, e.g. a co-captain dropping the shot. */
  dropper?: ReactNode
}

function gridArea(cells: readonly Cell[]) {
  const first = Math.min(...cells)
  const horizontal = cells.length > 1 && cells.includes(first + 1)
  return {
    gridRow: `${rowOf(first) + 2} / span ${horizontal ? 1 : cells.length}`,
    gridColumn: `${colOf(first) + 2} / span ${horizontal ? cells.length : 1}`,
  }
}

function boundsArea(cells: readonly Cell[]) {
  const rows = cells.map(rowOf)
  const cols = cells.map(colOf)
  return {
    gridRow: `${Math.min(...rows) + 2} / ${Math.max(...rows) + 3}`,
    gridColumn: `${Math.min(...cols) + 2} / ${Math.max(...cols) + 3}`,
  }
}

const cellPos = (cell: Cell) => ({ gridRow: rowOf(cell) + 2, gridColumn: colOf(cell) + 2 })

export function Board(props: BoardProps) {
  const { themeId, label, marks, ships = [], sunkCells, lastShots = [], preview, onCellClick, onCellHover } = props
  const interactive = !!onCellClick
  const cells = Array.from({ length: CELL_COUNT }, (_, c) => c)
  const sinkingShips = new Set(
    ships.filter(({ ship, sunk }) => sunk && ship.cells.some((c) => lastShots.includes(c))).map(({ ship }) => ship),
  )
  const sinkingCells = new Set([...sinkingShips].flatMap((s) => s.cells))
  const shotKey = lastShots.join('-')

  return (
    <div className={`board ${interactive ? 'board-interactive' : ''} ${props.className ?? ''}`}>
      <div
        className="board-grid"
        role="group"
        aria-label={label}
        onPointerLeave={() => onCellHover?.(null)}
      >
        {Array.from({ length: 10 }, (_, i) => (
          <div key={`c${i}`} className="board-label" style={{ gridRow: 1, gridColumn: i + 2 }} aria-hidden="true">
            {i + 1}
          </div>
        ))}
        {Array.from({ length: 10 }, (_, i) => (
          <div key={`r${i}`} className="board-label" style={{ gridRow: i + 2, gridColumn: 1 }} aria-hidden="true">
            {rowLabel(i)}
          </div>
        ))}

        {cells.map((cell) => {
          const description = props.describeCell?.(cell) ?? cellLabel(cell)
          if (!interactive) {
            return <div key={cell} className="cell" style={cellPos(cell)} aria-label={description} role="img" />
          }
          const enabled = props.isCellEnabled ? props.isCellEnabled(cell) : true
          return (
            <button
              key={cell}
              type="button"
              className="cell"
              style={cellPos(cell)}
              aria-label={description}
              aria-disabled={!enabled}
              data-cell={cellLabel(cell)}
              onClick={() => enabled && onCellClick?.(cell)}
              onPointerEnter={(e) => e.pointerType === 'mouse' && onCellHover?.(cell)}
            />
          )
        })}

        {ships.map(({ ship, sunk }) => (
          <div
            key={ship.type}
            className={`ship ${sunk ? 'ship-sunk' : ''} ${sinkingShips.has(ship) ? 'ship-sinking' : ''}`}
            style={gridArea(ship.cells)}
            aria-hidden="true"
          >
            <ShipSprite themeId={themeId} length={ship.cells.length} orientation={orientationOf(ship)} />
          </div>
        ))}

        {preview?.cells.map((cell) => (
          <div
            key={`p${cell}`}
            className={`preview ${preview.valid ? 'preview-valid' : 'preview-invalid'}`}
            style={cellPos(cell)}
            aria-hidden="true"
          />
        ))}

        {marks?.map((mark, cell) =>
          mark === 'none' ? null : (
            <div
              key={`m${cell}`}
              className={`mark mark-${mark} ${sunkCells?.has(cell) ? 'mark-sunk' : ''} ${lastShots.includes(cell) ? 'mark-last' : ''}`}
              style={cellPos(cell)}
              aria-hidden="true"
            >
              {mark === 'miss' ? (
                <svg viewBox="0 0 20 20">
                  <circle cx="10" cy="10" r="4" />
                </svg>
              ) : (
                <svg viewBox="0 0 20 20">
                  <path d="M5 5 L15 15 M15 5 L5 15" />
                </svg>
              )}
            </div>
          ),
        )}

        {lastShots.map((cell) =>
          marks?.[cell] === 'miss' ? (
            <div key={`splash${cell}`} className="fx fx-splash" style={cellPos(cell)} aria-hidden="true" />
          ) : marks?.[cell] === 'hit' && !sinkingCells.has(cell) ? (
            <div key={`blast${cell}`} className="fx fx-blast" style={cellPos(cell)} aria-hidden="true">
              <BlastArt />
            </div>
          ) : null,
        )}
        {[...sinkingShips].flatMap((ship) =>
          ship.cells.map((cell, i) => (
            <div
              key={`sink${shotKey}-${cell}`}
              className="fx fx-blast fx-blast-big"
              style={{ ...cellPos(cell), animationDelay: `${i * 0.13}s` }}
              aria-hidden="true"
            >
              <BlastArt />
            </div>
          )),
        )}

        {props.dropper && lastShots.length > 0 && (
          <div key={`drop${shotKey}`} className="pet-drop" style={cellPos(lastShots[0])} aria-hidden="true">
            {props.dropper}
          </div>
        )}
        {props.areas?.map((area) => (
          <div key={area.key} className="area" style={boundsArea(area.cells)} aria-hidden="true">
            <span className="area-badge">{area.label}</span>
          </div>
        ))}
        {props.spotted?.map((cell) =>
          marks?.[cell] === 'none' ? (
            <div key={`spot${cell}`} className="spotted" style={cellPos(cell)} aria-hidden="true">
              <svg viewBox="-10 -10 20 20">
                <path d="M0 -8 L2 -2 L8 0 L2 2 L0 8 L-2 2 L-8 0 L-2 -2 Z" />
              </svg>
            </div>
          ) : null,
        )}
      </div>
      {props.children}
    </div>
  )
}

function BlastArt() {
  const rays = Array.from({ length: 8 }, (_, i) => (i * Math.PI) / 4)
  return (
    <svg viewBox="-50 -50 100 100">
      <circle r="22" className="fx-flash" />
      <circle r="12" className="fx-core" />
      {rays.map((a) => (
        <path
          key={a}
          d={`M${Math.cos(a) * 18} ${Math.sin(a) * 18} L${Math.cos(a) * 44} ${Math.sin(a) * 44}`}
          className="fx-ray"
        />
      ))}
    </svg>
  )
}
