import { ABILITY_INFO, type AbilityId } from '../engine/abilities'
import type { AbilityCard } from '../engine/game'
import type { Orientation } from '../engine/types'
import type { Theme } from '../themes/types'

interface Props {
  theme: Theme
  hand: readonly AbilityCard[]
  opponentHand: readonly AbilityCard[]
  enabled: boolean
  active: AbilityId | null
  hint: string | null
  orientation: Orientation
  onSelect: (id: AbilityId) => void
  onCancel: () => void
  onRotate: () => void
}

export function AbilityBar({ theme, hand, opponentHand, enabled, active, hint, orientation, onSelect, onCancel, onRotate }: Props) {
  return (
    <section className="abilities" aria-label="Abilities">
      <div className="ability-row">
        <span className="ability-owner">Your abilities</span>
        <div className="ability-cards">
          {hand.map((card) => (
            <button
              key={card.id}
              type="button"
              className={`ability-card ${active === card.id ? 'ability-active' : ''} ${card.used ? 'ability-spent' : ''}`}
              data-ability={card.id}
              aria-pressed={active === card.id}
              disabled={card.used || !enabled}
              onClick={() => (active === card.id ? onCancel() : onSelect(card.id))}
            >
              <span className="ability-name">{theme.abilityNames[card.id]}</span>
              <span className="ability-summary">{card.used ? 'Used' : ABILITY_INFO[card.id].summary}</span>
            </button>
          ))}
        </div>
      </div>
      {active && (
        <div className="ability-targeting" role="status">
          <span>{hint}</span>
          {active === 'torpedo' && (
            <button type="button" className="btn btn-small" onClick={onRotate}>
              ⟳ {orientation === 'horizontal' ? 'Row' : 'Column'} (R)
            </button>
          )}
          <button type="button" className="btn btn-small btn-quiet" onClick={onCancel}>
            Cancel
          </button>
        </div>
      )}
      <div className="ability-row ability-row-opponent">
        <span className="ability-owner">{theme.opponent.shortName}'s abilities</span>
        <ul className="ability-chips">
          {opponentHand.map((card) => (
            <li key={card.id} className={card.used ? 'ability-chip-used' : ''} title={ABILITY_INFO[card.id].summary}>
              {theme.abilityNames[card.id]}
              {card.used ? ' (used)' : ''}
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
