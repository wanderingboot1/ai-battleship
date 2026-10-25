import { describe, expect, it } from 'vitest'
import { ABILITY_POOL } from '../engine/abilities'
import { createRng } from '../engine/rng'
import { FLEET } from '../engine/types'
import { createLinePicker } from './dialogue'
import { THEMES, THEME_ORDER } from './index'
import type { DialogueEvent } from './types'

describe('themes', () => {
  it('every theme names every ship and has several lines per event', () => {
    for (const id of THEME_ORDER) {
      const theme = THEMES[id]
      for (const spec of FLEET) expect(theme.shipNames[spec.type]).toBeTruthy()
      for (const id of ABILITY_POOL) expect(theme.abilityNames[id]).toBeTruthy()
      for (const lines of Object.values(theme.dialogue)) expect(lines.length).toBeGreaterThanOrEqual(4)
    }
  })

  it('does not repeat a line until the event has cycled', () => {
    const theme = THEMES.pirate
    const pick = createLinePicker(theme, createRng(7))
    const event: DialogueEvent = 'playerMiss'
    const n = theme.dialogue[event].length
    const seen = new Set(Array.from({ length: n }, () => pick(event)))
    expect(seen.size).toBe(n)
  })

  it('fills in the ship name', () => {
    const pick = createLinePicker(THEMES.roman, createRng(1))
    expect(pick('aiShipSunk', { ship: 'Trireme' })).toContain('Trireme')
  })
})
