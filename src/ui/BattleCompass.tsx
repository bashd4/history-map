import { useAppStore } from '../state/store'

/** Compass rose overlay. North-up & static in Map view; rotates to true north in
 *  Field view (reads the screen-angle-of-north published by CameraHeadingBridge). */
export function BattleCompass() {
  const view = useAppStore((s) => s.battleView)
  const northAngle = useAppStore((s) => s.northAngle)
  const deg = view === 'map' ? 0 : (northAngle * 180) / Math.PI
  return (
    <div className="battle-compass" aria-hidden="true">
      <svg viewBox="0 0 56 56" style={{ transform: `rotate(${deg}deg)` }}>
        <circle cx="28" cy="28" r="25" fill="rgba(20,16,10,.82)" stroke="rgba(232,181,74,.5)" strokeWidth="1.5" />
        {/* cardinal ticks */}
        <g stroke="rgba(232,220,195,.4)" strokeWidth="1">
          <line x1="28" y1="5" x2="28" y2="10" />
          <line x1="28" y1="46" x2="28" y2="51" />
          <line x1="5" y1="28" x2="10" y2="28" />
          <line x1="46" y1="28" x2="51" y2="28" />
        </g>
        {/* north needle (gold) */}
        <polygon points="28,8 33,28 23,28" fill="#e8b54a" />
        {/* south needle (faint cream) */}
        <polygon points="28,48 33,28 23,28" fill="rgba(232,220,195,.4)" />
        <circle cx="28" cy="28" r="2.2" fill="#e8dcc3" />
        {/* N marker */}
        <text x="28" y="17" textAnchor="middle" fontSize="7" fontFamily="Georgia, serif"
              fill="#0a0805" fontWeight="700">N</text>
      </svg>
    </div>
  )
}
