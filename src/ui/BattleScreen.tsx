import { useEffect, useMemo, useRef, useState } from 'react'
import { GoldCoin } from './GoldCoin'
import { decideTurn } from '../ai/opponent'
import {
  BROADSIDE_SHOTS,
  depthChargeArea,
  drawHand,
  reconArea,
  torpedoLane,
  type AbilityId,
} from '../engine/abilities'
import { getAIView } from '../engine/aiView'
import { cellLabel } from '../engine/board'
import {
  applyAction,
  createMatch,
  isSunk,
  statsFor,
  type AbilityUse,
  type ActionRecord,
  type GameMode,
  type GameState,
  type Intel,
  type ShotEvent,
} from '../engine/game'
import { randomFleet } from '../engine/placement'
import { createRng, randomSeed } from '../engine/rng'
import { PetArt } from '../pets/PetArt'
import { PETS, WIN_REWARD, type PetId } from '../pets/pets'
import type { Cell, Orientation, PlayerId, Ship } from '../engine/types'
import { createLinePicker } from '../themes/dialogue'
import type { DialogueEvent, Mood, Theme } from '../themes/types'
import { AbilityBar } from './AbilityBar'
import { Board } from './Board'
import { FleetStatus } from './FleetStatus'
import { OpponentStrip } from './OpponentStrip'

interface Props {
  theme: Theme
  mode: GameMode
  humanShips: Ship[]
  /** An unfinished game to continue instead of starting a new one. */
  resume?: GameState
  onProgress: (game: GameState) => void
  banterOn: boolean
  pet: PetId | null
  gold: number
  onWin: () => void
  onRematch: (humanShips: Ship[]) => void
  onChangeTheme: () => void
}

let matchCounter = 0

interface Targeting {
  id: AbilityId
  orientation: Orientation
  /** Broadside squares chosen so far. */
  picks: Cell[]
  /** Touch screens have no hover: the first tap aims, a second tap on the same square confirms. */
  aim: Cell | null
}

const reconAreas = (intel: readonly Intel[]) =>
  intel.flatMap((i, n) => (i.kind === 'recon' ? [{ key: `recon${n}`, cells: i.cells, label: String(i.count) }] : []))
const flareCells = (intel: readonly Intel[]) => intel.flatMap((i) => (i.kind === 'flare' ? [i.cell] : []))

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

export function BattleScreen({
  theme,
  mode,
  humanShips,
  resume,
  onProgress,
  banterOn,
  pet,
  gold,
  onWin,
  onRematch,
  onChangeTheme,
}: Props) {
  const rng = useRef(createRng(randomSeed()))
  const [game, setGame] = useState<GameState>(() => {
    if (resume) {
      matchCounter = Math.max(matchCounter, resume.matchId)
      return resume
    }
    return createMatch(
      ++matchCounter,
      { human: humanShips, ai: randomFleet(rng.current) },
      { mode, hands: { human: drawHand(rng.current), ai: drawHand(rng.current) } },
    )
  })
  const [targeting, setTargeting] = useState<Targeting | null>(null)
  const [hover, setHover] = useState<Cell | null>(null)
  const gameRef = useRef(game)
  gameRef.current = game

  const pickLine = useMemo(() => createLinePicker(theme, rng.current), [theme])
  const [line, setLine] = useState<{ text: string; key: number; priority: number; at: number } | null>(null)
  const processed = useRef(resume ? resume.log.length : -1)

  const say = (event: DialogueEvent, vars: { ship?: string; ability?: string } = {}) => {
    const priority = ['intro', 'aiShipSunk', 'playerShipSunk', 'aiWins', 'aiLoses', 'aiAbility', 'playerAbility'].includes(
      event,
    )
      ? 2
      : 1
    setLine((current) => {
      if (current && current.priority > priority && Date.now() - current.at < 2500) return current
      return { text: pickLine(event, vars), key: Date.now(), priority, at: Date.now() }
    })
  }

  // React to each new action: opponent banter. Runs once per log entry.
  useEffect(() => {
    const count = game.log.length
    if (processed.current === count) return
    processed.current = count
    if (count === 0) {
      say('intro')
      return
    }
    const record = game.log[count - 1]
    if (game.phase === 'over') {
      say(game.winner === 'ai' ? 'aiWins' : 'aiLoses')
      return
    }
    if (record.ability) {
      say(record.by === 'ai' ? 'aiAbility' : 'playerAbility', { ability: theme.abilityNames[record.ability] })
    }
    const sunk = record.shots.find((e) => e.result === 'sunk')
    const event = sunk ?? record.shots[record.shots.length - 1]
    if (!event) return
    const ship = event.sunkShip ? theme.shipNames[event.sunkShip] : undefined
    if (sunk || (!record.ability && rng.current() < 0.4)) say(dialogueEventFor(event), { ship })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.log.length])

  useEffect(() => {
    onProgress(game)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game])

  const rewarded = useRef(false)
  useEffect(() => {
    if (game.phase !== 'over' || game.winner !== 'human' || rewarded.current) return
    rewarded.current = true
    onWin()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.phase, game.winner])

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
      const decision = decideTurn(getAIView(snapshot), rng.current)
      const result = applyAction(
        snapshot,
        decision.type === 'fire'
          ? { type: 'fire', matchId: snapshot.matchId, by: 'ai', cell: decision.cell }
          : { type: 'ability', matchId: snapshot.matchId, by: 'ai', use: decision.use },
      )
      if (result.ok) setGame((current) => (current === snapshot ? result.state : current))
    }, delay)
    return () => window.clearTimeout(id)
  }, [game])

  const humanTurn = game.phase === 'battle' && game.turn === 'human'
  const active = humanTurn ? targeting : null
  const open = (cell: Cell) => game.marks.ai[cell] === 'none'
  const openCount = game.marks.ai.filter((m) => m === 'none').length
  const broadsideNeeded = Math.min(BROADSIDE_SHOTS, openCount)

  const fire = (cell: Cell) => {
    setGame((current) => {
      const result = applyAction(current, { type: 'fire', matchId: current.matchId, by: 'human', cell })
      return result.ok ? result.state : current
    })
  }

  const triggerAbility = (use: AbilityUse) => {
    setTargeting(null)
    setGame((current) => {
      const result = applyAction(current, { type: 'ability', matchId: current.matchId, by: 'human', use })
      return result.ok ? result.state : current
    })
  }

  const selectAbility = (id: AbilityId) => {
    if (id === 'flare') triggerAbility({ id: 'flare', roll: rng.current() })
    else setTargeting({ id, orientation: 'horizontal', picks: [], aim: null })
  }

  const targetable = (t: Targeting, cell: Cell) => {
    if (t.id === 'recon') return true
    if (t.id === 'broadside') return open(cell) && !t.picks.includes(cell)
    if (t.id === 'depthCharge') return depthChargeArea(cell).some(open)
    return torpedoLane(cell, t.orientation).some(open)
  }

  const onEnemyCell = (cell: Cell) => {
    if (!active) return fire(cell)
    const confirmed = hover === cell || active.aim === cell
    if (!confirmed) return setTargeting({ ...active, aim: cell })
    if (active.id === 'broadside') {
      const picks = [...active.picks, cell]
      if (picks.length >= broadsideNeeded) triggerAbility({ id: 'broadside', cells: picks })
      else setTargeting({ ...active, picks, aim: null })
      return
    }
    if (active.id === 'torpedo') triggerAbility({ id: 'torpedo', cell, orientation: active.orientation })
    else if (active.id === 'recon' || active.id === 'depthCharge') triggerAbility({ id: active.id, cell })
  }

  const rotate = () =>
    setTargeting((t) => t && { ...t, orientation: t.orientation === 'horizontal' ? 'vertical' : 'horizontal' })

  useEffect(() => {
    if (!active) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setTargeting(null)
      if ((e.key === 'r' || e.key === 'R') && active.id === 'torpedo') rotate()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [active])

  const focus = active ? (active.aim ?? hover) : null
  let preview: { cells: Cell[]; valid: boolean } | null = null
  if (active) {
    const picked = active.id === 'broadside' ? active.picks : []
    const around =
      focus == null
        ? []
        : active.id === 'recon'
          ? reconArea(focus)
          : active.id === 'depthCharge'
            ? depthChargeArea(focus)
            : active.id === 'torpedo'
              ? torpedoLane(focus, active.orientation)
              : [focus]
    preview = { cells: [...new Set([...picked, ...around])], valid: focus == null || targetable(active, focus) }
  }

  const hint = !active
    ? null
    : active.id === 'recon'
      ? 'Choose the centre of a 3×3 scan.'
      : active.id === 'depthCharge'
        ? 'Choose the centre of the + blast.'
        : active.id === 'torpedo'
          ? `Choose a ${active.orientation === 'horizontal' ? 'row (fires from the left)' : 'column (fires from the top)'}.`
          : `Choose ${broadsideNeeded - active.picks.length} more square${broadsideNeeded - active.picks.length === 1 ? '' : 's'}.`
  const aiShipsSunk = game.fleets.ai.filter((s) => isSunk(s, game.marks.ai))
  const humanShipsSunk = game.fleets.human.filter((s) => isSunk(s, game.marks.human))
  const sunkCells = (ships: Ship[]) => new Set(ships.flatMap((s) => s.cells))
  const lastBy = (who: PlayerId) =>
    [...game.log].reverse().find((r) => r.by === who && r.shots.length)?.shots.map((e) => e.cell) ?? []

  const status = describe(game.log[game.log.length - 1], theme, game)
  const spottedByHuman = flareCells(game.intel.human)
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
          {game.winner === 'human' && (
            <p className="gold-earned">
              <GoldCoin /> +{WIN_REWARD} gold · {gold} total. Spend it at the Trading Post.
            </p>
          )}
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
          <span>
            {!humanTurn
              ? `${theme.opponent.shortName} is aiming…`
              : active
                ? `Aim your ${theme.abilityNames[active.id]}`
                : game.scoutedThisTurn
                  ? 'Your turn: now take your shot'
                  : 'Your turn: fire on the enemy board'}
          </span>
        </div>
      )}
      <p className="status-line" role="status" aria-live="polite">
        {status}
      </p>

      {game.mode === 'special' && !over && (
        <AbilityBar
          theme={theme}
          hand={game.hands.human}
          opponentHand={game.hands.ai}
          enabled={humanTurn && !game.scoutedThisTurn}
          active={active?.id ?? null}
          hint={hint}
          orientation={active?.orientation ?? 'horizontal'}
          onSelect={selectAbility}
          onCancel={() => setTargeting(null)}
          onRotate={rotate}
        />
      )}

      <div className="boards">
        <div className="board-wrap">
          <div className="board-heading">
            <h3 className="board-title">{theme.terms.enemyBoard}</h3>
            {pet && (
              <span
                className={`pet-perch ${lastBy('human').length ? '' : 'pet-idle'}`}
                title={`Co-captain: ${PETS.find((p) => p.id === pet)?.name}`}
              >
                <PetArt id={pet} title={`Co-captain: ${PETS.find((p) => p.id === pet)?.name}`} />
              </span>
            )}
          </div>
          <Board
            dropper={pet ? <PetArt id={pet} /> : undefined}
            themeId={theme.id}
            label={theme.terms.enemyBoard}
            marks={game.marks.ai}
            ships={(over ? game.fleets.ai : aiShipsSunk).map((ship) => ({ ship, sunk: isSunk(ship, game.marks.ai) }))}
            sunkCells={sunkCells(aiShipsSunk)}
            lastShots={lastBy('human')}
            areas={reconAreas(game.intel.human)}
            spotted={spottedByHuman}
            preview={preview}
            onCellClick={onEnemyCell}
            onCellHover={setHover}
            isCellEnabled={(cell) => humanTurn && (active ? targetable(active, cell) : open(cell))}
            describeCell={(cell) =>
              `${cellLabel(cell)}, ${describeMark(game.marks.ai[cell])}${open(cell) && spottedByHuman.includes(cell) ? ', ship spotted' : ''}`
            }
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
            lastShots={lastBy('ai')}
            areas={reconAreas(game.intel.ai)}
            spotted={flareCells(game.intel.ai)}
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

function describe(record: ActionRecord | undefined, theme: Theme, game: GameState): string {
  if (!record) return `${theme.opponent.shortName}'s fleet is hidden. Tap a square on the enemy board to fire.`
  const short = theme.opponent.shortName
  if (!record.ability) return describeShot(record.shots[0], theme, game)
  const name = theme.abilityNames[record.ability]
  const human = record.by === 'human'
  const intel = record.intel
  if (intel?.kind === 'recon') {
    const n = `${intel.count} unhit ship square${intel.count === 1 ? '' : 's'}`
    return human
      ? `${name}: ${n} around ${cellLabel(intel.center)}. Now take your shot.`
      : `${short} used ${name} around ${cellLabel(intel.center)} on your waters.`
  }
  if (intel?.kind === 'flare') {
    return human
      ? `${name}: enemy ship spotted at ${cellLabel(intel.cell)}. Now take your shot.`
      : `${short} used ${name} and spotted your ship at ${cellLabel(intel.cell)}.`
  }
  const hits = record.shots.filter((e) => e.result !== 'miss').length
  const misses = record.shots.length - hits
  const sunk = record.shots.filter((e) => e.result === 'sunk').map((e) => theme.shipNames[e.sunkShip!])
  const tally = `${hits} hit${hits === 1 ? '' : 's'}, ${misses} miss${misses === 1 ? '' : 'es'}`
  const sank = sunk.length ? (human ? ` You sank ${short}'s ${sunk.join(' and ')}!` : ` Sank your ${sunk.join(' and ')}!`) : ''
  return `${human ? 'You' : short} used ${name}: ${tally}.${sank}`
}

function describeShot(event: ShotEvent, theme: Theme, game: GameState): string {
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
