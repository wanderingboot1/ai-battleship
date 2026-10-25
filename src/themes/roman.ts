import type { Theme } from './types'

export const roman: Theme = {
  id: 'roman',
  name: 'Roman Navy',
  tagline: 'Bronze rams, oar banks and an extremely important commander.',
  opponent: { name: 'Navarch Gaius Magnus', title: 'Admiral of the Mare Nostrum', shortName: 'Gaius' },
  shipNames: {
    carrier: 'Quinquereme',
    battleship: 'Quadrireme',
    cruiser: 'Trireme',
    submarine: 'Liburna',
    patrol: 'Bireme',
  },
  terms: { enemyBoard: 'Hostile waters', ownBoard: 'Your fleet' },
  dialogue: {
    intro: [
      'I am Gaius Magnus. Rome thanks you in advance for your surrender.',
      'Behold, the pride of the Mare Nostrum! Try not to weep.',
      'The Senate is watching. Mostly me, but also you.',
      'Let the record show I was gracious before I crushed you.',
      'Fortune favours the bold. I am extremely bold.',
    ],
    playerMiss: [
      "Ha! You strike only Neptune's patience.",
      'Missed! I shall have it carved on a column.',
      'The sea rejects your offering.',
      'Even the gulls are laughing. Roman gulls, naturally.',
      'A miss worthy of a barbarian.',
    ],
    playerHit: [
      'An insult to Rome itself!',
      'That was merely decorative timber.',
      'Who taught you to aim? I demand their name.',
      'A wound! I shall compose a lament. Later.',
      'Hold the line, rowers! Row with dignity!',
    ],
    aiShipSunk: [
      'My {ship}! The poets will hear of this!',
      'The {ship} is lost. I shall mourn it with a modest banquet.',
      'You dare sink the {ship}? It had a name! It had a bust!',
      'The {ship}, gone. Scribe, make a note: this did not happen.',
      'Mourn, Rome! Mourn the {ship}! ...Very well, enough mourning.',
    ],
    aiHit: [
      'Struck! Exactly as the augurs foretold!',
      'Rome strikes true!',
      'Ha! Feel the might of the Republic!',
      'Victoria! Well, a small victoria.',
      'Another triumph for my biography.',
    ],
    aiMiss: [
      'The wind betrayed me. The wind will be punished.',
      "A tactical splash. You wouldn't understand.",
      'I allowed you that one. Clemency is a Roman virtue.',
      'That shot was meant for Carthage.',
      'The gods are testing me. They will regret it.',
    ],
    playerShipSunk: [
      'Your {ship} sleeps with Neptune!',
      'The {ship} is no more! Add it to my triumph!',
      'Sunk! Fetch my laurel wreath. The good one.',
      'Your {ship} has been... conquered.',
      'Veni, vidi, I sank your {ship}.',
    ],
    aiWins: [
      'Veni, vidi, vici! Rome is eternal. Your fleet is not.',
      'Victory! I shall need a larger arch.',
      'Sound the trumpets! Then sound them again, louder!',
      'Your defeat will be read aloud in the Forum. Twice.',
    ],
    aiLoses: [
      'Impossible! Tell the Senate it was the weather.',
      'Defeated?! Strike this day from the calendar!',
      'You have bested Gaius Magnus. Savour it. History will not.',
      'Rome has not lost. Rome is merely regrouping. Indefinitely.',
    ],
  },
}
