import { type ReactElement, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Html } from '@react-three/drei'
import type { Battle, Journey } from '../data/schema'
import { geodeticToVector3 } from '../lib/geo'
import { affiliationOf } from '../lib/affiliation'
import { echelonTicks } from '../lib/unitSymbol'
import { type UnitTrack, unitPositionAt } from '../lib/battleUnitTracks'
import { useAppStore } from '../state/store'
import { terrainSampler } from './useTerrainHeights'

// Clearance above the sampled terrain surface (~50 m in scene units).
// depthTest is off so nothing gets buried at this tight clearance.
const SURFACE_CLEARANCE = 0.000008

// Serif + dark text-shadow treatment so unit text reads over any imagery.
// Same serif/shadow treatment used for battle labels.
const TEXT_FONT = "Georgia, 'Times New Roman', serif"
const TEXT_SHADOW =
  '0 1px 2px rgba(0,0,0,0.9), 0 0 4px rgba(0,0,0,0.7)'

// APP-6 frame fill — a light parchment tone shared by both affiliations.
const FRAME_FILL = '#f2eee6'
// Dark ink for the branch glyph.
const INK = '#1a1a1a'

// Frame geometry. The friendly rectangle is wider than tall; the hostile
// diamond is sized to enclose roughly the same area.
const FRAME_W = 44
const FRAME_H = 30
// SVG viewBox padding so ticks (above) and a touch of stroke don't clip.
const SVG_W = 56
const SVG_H = 48
const CX = SVG_W / 2
const CY = 26 // frame vertical center, leaving room for ticks above

/**
 * Inline APP-6 unit counter SVG: affiliation-shaped frame, branch glyph, and
 * echelon ticks above the frame. Sized for constant on-screen readability.
 */
function CounterSvg({
  affiliation,
  branch,
  echelon,
  sideColor,
}: {
  affiliation: 'friendly' | 'hostile'
  branch: UnitTrack['branch']
  echelon: UnitTrack['echelon']
  sideColor: string
}) {
  const halfW = FRAME_W / 2
  const halfH = FRAME_H / 2
  // Frame bounds.
  const left = CX - halfW
  const right = CX + halfW
  const top = CY - halfH
  const bottom = CY + halfH

  // Branch glyph, drawn within an inset of the frame.
  const inset = 7
  const gl = CX - halfW + inset
  const gr = CX + halfW - inset
  const gt = CY - halfH + inset
  const gb = CY + halfH - inset

  let glyph: ReactElement | null = null
  switch (branch) {
    case 'infantry':
      // Two diagonals forming an ✕.
      glyph = (
        <>
          <line x1={gl} y1={gt} x2={gr} y2={gb} stroke={INK} strokeWidth={2} />
          <line x1={gl} y1={gb} x2={gr} y2={gt} stroke={INK} strokeWidth={2} />
        </>
      )
      break
    case 'cavalry':
      // Single diagonal lower-left → upper-right.
      glyph = <line x1={gl} y1={gb} x2={gr} y2={gt} stroke={INK} strokeWidth={2} />
      break
    case 'artillery':
      // Filled dot.
      glyph = <circle cx={CX} cy={CY} r={5} fill={INK} />
      break
    case 'naval':
      glyph = (
        <text
          x={CX}
          y={CY}
          fontSize={16}
          textAnchor="middle"
          dominantBaseline="central"
          fill={INK}
        >
          {'⚓'}
        </text>
      )
      break
    case 'command':
      // Small filled flag: a vertical staff with a pennant block.
      glyph = (
        <>
          <line x1={gl + 3} y1={gt} x2={gl + 3} y2={gb} stroke={INK} strokeWidth={2} />
          <rect x={gl + 3} y={gt} width={(gr - gl) * 0.55} height={(gb - gt) * 0.45} fill={INK} />
        </>
      )
      break
  }

  return (
    <svg
      width={SVG_W}
      height={SVG_H}
      viewBox={`0 0 ${SVG_W} ${SVG_H}`}
      style={{
        display: 'block',
        overflow: 'visible',
        // Drop shadow so the parchment counter separates from busy terrain.
        filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.85))',
      }}
    >
      {/* Echelon ticks centered above the frame. */}
      <text
        x={CX}
        y={top - 4}
        fontSize={9}
        fontWeight={700}
        textAnchor="middle"
        fill={INK}
        style={{
          fontFamily: TEXT_FONT,
          paintOrder: 'stroke',
          stroke: FRAME_FILL,
          strokeWidth: 2,
        }}
      >
        {echelonTicks(echelon)}
      </text>

      {/* Affiliation frame. */}
      {affiliation === 'friendly' ? (
        <rect
          x={left}
          y={top}
          width={FRAME_W}
          height={FRAME_H}
          fill={FRAME_FILL}
          stroke={sideColor}
          strokeWidth={2.5}
        />
      ) : (
        <polygon
          points={`${CX},${top} ${right},${CY} ${CX},${bottom} ${left},${CY}`}
          fill={FRAME_FILL}
          stroke={sideColor}
          strokeWidth={2.5}
        />
      )}

      {/* Branch glyph on top of the frame. */}
      {glyph}
    </svg>
  )
}

/**
 * One persistent NATO APP-6 unit counter that drapes onto the terrain at the
 * unit's interpolated position for the current battle-playback time.
 */
export function UnitCounter({
  track,
  battle,
  journey,
}: {
  track: UnitTrack
  battle: Battle
  journey: Journey
}) {
  const groupRef = useRef<THREE.Group>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const labelRef = useRef<HTMLDivElement>(null)
  const affiliation = affiliationOf(journey, track.side)
  const sideColor = battle.sides[track.side] ?? '#ffffff'

  useFrame(() => {
    const group = groupRef.current
    if (!group) return

    const { mode, battleElapsed } = useAppStore.getState()
    if (mode !== 'battle') return

    const pos = unitPositionAt(track, battle, battleElapsed)
    // drei <Html> renders a DOM element that does NOT hide when the parent
    // group's visible=false. Before a unit first appears (pos null) the group
    // has no valid position, so the counter would sit at the scene origin
    // (≈ screen centre at battle zoom). Toggle the DOM visibility directly to
    // truly hide a not-yet-appeared (or finished-and-gone) unit.
    if (pos == null) {
      group.visible = false
      if (contentRef.current) contentRef.current.style.visibility = 'hidden'
      return
    }

    group.visible = true
    if (contentRef.current) contentRef.current.style.visibility = 'visible'
    const r = terrainSampler.sampleRadius(pos.lat, pos.lng) + SURFACE_CLEARANCE
    group.position.copy(geodeticToVector3(pos.lat, pos.lng, r))
  })

  return (
    <group ref={groupRef}>
      <Html
        center
        zIndexRange={[15, 0]}
        style={{ pointerEvents: 'none' }}
      >
        <div
          ref={contentRef}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            userSelect: 'none',
            fontFamily: TEXT_FONT,
            visibility: 'hidden', // shown by useFrame once the unit has a valid position
          }}
        >
          {/* The compact APP-6 symbol is always visible; hovering it reveals the
              unit name + strength. Names are hover-only so converging units don't
              bury each other in text (matches the battle map's clean-by-default
              treatment). */}
          <div
            style={{ pointerEvents: 'auto', cursor: 'default' }}
            onPointerEnter={() => { if (labelRef.current) labelRef.current.style.opacity = '1' }}
            onPointerLeave={() => { if (labelRef.current) labelRef.current.style.opacity = '0' }}
          >
            <CounterSvg
              affiliation={affiliation}
              branch={track.branch}
              echelon={track.echelon}
              sideColor={sideColor}
            />
          </div>
          <div
            ref={labelRef}
            style={{
              opacity: 0,
              transition: 'opacity 0.12s ease',
              pointerEvents: 'none',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            <div
              style={{
                marginTop: '1px',
                fontSize: '11px',
                fontWeight: 600,
                color: '#f0e8d6',
                textShadow: TEXT_SHADOW,
                whiteSpace: 'nowrap',
                lineHeight: 1.15,
              }}
            >
              {track.unit}
            </div>
            {track.strength != null && (
              <div
                style={{
                  fontSize: '9px',
                  color: '#e8dcc4',
                  textShadow: TEXT_SHADOW,
                  whiteSpace: 'nowrap',
                  lineHeight: 1.15,
                }}
              >
                {track.strength.toLocaleString()}
              </div>
            )}
          </div>
        </div>
      </Html>
    </group>
  )
}
