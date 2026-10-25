import type { PetId } from './pets'

function Parrot() {
  return (
    <>
      <path d="M50 88 L44 98 M56 88 L62 98" stroke="#c98a2b" strokeWidth="4" strokeLinecap="round" />
      <path d="M40 70 L30 96 L48 84 Z" fill="#2f6fd6" />
      <ellipse cx="50" cy="64" rx="20" ry="25" fill="#2fa84f" />
      <path d="M34 58 Q26 74 40 86 Q48 70 34 58 Z" fill="#1f7d3a" />
      <circle cx="52" cy="34" r="17" fill="#e0402f" />
      <path d="M62 30 Q78 34 66 48 Q66 38 60 36 Z" fill="#f4c542" />
      <circle cx="56" cy="30" r="5" fill="#fff" />
      <circle cx="57" cy="30" r="2.6" fill="#111" />
      <ellipse cx="50" cy="66" rx="10" ry="14" fill="#f4c542" opacity="0.85" />
    </>
  )
}

function Dragon() {
  return (
    <>
      <path d="M30 52 L6 34 L14 58 L4 66 L28 66 Z" fill="#7a3fb8" />
      <path d="M70 52 L94 34 L86 58 L96 66 L72 66 Z" fill="#7a3fb8" />
      <path d="M62 82 Q86 88 88 70 Q84 80 70 76 Z" fill="#3fa36b" />
      <ellipse cx="50" cy="68" rx="20" ry="20" fill="#3fa36b" />
      <ellipse cx="50" cy="72" rx="11" ry="13" fill="#bfe8a0" />
      <path d="M38 22 L36 8 L45 20 Z M62 22 L64 8 L55 20 Z" fill="#f2d16b" />
      <ellipse cx="50" cy="36" rx="19" ry="16" fill="#3fa36b" />
      <ellipse cx="50" cy="44" rx="11" ry="7" fill="#5cc086" />
      <circle cx="45" cy="44" r="1.6" fill="#1d4d33" />
      <circle cx="55" cy="44" r="1.6" fill="#1d4d33" />
      <circle cx="42" cy="32" r="4.5" fill="#fff" />
      <circle cx="58" cy="32" r="4.5" fill="#fff" />
      <circle cx="43" cy="32" r="2.4" fill="#111" />
      <circle cx="59" cy="32" r="2.4" fill="#111" />
    </>
  )
}

function Sharky() {
  return (
    <>
      <path d="M14 56 L2 40 L4 72 Z" fill="#6f8aa3" />
      <path d="M50 30 L60 8 L68 34 Z" fill="#6f8aa3" />
      <ellipse cx="54" cy="56" rx="40" ry="24" fill="#8aa7c2" />
      <path d="M20 62 Q54 84 92 60 Q70 76 50 76 Q32 76 20 62 Z" fill="#eef4f8" />
      <path d="M44 74 L36 92 L54 76 Z" fill="#6f8aa3" />
      <path d="M62 62 Q74 70 86 60" stroke="#2b3a48" strokeWidth="2.4" fill="none" strokeLinecap="round" />
      <path d="M66 63 L68 67 L70 64 L72 68 L74 64 L76 67 L78 63" stroke="#fff" strokeWidth="1.6" fill="none" />
      <circle cx="74" cy="46" r="5" fill="#fff" />
      <circle cx="75" cy="46" r="2.6" fill="#111" />
      <path d="M40 48 L42 58 M46 48 L48 58" stroke="#6f8aa3" strokeWidth="2" strokeLinecap="round" />
    </>
  )
}

function Otter() {
  return (
    <>
      <path d="M66 84 Q92 90 90 66 Q84 82 66 76 Z" fill="#7a5233" />
      <ellipse cx="50" cy="74" rx="22" ry="20" fill="#8b5e3c" />
      <ellipse cx="50" cy="78" rx="13" ry="13" fill="#e6c9a3" />
      <circle cx="30" cy="22" r="7" fill="#7a5233" />
      <circle cx="70" cy="22" r="7" fill="#7a5233" />
      <ellipse cx="50" cy="38" rx="24" ry="21" fill="#8b5e3c" />
      <ellipse cx="50" cy="47" rx="14" ry="10" fill="#e6c9a3" />
      <ellipse cx="50" cy="42" rx="4.5" ry="3.2" fill="#2b1a10" />
      <path d="M50 45 L50 49 M45 50 Q50 54 55 50" stroke="#2b1a10" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      <path d="M38 46 L24 43 M38 49 L24 50 M62 46 L76 43 M62 49 L76 50" stroke="#2b1a10" strokeWidth="1" />
      <circle cx="40" cy="33" r="3.2" fill="#111" />
      <circle cx="60" cy="33" r="3.2" fill="#111" />
      <circle cx="41" cy="32" r="1" fill="#fff" />
      <circle cx="61" cy="32" r="1" fill="#fff" />
      <ellipse cx="38" cy="64" rx="6" ry="4.5" fill="#7a5233" />
      <ellipse cx="62" cy="64" rx="6" ry="4.5" fill="#7a5233" />
    </>
  )
}

const ART: Record<PetId, () => React.JSX.Element> = { parrot: Parrot, dragon: Dragon, sharky: Sharky, otter: Otter }

export function PetArt({ id, title }: { id: PetId; title?: string }) {
  const Art = ART[id]
  return (
    <svg viewBox="0 0 100 100" role={title ? 'img' : undefined} aria-hidden={title ? undefined : true}>
      {title && <title>{title}</title>}
      <Art />
    </svg>
  )
}
