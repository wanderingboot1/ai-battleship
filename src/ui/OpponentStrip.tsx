import { Avatar } from '../themes/Avatar'
import type { Mood, Theme } from '../themes/types'

interface Props {
  theme: Theme
  mood: Mood
  line: { text: string; key: number } | null
  banterOn: boolean
}

export function OpponentStrip({ theme, mood, line, banterOn }: Props) {
  return (
    <div className="opponent-strip">
      <div className="avatar-frame">
        <Avatar themeId={theme.id} mood={mood} size={64} />
      </div>
      <div className="opponent-text">
        <div className="opponent-name">{theme.opponent.name}</div>
        {banterOn && line ? (
          <p key={line.key} className="speech">
            “{line.text}”
          </p>
        ) : (
          <div className="opponent-title">{theme.opponent.title}</div>
        )}
      </div>
    </div>
  )
}
