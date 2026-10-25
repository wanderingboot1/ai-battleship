import type { Mood, ThemeId } from './types'

interface FaceProps {
  mood: Mood
  skin: string
  eyePatch?: boolean
}

/** Shared face; mood changes brows, eyes and mouth. */
function Face({ mood, skin, eyePatch }: FaceProps) {
  const brows: Record<Mood, [string, string]> = {
    neutral: ['M36 45 L45 45', 'M55 45 L64 45'],
    smug: ['M36 46 L45 46', 'M55 42 L64 44'],
    annoyed: ['M36 43 L45 46', 'M55 46 L64 43'],
    defeated: ['M36 46 L45 43', 'M55 43 L64 46'],
  }
  const mouths: Record<Mood, string> = {
    neutral: 'M43 64 Q50 66 57 64',
    smug: 'M42 63 Q52 67 59 60',
    annoyed: 'M43 66 Q50 61 57 66',
    defeated: 'M42 67 Q50 60 58 67',
  }
  const eyeRy = mood === 'defeated' ? 1.2 : 2.4
  return (
    <g>
      <ellipse cx="50" cy="52" rx="19" ry="22" fill={skin} />
      <path d={brows[mood][0]} stroke="#3a2a1e" strokeWidth="2.4" strokeLinecap="round" />
      <path d={brows[mood][1]} stroke="#3a2a1e" strokeWidth="2.4" strokeLinecap="round" />
      <ellipse cx="41" cy="51" rx="2.2" ry={eyeRy} fill="#1d1d1d" />
      {eyePatch ? (
        <g>
          <path d="M31 40 L68 58" stroke="#111" strokeWidth="1.6" />
          <ellipse cx="59" cy="51" rx="5" ry="4.2" fill="#111" />
        </g>
      ) : (
        <ellipse cx="59" cy="51" rx="2.2" ry={eyeRy} fill="#1d1d1d" />
      )}
      <path d={mouths[mood]} stroke="#5a2a20" strokeWidth="2.2" fill="none" strokeLinecap="round" />
    </g>
  )
}

function Admiral({ mood }: { mood: Mood }) {
  return (
    <>
      <path d="M14 100 Q16 78 50 76 Q84 78 86 100 Z" fill="#1d2b4a" />
      <path d="M42 77 L50 90 L58 77 Z" fill="#f2f2f2" />
      <rect x="16" y="82" width="16" height="6" rx="3" fill="#d4a63a" />
      <rect x="68" y="82" width="16" height="6" rx="3" fill="#d4a63a" />
      <path d="M31 50 Q30 62 34 66 L34 50 Z M69 50 Q70 62 66 66 L66 50 Z" fill="#b9b9b9" />
      <Face mood={mood} skin="#f0c8a6" />
      <path d="M40 60 Q50 56 60 60 Q56 63 50 61 Q44 63 40 60 Z" fill="#9a9a9a" />
      <ellipse cx="50" cy="31" rx="25" ry="9" fill="#1d2b4a" />
      <rect x="30" y="31" width="40" height="8" fill="#1d2b4a" />
      <rect x="30" y="35" width="40" height="3" fill="#d4a63a" />
      <path d="M28 39 Q50 46 72 39 L72 41 Q50 48 28 41 Z" fill="#111" />
      <circle cx="50" cy="30" r="3.5" fill="#d4a63a" />
    </>
  )
}

function Navarch({ mood }: { mood: Mood }) {
  return (
    <>
      <path d="M12 100 Q16 76 50 75 Q84 76 88 100 Z" fill="#a8282a" />
      <path d="M30 100 Q32 82 50 81 Q68 82 70 100 Z" fill="#c9923e" />
      <path d="M36 88 L64 88 M36 94 L64 94" stroke="#8a6a2a" strokeWidth="2" />
      <Face mood={mood} skin="#d9a47a" />
      <path d="M27 46 Q26 24 50 22 Q74 24 73 46 L68 46 Q66 32 50 31 Q34 32 32 46 Z" fill="#c9923e" />
      <path d="M28 44 L33 44 L35 62 L29 58 Z M72 44 L67 44 L65 62 L71 58 Z" fill="#b07d30" />
      <path d="M30 24 Q50 0 70 24 Q50 14 30 24 Z" fill="#c42a2a" />
      <path d="M33 22 Q50 6 67 22" stroke="#8e1c1c" strokeWidth="1.5" fill="none" />
    </>
  )
}

function Captain({ mood }: { mood: Mood }) {
  return (
    <>
      <path d="M26 46 Q20 76 24 90 L36 84 L34 50 Z M74 46 Q80 76 76 90 L64 84 L66 50 Z" fill="#7a2e1c" />
      <path d="M12 100 Q16 78 50 76 Q84 78 88 100 Z" fill="#8c1d2a" />
      <path d="M42 77 L50 96 L58 77 Z" fill="#f4ecd8" />
      <Face mood={mood} skin="#c98d68" eyePatch />
      <circle cx="31" cy="62" r="2.6" fill="none" stroke="#e2b23a" strokeWidth="1.6" />
      <path d="M14 36 Q50 10 86 36 Q70 30 50 32 Q30 30 14 36 Z" fill="#1c1c1c" />
      <path d="M24 34 Q50 6 76 34 Q50 26 24 34 Z" fill="#262626" />
      <path d="M14 36 Q50 26 86 36" stroke="#d4a63a" strokeWidth="1.8" fill="none" />
      <path d="M45 22 L55 22 L50 28 Z" fill="#f4ecd8" />
    </>
  )
}

export function Avatar({ themeId, mood, size = 72 }: { themeId: ThemeId; mood: Mood; size?: number }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden="true" className="avatar-svg">
      {themeId === 'classic' && <Admiral mood={mood} />}
      {themeId === 'roman' && <Navarch mood={mood} />}
      {themeId === 'pirate' && <Captain mood={mood} />}
    </svg>
  )
}
