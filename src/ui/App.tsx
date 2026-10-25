import { useEffect, useState } from 'react'
import type { Ship } from '../engine/types'
import { THEMES } from '../themes'
import type { ThemeId } from '../themes/types'
import { BattleScreen } from './BattleScreen'
import { PlacementScreen } from './PlacementScreen'
import { loadSettings, saveSettings, type Settings } from './storage'
import { TitleScreen } from './TitleScreen'

type Screen =
  | { name: 'title' }
  | { name: 'placement'; themeId: ThemeId; initialShips?: Ship[] }
  | { name: 'battle'; themeId: ThemeId; humanShips: Ship[]; key: number }

export default function App() {
  const [settings, setSettings] = useState<Settings>(loadSettings)
  const [screen, setScreenState] = useState<Screen>({ name: 'title' })
  const [confirmLeave, setConfirmLeave] = useState(false)

  useEffect(() => saveSettings(settings), [settings])

  const setScreen = (next: Screen) => {
    setConfirmLeave(false)
    setScreenState(next)
  }

  const themeId = screen.name === 'title' ? null : screen.themeId
  const theme = themeId ? THEMES[themeId] : null

  return (
    <div className={`app ${themeId ? `theme-${themeId}` : 'theme-title'}`}>
      <header className="app-bar">
        <button type="button" className="app-name" onClick={() => setScreen({ name: 'title' })}>
          AI Battleship
        </button>
        {theme && <span className="app-theme">{theme.name}</span>}
        <div className="app-bar-actions">
          {screen.name === 'battle' && (
            <>
              <button
                type="button"
                className="btn btn-small"
                aria-pressed={settings.banter}
                onClick={() => setSettings((s) => ({ ...s, banter: !s.banter }))}
              >
                {settings.banter ? '💬 Banter on' : '💬 Banter off'}
              </button>
              {confirmLeave ? (
                <span className="confirm-leave">
                  Leave match?
                  <button type="button" className="btn btn-small" onClick={() => setScreen({ name: 'title' })}>
                    Yes
                  </button>
                  <button type="button" className="btn btn-small btn-quiet" onClick={() => setConfirmLeave(false)}>
                    No
                  </button>
                </span>
              ) : (
                <button type="button" className="btn btn-small btn-quiet" onClick={() => setConfirmLeave(true)}>
                  New game
                </button>
              )}
            </>
          )}
        </div>
      </header>

      <main className="app-main">
        {screen.name === 'title' && (
          <TitleScreen
            onChoose={(id) => {
              setSettings((s) => ({ ...s, lastTheme: id }))
              setScreen({ name: 'placement', themeId: id })
            }}
          />
        )}
        {screen.name === 'placement' && theme && (
          <PlacementScreen
            key={`${screen.themeId}-placement`}
            theme={theme}
            initialShips={screen.initialShips}
            onBack={() => setScreen({ name: 'title' })}
            onStart={(ships) => setScreen({ name: 'battle', themeId: screen.themeId, humanShips: ships, key: Date.now() })}
          />
        )}
        {screen.name === 'battle' && theme && (
          <BattleScreen
            key={screen.key}
            theme={theme}
            humanShips={screen.humanShips}
            banterOn={settings.banter}
            onRematch={(ships) => setScreen({ name: 'placement', themeId: screen.themeId, initialShips: ships })}
            onChangeTheme={() => setScreen({ name: 'title' })}
          />
        )}
      </main>

      <footer className="app-footer">
        Built by Blake with Devin · <a href="https://github.com/wanderingboot1/ai-battleship">Source</a> · build{' '}
        <code>{__BUILD_SHA__.slice(0, 7)}</code>
      </footer>
    </div>
  )
}
