import type { Orientation } from '../engine/types'
import type { ThemeId } from './types'

interface Props {
  themeId: ThemeId
  length: number
  orientation: Orientation
}

/** Top-down ship drawn along the x axis (bow to the right) in a length×1 cell box. */
function HorizontalShip({ themeId, length }: { themeId: ThemeId; length: number }) {
  const w = length * 100
  const hull = `M8 22 L${w - 42} 20 Q${w - 4} 50 ${w - 42} 80 L8 78 Q2 50 8 22 Z`
  const stations = Array.from({ length: length - 1 }, (_, i) => 100 * (i + 1) - 20)

  if (themeId === 'classic') {
    return (
      <g>
        <path d={hull} className="ship-hull" />
        <rect x={w * 0.38} y="38" width={w * 0.2} height="24" rx="4" className="ship-detail" />
        {stations
          .filter((x) => x < w * 0.36 || x > w * 0.6)
          .map((x) => (
            <g key={x}>
              <circle cx={x} cy="50" r="9" className="ship-detail" />
              <path d={`M${x} 50 L${x + 18} 50`} className="ship-line" />
            </g>
          ))}
      </g>
    )
  }

  if (themeId === 'roman') {
    return (
      <g>
        {stations.flatMap((x) => [
          <path key={`t${x}`} d={`M${x - 16} 28 L${x - 24} 8 M${x + 8} 28 L${x} 8`} className="ship-oar" />,
          <path key={`b${x}`} d={`M${x - 16} 72 L${x - 24} 92 M${x + 8} 72 L${x} 92`} className="ship-oar" />,
        ])}
        <path d={hull} className="ship-hull" />
        <path d={`M${w - 30} 46 L${w - 2} 50 L${w - 30} 54 Z`} className="ship-ram" />
        <rect x={w / 2 - 14} y="22" width="28" height="56" rx="3" className="ship-sail" />
        <path d={`M${w / 2 - 14} 40 L${w / 2 + 14} 40 M${w / 2 - 14} 60 L${w / 2 + 14} 60`} className="ship-sail-stripe" />
      </g>
    )
  }

  return (
    <g>
      <path d={hull} className="ship-hull" />
      <path d={`M14 41 L${w - 40} 41 M14 59 L${w - 40} 59`} className="ship-line" />
      {stations
        .filter((_, i) => i % 2 === 0 || length <= 3)
        .map((x) => (
          <g key={x}>
            <path d={`M${x} 16 Q${x + 16} 50 ${x} 84`} className="ship-sail" />
            <circle cx={x} cy="50" r="5" className="ship-mast" />
          </g>
        ))}
    </g>
  )
}

export function ShipSprite({ themeId, length, orientation }: Props) {
  const horizontal = orientation === 'horizontal'
  const viewBox = horizontal ? `0 0 ${length * 100} 100` : `0 0 100 ${length * 100}`
  return (
    <svg viewBox={viewBox} className="ship-svg" aria-hidden="true">
      <g transform={horizontal ? undefined : 'translate(100 0) rotate(90)'}>
        <HorizontalShip themeId={themeId} length={length} />
      </g>
    </svg>
  )
}
