import { describe, expect, it } from 'vitest'
import { EMPTY_WALLET, awardWin, buyPet, equipPet, parseWallet } from './pets'

describe('gold and co-captains', () => {
  it('pays 50 gold once per match', () => {
    const once = awardWin(EMPTY_WALLET, 111)
    expect(once.gold).toBe(50)
    expect(awardWin(once, 111)).toBe(once)
    expect(awardWin(once, 222).gold).toBe(100)
  })

  it('buying deducts the price, adds and equips the pet', () => {
    const w = buyPet({ ...EMPTY_WALLET, gold: 120 }, 'dragon')!
    expect(w).toMatchObject({ gold: 20, owned: ['dragon'], equipped: 'dragon' })
  })

  it('refuses unaffordable or already-owned pets', () => {
    expect(buyPet({ ...EMPTY_WALLET, gold: 149 }, 'sharky')).toBeNull()
    expect(buyPet({ ...EMPTY_WALLET, gold: 200, owned: ['parrot'] }, 'parrot')).toBeNull()
    expect(buyPet({ ...EMPTY_WALLET, gold: 200 }, 'otter')).toMatchObject({ gold: 0 })
  })

  it('only equips owned pets, and can unequip', () => {
    const w = { ...EMPTY_WALLET, owned: ['parrot' as const], equipped: 'parrot' as const }
    expect(equipPet(w, 'otter')).toBe(w)
    expect(equipPet(w, null).equipped).toBeNull()
  })

  it('repairs malformed saved data', () => {
    expect(parseWallet(null)).toEqual(EMPTY_WALLET)
    expect(parseWallet({ gold: -5, owned: ['parrot', 'unicorn', 'parrot'], equipped: 'otter' })).toEqual({
      gold: 0,
      owned: ['parrot'],
      equipped: null,
      lastRewarded: null,
    })
    expect(parseWallet({ gold: 72.9, owned: ['otter'], equipped: 'otter', lastRewarded: 5 })).toEqual({
      gold: 72,
      owned: ['otter'],
      equipped: 'otter',
      lastRewarded: 5,
    })
  })
})
