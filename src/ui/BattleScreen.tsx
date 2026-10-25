import { useEffect, useMemo, useRef, useState } from 'react'
import { decideAction } from '../ai/opponent'
import { getAIView } from '../engine/aiView'
import { cellLabel } from '../engine/board'
import { applyAction, createMatch, isSunk, statsFor, type GameState, type ShotEvent } from '../engine/game'
import { randomFleet } from '../engine/placement'
import { createRng, randomSeed } from '../engine/rng'
import type { Cell, Ship } from '../engine/types'
import { createLinePicker } from '../themes/dialogue'
import type { DialogueEvent, Mood, Theme } from '../themes/types'
import { Board } from './Board'
import { FleetStatus } from './FleetStatus'
import { OpponentStrip } from './OpponentStrip'

interface Props {
  theme: Theme
  humanShips: Ship[]
  banterOn: boolean
  onRematch: (humanShips: Ship[]) => void
  onChangeTheme: () => void
}

let matchCounter = 0

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

function dialogueEventFor(event: ShotEvent): DialogueEvent {
  if (event.by === 'human') return event.result === 'miss' ? 'playerMiss' : event.result === 'hit' ? 'playerHit' : 'aiShipSunk'
  return event.result === 'miss' ? 'aiMiss' : event.result === 'hit' ? 'aiHit' : 'playerShipSunk'
}

function moodFor(game: GameState): Mood {
  if (game.phase === 'over') return game.winner === 'ai' ? 'smug' : 'defeated'
  const last = game.history[game.history.length - 1]
  if (!last) return 'neutral'
  if (last.by === 'human') return last.result === 'miss' ? 'smug' : 'annoyed'
  return last.result === 'miss' ? 'neutral' : 'smug'
}

export function BattleScreen({ theme, humanShips, banterOn, onRematch, onChangeTheme }: Props) {
  const rng = useRef(createRng(randomSeed()))
  const [game, setGame] = useState<GameState>(() =>
    createMatch(++matchCounter, { human: humanShips, ai: randomFleet(rng.current) }),
  )
  const gameRef = useRef(game)
  gameRef.current = game

  const pickLine = useMemo(() => createLinePicker(theme, rng.current), [theme])
  const [line, setLine] = useState<{ text: string; key: number; priority: number; at: number } | null>(null)
  const processed = useRef(-1)

  const say = (event: DialogueEvent, ship?: string) => {
    const priority = ['intro', 'aiShipSunk', 'playerShipSunk', 'aiWins', 'aiLoses'].includes(event) ? 2 : 1
    setLine((current) => {
      if (current && current.priority > priority && Date.now() - current.at < 2500) return current
      return { text: pickLine(event, { ship }), key: Date.now(), priority, at: Date.now() }
    })
  }

  // React to each new shot: opponent banter. Runs once per history entry.
  useEffect(() => {
    const count = game.history.length
    if (processed.current === count) return
    processed.current = count
    if (count === 0) {
      say('intro')
      return
    }
    const event = game.history[count - 1]
    if (game.phase === 'over') {
      say(game.winner === 'ai' ? 'aiWins' : 'aiLoses')
      return
    }
    const kind = dialogueEventFor(event)
    const ship = event.sunkShip ? theme.shipNames[event.sunkShip] : undefined
    if (event.result === 'sunk' || rng.current() < 0.4) say(kind, ship)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.history.length])

  // Hide banter after a few seconds so it never lingers over play.
  useEffect(() => {
    if (!line || game.phase === 'over') return
    const id = window.setTimeout(() => setLine(null), 4500)
    return () => window.clearTimeout(id)
  }, [line, game.phase])

  // The AI's turn: wait briefly, then decide using only its legal view of the board.
  useEffect(() => {
    if (game.phase !== 'battle' || game.turn !== 'ai') return
    const delay = prefersReducedMotion() ? 250 : 650 + rng.current() * 400
    const id = window.setTimeout(() => {
      const snapshot = gameRef.current
      if (snapshot.matchId !== game.matchId || snapshot.turn !== 'ai' || snapshot.phase !== 'battle') return
      const decision = decideAction(getAIView(snapshot), rng.current)
      const result = applyAction(snapshot, { type: 'fire', matchId: snapshot.matchId, by: 'ai', cell: decision.cell })
      if (result.ok) setGame((current) => (current === snapshot ? result.state : current))
    }, delay)
    return () => window.clearTimeout(id)
  }, [game])

  const fire = (cell: Cell) => {
    setGame((current) => {
      const result = applyAction(current, { type: 'fire', matchId: current.matchId, by: 'human', cell })
      return result.ok ? result.state : current
    })
  }

  const humanTurn = game.phase === 'battle' && game.turn === 'human'
  const aiShipsSunk = game.fleets.ai.filter((s) => isSunk(s, game.marks.ai))
  const humanShipsSunk = game.fleets.human.filter((s) => isSunk(s, game.marks.human))
  const sunkCells = (ships: Ship[]) => new Set(ships.flatMap((s) => s.cells))
  const lastBy = (who: 'human' | 'ai') => [...game.history].reverse().find((e) => e.by === who)?.cell ?? null

  const last = game.history[game.history.length - 1]
  const status = describe(last, theme, game)
  const over = game.phase === 'over'
  const humanStats = statsFor(game, 'human')
  const aiStats = statsFor(game, 'ai')

  return (
    <div className="battle">
      <OpponentStrip theme={theme} mood={moodFor(game)} line={line} banterOn={banterOn} />

      {over ? (
        <section className={`result-card ${game.winner === 'human' ? 'result-win' : 'result-loss'}`} aria-live="polite">
          <h2>{game.winner === 'human' ? 'Victory!' : 'Defeat'}</h2>
          <p>
            {game.winner === 'human'
              ? `You sank ${theme.opponent.name}'s entire fleet.`
              : `${theme.opponent.name} sank your fleet.`}
          </p>
          <dl className="stats">
            <div>
              <dt>Your shots</dt>
              <dd>
                {humanStats.shots} ({Math.round(humanStats.accuracy * 100)}% hits)
              </dd>
            </div>
            <div>
              <dt>{theme.opponent.shortName}'s shots</dt>
              <dd>
                {aiStats.shots} ({Math.round(aiStats.accuracy * 100)}% hits)
              </dd>
            </div>
          </dl>
          <div className="result-actions">
            <button type="button" className="btn btn-primary" onClick={() => onRematch(humanShips)}>
              Rematch
            </button>
            <button type="button" className="btn" onClick={onChangeTheme}>
              Change theme
            </button>
          </div>
        </section>
      ) : (
        <div className={`turn-banner ${humanTurn ? 'turn-human' : 'turn-ai'}`}>
          <span className="turn-indicator" aria-hidden="true">
            {humanTurn ? '▶' : '⏳'}
          </span>
          <span>{humanTurn ? 'Your turn: fire on the enemy board' : `${theme.opponent.shortName} is aiming…`}</span>
        </div>
      )}
      <p className="status-line" role="status" aria-live="polite">
        {status}
      </p>

      <div className="boards">
        <div className="board-wrap">
          <h3 className="board-title">{theme.terms.enemyBoard}</h3>
          <Board
            themeId={theme.id}
            label={theme.terms.enemyBoard}
            marks={game.marks.ai}
            ships={(over ? game.fleets.ai : aiShipsSunk).map((ship) => ({ ship, sunk: isSunk(ship, game.marks.ai) }))}
            sunkCells={sunkCells(aiShipsSunk)}
            lastShot={lastBy('human')}
            onCellClick={fire}
            isCellEnabled={(cell) => humanTurn && game.marks.ai[cell] === 'none'}
            describeCell={(cell) => `${cellLabel(cell)}, ${describeMark(game.marks.ai[cell])}`}
            className={`board-enemy ${humanTurn ? 'board-active' : 'board-waiting'}`}
          />
        </div>
        <div className="board-wrap board-wrap-own">
          <h3 className="board-title">{theme.terms.ownBoard}</h3>
          <Board
            themeId={theme.id}
            label={theme.terms.ownBoard}
            marks={game.marks.human}
            ships={game.fleets.human.map((ship) => ({ ship, sunk: isSunk(ship, game.marks.human) }))}
            sunkCells={sunkCells(humanShipsSunk)}
            lastShot={lastBy('ai')}
            describeCell={(cell) => `${cellLabel(cell)}, ${describeMark(game.marks.human[cell])}`}
            className="board-own"
          />
        </div>
      </div>

      <div className="fleets">
        <FleetStatus
          theme={theme}
          title={`${theme.opponent.shortName}'s fleet`}
          ships={game.fleets.ai}
          marks={game.marks.ai}
          hideDamage={!over}
        />
        <FleetStatus theme={theme} title="Your fleet" ships={game.fleets.human} marks={game.marks.human} />
      </div>
    </div>
  )
}

function describeMark(mark: string) {
  return mark === 'none' ? 'not fired on' : mark
}

function describe(event: ShotEvent | undefined, theme: Theme, game: GameState): string {
  if (!event) return `${theme.opponent.shortName}'s fleet is hidden. Tap a square on the enemy board to fire.`
  const at = cellLabel(event.cell)
  const ship = event.sunkShip ? theme.shipNames[event.sunkShip] : ''
  if (event.by === 'human') {
    if (event.result === 'miss') return `You fired at ${at}: miss.`
    if (event.result === 'hit') return `You fired at ${at}: hit!`
    return `You sank ${theme.opponent.shortName}'s ${ship}!`
  }
  const target = game.fleets.human.find((s) => s.cells.includes(event.cell))
  if (event.result === 'miss') return `${theme.opponent.shortName} fired at ${at}: miss.`
  if (event.result === 'hit') return `${theme.opponent.shortName} hit your ${theme.shipNames[target!.type]} at ${at}.`
  return `${theme.opponent.shortName} sank your ${ship}!`
}
