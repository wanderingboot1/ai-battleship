import type { Rng } from '../engine/types'
import type { DialogueEvent, Theme } from './types'

/**
 * Picks lines without repeating any until every line for that event has been used
 * ("shuffle bag"), so banter doesn't feel repetitive.
 */
export function createLinePicker(theme: Theme, rng: Rng) {
  const bags = new Map<DialogueEvent, string[]>()
  let last: string | null = null
  return (event: DialogueEvent, vars: { ship?: string } = {}): string => {
    let bag = bags.get(event)
    if (!bag || bag.length === 0) {
      bag = [...theme.dialogue[event]]
      for (let i = bag.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1))
        ;[bag[i], bag[j]] = [bag[j], bag[i]]
      }
      if (bag.length > 1 && bag[bag.length - 1] === last) bag.unshift(bag.pop()!)
      bags.set(event, bag)
    }
    const line = bag.pop()!
    last = line
    return line.replaceAll('{ship}', vars.ship ?? 'ship')
  }
}
