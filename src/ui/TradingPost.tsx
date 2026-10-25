import { GoldCoin } from './GoldCoin'
import { PetArt } from '../pets/PetArt'
import { PETS, WIN_REWARD, type PetId, type Wallet } from '../pets/pets'

interface Props {
  wallet: Wallet
  onBuy: (id: PetId) => void
  onEquip: (id: PetId | null) => void
  onBack: () => void
}

export function TradingPost({ wallet, onBuy, onEquip, onBack }: Props) {
  return (
    <div className="shop">
      <header className="title-hero">
        <h1>Trading Post</h1>
        <p className="gold-balance" aria-live="polite">
          <GoldCoin /> {wallet.gold} gold
        </p>
        <p>
          Win a match to earn {WIN_REWARD} gold. Co-captains ride along and drop your shots for you. Win them all.
        </p>
      </header>

      <div className="pet-grid">
        {PETS.map((pet) => {
          const owned = wallet.owned.includes(pet.id)
          const equipped = wallet.equipped === pet.id
          const short = pet.price - wallet.gold
          return (
            <article key={pet.id} className={`pet-card ${equipped ? 'pet-equipped' : ''}`}>
              <div className="pet-portrait">
                <PetArt id={pet.id} />
              </div>
              <h2>{pet.name}</h2>
              <p className="pet-blurb">{pet.blurb}</p>
              {equipped ? (
                <button type="button" className="btn" disabled>
                  ✓ Equipped
                </button>
              ) : owned ? (
                <button type="button" className="btn" onClick={() => onEquip(pet.id)}>
                  Equip
                </button>
              ) : (
                <>
                  <button type="button" className="btn btn-primary" disabled={short > 0} onClick={() => onBuy(pet.id)}>
                    Buy · <GoldCoin /> {pet.price}
                  </button>
                  {short > 0 && <span className="pet-need">{short} more gold needed</span>}
                </>
              )}
            </article>
          )
        })}
      </div>

      <div className="shop-actions">
        {wallet.equipped && (
          <button type="button" className="btn btn-quiet" onClick={() => onEquip(null)}>
            Sail without a co-captain
          </button>
        )}
        <button type="button" className="btn" onClick={onBack}>
          ← Back to the docks
        </button>
      </div>
      <p className="fine-print">
        Gold and co-captains are saved in this browser only. Clearing site data or switching devices starts over.
      </p>
    </div>
  )
}
