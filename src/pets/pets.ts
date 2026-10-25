export type PetId = 'parrot' | 'dragon' | 'sharky' | 'otter'

export interface Pet {
  id: PetId
  name: string
  price: number
  blurb: string
}

export const PETS: readonly Pet[] = [
  { id: 'parrot', name: 'Parrot', price: 50, blurb: 'Loud, loyal, and very proud of every hit.' },
  { id: 'dragon', name: 'Dragon', price: 100, blurb: 'A pocket-sized dragon who insists the fire was its idea.' },
  { id: 'sharky', name: 'Sharky', price: 150, blurb: 'Circles the target twice before dropping your shot. For drama.' },
  { id: 'otter', name: 'Captain Dev', price: 200, blurb: 'Plans the shot, carries it out, and reports back.' },
]

export const WIN_REWARD = 50

export interface Wallet {
  gold: number
  owned: PetId[]
  equipped: PetId | null
  /** Key of the last match that paid out, so a win is never rewarded twice. */
  lastRewarded: number | null
}

export const EMPTY_WALLET: Wallet = { gold: 0, owned: [], equipped: null, lastRewarded: null }

const isPetId = (v: unknown): v is PetId => PETS.some((p) => p.id === v)

/** Accepts anything read from storage and returns a well-formed wallet. */
export function parseWallet(raw: unknown): Wallet {
  if (!raw || typeof raw !== 'object') return EMPTY_WALLET
  const r = raw as Record<string, unknown>
  const gold = typeof r.gold === 'number' && Number.isFinite(r.gold) && r.gold > 0 ? Math.floor(r.gold) : 0
  const owned = Array.isArray(r.owned) ? [...new Set(r.owned.filter(isPetId))] : []
  const equipped = isPetId(r.equipped) && owned.includes(r.equipped) ? r.equipped : null
  const lastRewarded = typeof r.lastRewarded === 'number' ? r.lastRewarded : null
  return { gold, owned, equipped, lastRewarded }
}

export function awardWin(wallet: Wallet, matchKey: number): Wallet {
  if (wallet.lastRewarded === matchKey) return wallet
  return { ...wallet, gold: wallet.gold + WIN_REWARD, lastRewarded: matchKey }
}

/** Buys and equips a pet. Returns null if it is already owned or unaffordable. */
export function buyPet(wallet: Wallet, id: PetId): Wallet | null {
  const pet = PETS.find((p) => p.id === id)
  if (!pet || wallet.owned.includes(id) || wallet.gold < pet.price) return null
  return { ...wallet, gold: wallet.gold - pet.price, owned: [...wallet.owned, id], equipped: id }
}

export function equipPet(wallet: Wallet, id: PetId | null): Wallet {
  if (id !== null && !wallet.owned.includes(id)) return wallet
  return { ...wallet, equipped: id }
}
