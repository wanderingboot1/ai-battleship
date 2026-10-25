import { Avatar } from '../themes/Avatar'
import { THEMES, THEME_ORDER } from '../themes'
import type { ThemeId } from '../themes/types'

export function TitleScreen({ onChoose }: { onChoose: (theme: ThemeId) => void }) {
  return (
    <div className="title-screen">
      <header className="title-hero">
        <h1>AI Battleship</h1>
        <p>Sink their fleet before they sink yours.</p>
      </header>

      <h2 className="choose-heading">Choose your opponent</h2>
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
        </ul>
      </details>
    </div>
  )
}
