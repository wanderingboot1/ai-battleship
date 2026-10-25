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
  lastShot?: Cell | null
  preview?: { cells: Cell[]; valid: boolean } | null
  isCellEnabled?: (cell: Cell) => boolean
  onCellClick?: (cell: Cell) => void
  onCellHover?: (cell: Cell | null) => void
  describeCell?: (cell: Cell) => string
  className?: string
  children?: ReactNode
}

function gridArea(cells: readonly Cell[]) {
  const first = Math.min(...cells)
  const horizontal = cells.length > 1 && cells.includes(first + 1)
  return {
    gridRow: `${rowOf(first) + 2} / span ${horizontal ? 1 : cells.length}`,
    gridColumn: `${colOf(first) + 2} / span ${horizontal ? cells.length : 1}`,
  }
}

const cellPos = (cell: Cell) => ({ gridRow: rowOf(cell) + 2, gridColumn: colOf(cell) + 2 })

export function Board(props: BoardProps) {
  const { themeId, label, marks, ships = [], sunkCells, lastShot, preview, onCellClick, onCellHover } = props
  const interactive = !!onCellClick
  const cells = Array.from({ length: CELL_COUNT }, (_, c) => c)
  const lastMark = lastShot != null ? marks?.[lastShot] : undefined
  const sinking = lastShot != null ? ships.find(({ ship, sunk }) => sunk && ship.cells.includes(lastShot))?.ship : undefined

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
            className={`ship ${sunk ? 'ship-sunk' : ''} ${ship === sinking ? 'ship-sinking' : ''}`}
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
              className={`mark mark-${mark} ${sunkCells?.has(cell) ? 'mark-sunk' : ''} ${lastShot === cell ? 'mark-last' : ''}`}
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

        {lastShot != null && lastMark === 'miss' && (
          <div key={`splash${lastShot}`} className="fx fx-splash" style={cellPos(lastShot)} aria-hidden="true" />
        )}
        {lastShot != null && lastMark === 'hit' && !sinking && (
          <div key={`blast${lastShot}`} className="fx fx-blast" style={cellPos(lastShot)} aria-hidden="true">
            <BlastArt />
          </div>
        )}
        {sinking?.cells.map((cell, i) => (
          <div
            key={`sink${lastShot}-${cell}`}
            className="fx fx-blast fx-blast-big"
            style={{ ...cellPos(cell), animationDelay: `${i * 0.13}s` }}
            aria-hidden="true"
          >
            <BlastArt />
          </div>
        ))}
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
