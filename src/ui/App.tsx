import { useEffect, useRef, useState } from 'react'
import { isSunk, type GameMode, type GameState } from '../engine/game'
import type { Ship } from '../engine/types'
import { awardWin, buyPet, equipPet, type Wallet } from '../pets/pets'
import { THEMES } from '../themes'
import type { ThemeId } from '../themes/types'
import { BattleScreen } from './BattleScreen'
import { PlacementScreen } from './PlacementScreen'
import {
  WALLET_KEY,
  loadBattle,
  loadSettings,
  loadWallet,
  readWallet,
  saveBattle,
  saveSettings,
  saveWallet,
  type SavedBattle,
  type Settings,
} from './storage'
import { TitleScreen } from './TitleScreen'
import { TradingPost } from './TradingPost'

type Screen =
  | { name: 'title' }
  | { name: 'shop' }
  | { name: 'placement'; themeId: ThemeId; mode: GameMode; initialShips?: Ship[] }
  | { name: 'battle'; themeId: ThemeId; mode: GameMode; humanShips: Ship[]; key: number; resume?: GameState }

export default function App() {
  const [settings, setSettings] = useState<Settings>(loadSettings)
  const [screen, setScreenState] = useState<Screen>({ name: 'title' })
  const [confirmLeave, setConfirmLeave] = useState(false)

  const [wallet, setWallet] = useState<Wallet>(loadWallet)

  useEffect(() => saveSettings(settings), [settings])

  const [saved, setSaved] = useState<SavedBattle | null>(loadBattle)
  useEffect(() => saveBattle(saved), [saved])

  // Every wallet change starts from the latest saved copy, and other tabs' changes are picked up,
  // so two open tabs never overwrite each other's gold or pets.
  // If saving fails, the stored copy is stale, so keep building on the in-memory wallet instead.
  const storageWritable = useRef(true)
  const updateWallet = (change: (w: Wallet) => Wallet) => {
    const next = change((storageWritable.current && readWallet()) || wallet)
    storageWritable.current = saveWallet(next)
    setWallet(next)
  }
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === null || e.key === WALLET_KEY) setWallet(loadWallet())
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const setScreen = (next: Screen) => {
    setConfirmLeave(false)
    setScreenState(next)
  }

  const themeId = screen.name === 'title' || screen.name === 'shop' ? null : screen.themeId
  const theme = themeId ? THEMES[themeId] : null

  return (
    <div className={`app ${themeId ? `theme-${themeId}` : 'theme-title'}`}>
      <header className="app-bar">
        <button type="button" className="app-name" onClick={() => setScreen({ name: 'title' })}>
          AI Battleship
        </button>
        {theme && (screen.name === 'placement' || screen.name === 'battle') && (
          <span className="app-theme">
            {theme.name} · {screen.mode === 'special' ? 'Special' : 'Classic'}
          </span>
        )}
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
            resume={
              saved && {
                label: `${THEMES[saved.themeId].name} · ${saved.mode === 'special' ? 'Special' : 'Classic'}`,
                detail: `Ships afloat: yours ${afloat(saved.game, 'human')}/5, theirs ${afloat(saved.game, 'ai')}/5`,
                onResume: () => setScreen({ name: 'battle', ...saved, resume: saved.game }),
                onDiscard: () => setSaved(null),
              }
            }
            gold={wallet.gold}
            onShop={() => setScreen({ name: 'shop' })}
            mode={settings.mode}
            onModeChange={(mode) => setSettings((s) => ({ ...s, mode }))}
            onChoose={(id) => {
              setSettings((s) => ({ ...s, lastTheme: id }))
              setScreen({ name: 'placement', themeId: id, mode: settings.mode })
            }}
          />
        )}
        {screen.name === 'shop' && (
          <TradingPost
            wallet={wallet}
            onBuy={(id) => updateWallet((w) => buyPet(w, id) ?? w)}
            onEquip={(id) => updateWallet((w) => equipPet(w, id))}
            onBack={() => setScreen({ name: 'title' })}
          />
        )}
        {screen.name === 'placement' && theme && (
          <PlacementScreen
            key={`${screen.themeId}-placement`}
            theme={theme}
            initialShips={screen.initialShips}
            onBack={() => setScreen({ name: 'title' })}
            onStart={(ships) =>
              setScreen({ name: 'battle', themeId: screen.themeId, mode: screen.mode, humanShips: ships, key: Date.now() })
            }
          />
        )}
        {screen.name === 'battle' && theme && (
          <BattleScreen
            key={screen.key}
            theme={theme}
            mode={screen.mode}
            humanShips={screen.humanShips}
            resume={screen.resume}
            onProgress={(game) =>
              setSaved(
                game.phase === 'over'
                  ? null
                  : { themeId: screen.themeId, mode: screen.mode, humanShips: screen.humanShips, key: screen.key, game },
              )
            }
            banterOn={settings.banter}
            pet={wallet.equipped}
            gold={wallet.gold}
            onWin={() => updateWallet((w) => awardWin(w, screen.key))}
            onRematch={(ships) =>
              setScreen({ name: 'placement', themeId: screen.themeId, mode: screen.mode, initialShips: ships })
            }
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

const afloat = (game: GameState, player: 'human' | 'ai') =>
  game.fleets[player].filter((ship) => !isSunk(ship, game.marks[player])).length
