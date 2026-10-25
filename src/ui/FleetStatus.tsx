import { isSunk } from '../engine/game'
import { FLEET, type Ship, type ShotMark } from '../engine/types'
import type { Theme } from '../themes/types'

interface Props {
  theme: Theme
  title: string
  ships: readonly Ship[]
  marks: readonly ShotMark[]
  /** For the enemy fleet only sunk/afloat is known; damage stays hidden. */
  hideDamage?: boolean
}

export function FleetStatus({ theme, title, ships, marks, hideDamage }: Props) {
  return (
    <section className="fleet-status" aria-label={title}>
      <h3>{title}</h3>
      <ul>
        {FLEET.map((spec) => {
          const ship = ships.find((s) => s.type === spec.type)!
          const sunk = isSunk(ship, marks)
          const hits = hideDamage ? (sunk ? spec.length : 0) : ship.cells.filter((c) => marks[c] === 'hit').length
          const state = sunk ? 'Sunk' : hits > 0 ? 'Damaged' : 'Afloat'
          return (
            <li key={spec.type} className={`fleet-item fleet-${state.toLowerCase()}`}>
              <span className="fleet-name">{theme.shipNames[spec.type]}</span>
              <span className="pips" aria-hidden="true">
                {Array.from({ length: spec.length }, (_, i) => (
                  <span key={i} className={`pip ${i < hits ? 'pip-hit' : ''}`} />
                ))}
              </span>
              <span className="fleet-state">
                {state}
                <span className="sr-only">, length {spec.length}</span>
              </span>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
