import type { GameMode } from '../engine/game'
import { Avatar } from '../themes/Avatar'
import { THEMES, THEME_ORDER } from '../themes'
import type { ThemeId } from '../themes/types'

interface Props {
  resume: { label: string; detail: string; onResume: () => void; onDiscard: () => void } | null
  gold: number
  onShop: () => void
  mode: GameMode
  onModeChange: (mode: GameMode) => void
  onChoose: (theme: ThemeId) => void
}

const MODES: { id: GameMode; name: string; blurb: string }[] = [
  { id: 'classic', name: 'Classic', blurb: 'Standard Battleship: one shot per turn.' },
  { id: 'special', name: 'Special', blurb: 'Each side gets 3 random single-use abilities.' },
]

export function TitleScreen({ resume, gold, onShop, mode, onModeChange, onChoose }: Props) {
  return (
    <div className="title-screen">
      <header className="title-hero">
        <h1>AI Battleship</h1>
        <p>Sink their fleet before they sink yours.</p>
        <button type="button" className="btn shop-link" onClick={onShop}>
          🏪 Trading Post · 🪙 {gold} gold
        </button>
      </header>

      {resume && (
        <section className="resume-card" aria-label="Game in progress">
          <div>
            <h2>⚓ Game in progress</h2>
            <p>
              {resume.label} · {resume.detail}
            </p>
          </div>
          <div className="resume-actions">
            <button type="button" className="btn btn-primary" onClick={resume.onResume}>
              Resume game
            </button>
            <button type="button" className="btn btn-quiet" onClick={resume.onDiscard}>
              Start new game
            </button>
          </div>
        </section>
      )}

      <h2 className="choose-heading">1. Choose a mode</h2>
      <div className="mode-picker" role="radiogroup" aria-label="Game mode">
        {MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            role="radio"
            aria-checked={mode === m.id}
            className={`mode-option ${mode === m.id ? 'mode-selected' : ''}`}
            onClick={() => onModeChange(m.id)}
          >
            <span className="mode-name">{m.name}</span>
            <span className="mode-blurb">{m.blurb}</span>
          </button>
        ))}
      </div>

      <h2 className="choose-heading">2. Choose your opponent</h2>
      <div className="theme-cards">
        {THEME_ORDER.map((id) => {
          const theme = THEMES[id]
          return (
            <button key={id} type="button" className={`theme-card theme-${id}`} onClick={() => onChoose(id)}>
              <span className="theme-card-avatar">
                <Avatar themeId={id} mood="smug" size={88} />
              </span>
              <span className="theme-card-name">{theme.name}</span>
              <span className="theme-card-opponent">{theme.opponent.name}</span>
              <span className="theme-card-tagline">{theme.tagline}</span>
              <span className="theme-card-cta">Play →</span>
            </button>
          )
        })}
      </div>

      <details className="how-to">
        <summary>How to play (30 seconds)</summary>
        <ul>
          <li>Place your five ships on your board, or tap Auto-place.</li>
          <li>Take turns firing at one square on the enemy board. Turns alternate, even after a hit.</li>
          <li>● is a miss, ✕ is a hit. A ship sinks when every square of it is hit, and its name is announced.</li>
          <li>Sink all five enemy ships before they sink yours.</li>
          <li>
            Special mode: you and your opponent each get 3 single-use abilities. Scouting abilities still let you
            shoot; attack abilities replace your shot. One ability per turn.
          </li>
        </ul>
      </details>
    </div>
  )
}
