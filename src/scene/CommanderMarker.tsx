import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Html, Line } from '@react-three/drei'
import type { Line2 } from 'three-stdlib'
import type { Battle } from '../data/schema'
import { ellipsoidSceneRadius, geodeticToVector3 } from '../lib/geo'
import { type CommanderTrack, unitPositionAt } from '../lib/battleUnitTracks'
import { useAppStore } from '../state/store'

// Lift above the ellipsoid surface: the star sits a touch higher than its trail
// so the comet tail reads as running underneath the marker. Deterministic
// (ellipsoid, no terrain raycast) to stay flicker-free as the marker moves.
const MARKER_LIFT = 0.00008
const TRAIL_LIFT = 0.00002

// Comet tail: a short window of the commander's RECENT path, fading out behind
// him — so it follows the marker instead of accumulating a permanent zigzag.
const TAIL_SECONDS = 2.4
const TAIL_SAMPLES = 24

const TEXT_FONT = "Georgia, 'Times New Roman', serif"

// Pulsing halo behind the star — injected once (inline styles can't hold @keyframes).
const HALO_STYLE_ID = 'commander-halo-keyframes'
function ensureHaloStyle() {
  if (typeof document === 'undefined' || document.getElementById(HALO_STYLE_ID)) return
  const el = document.createElement('style')
  el.id = HALO_STYLE_ID
  el.textContent = `@keyframes commanderHalo {
    0%,100% { box-shadow: 0 0 6px 2px rgba(232,196,106,0.38); }
    50%     { box-shadow: 0 0 13px 5px rgba(232,196,106,0.70); }
  }`
  document.head.appendChild(el)
}

/**
 * The journey protagonist (Grant / Napoleon) as a single gold command star with
 * an always-on name and a pulsing halo, gliding along his personal researched
 * path. A short comet tail traces where he's just been (sampled from his actual
 * arc-length-paced position, so it always matches his motion) and fades out
 * behind him rather than persisting across the whole battle.
 */
export function CommanderMarker({ track, battle }: { track: CommanderTrack; battle: Battle }) {
  const groupRef = useRef<THREE.Group>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const trailGroupRef = useRef<THREE.Group>(null)
  const lineRef = useRef<Line2>(null)

  useEffect(ensureHaloStyle, [])

  useFrame(() => {
    const group = groupRef.current
    if (!group) return

    const { mode, battleElapsed } = useAppStore.getState()
    if (mode !== 'battle') return

    const pos = unitPositionAt(track, battle, battleElapsed)
    const content = contentRef.current
    const trailGroup = trailGroupRef.current
    const line = lineRef.current

    // Before he reaches the field (or after he leaves) → hide marker and trail.
    if (pos == null) {
      group.visible = false
      if (content) content.style.visibility = 'hidden'
      if (trailGroup) trailGroup.visible = false
      return
    }

    group.visible = true
    group.position.copy(
      geodeticToVector3(pos.lat, pos.lng, ellipsoidSceneRadius(pos.lat) + MARKER_LIFT),
    )
    if (content) content.style.visibility = 'visible'

    // Comet tail: sample his recent path (oldest → newest), fading dark→gold.
    if (line && trailGroup) {
      const positions: number[] = []
      const colors: number[] = []
      let count = 0
      for (let s = 0; s <= TAIL_SAMPLES; s++) {
        const f = s / TAIL_SAMPLES // 0 = tail (oldest), 1 = head (newest)
        const t = battleElapsed - TAIL_SECONDS * (1 - f)
        if (t < 0) continue
        const p = unitPositionAt(track, battle, t)
        if (!p) continue
        const v = geodeticToVector3(p.lat, p.lng, ellipsoidSceneRadius(p.lat) + TRAIL_LIFT)
        positions.push(v.x, v.y, v.z)
        // fade from dark (tail, sinks into the terrain) to bright gold (head)
        colors.push(0.16 + 0.79 * f, 0.12 + 0.68 * f, 0.05 + 0.40 * f)
        count++
      }
      if (count >= 2) {
        line.geometry.setPositions(positions)
        line.geometry.setColors(colors)
        trailGroup.visible = true
      } else {
        trailGroup.visible = false
      }
    }
  })

  return (
    <group>
      <group ref={groupRef}>
        <Html center zIndexRange={[16, 16]} style={{ pointerEvents: 'none' }}>
          <div
            ref={contentRef}
            style={{
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              userSelect: 'none',
              fontFamily: TEXT_FONT,
              visibility: 'hidden',
            }}
          >
            {/* Gold star with pulsing halo — the focal point, on his position. */}
            <div
              style={{
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                animation: 'commanderHalo 2.2s ease-in-out infinite',
              }}
            >
              <span
                style={{
                  fontSize: '21px',
                  lineHeight: 1,
                  color: '#f3d27e',
                  textShadow: '0 0 6px rgba(232,196,106,0.95), 0 1px 2px rgba(0,0,0,0.95)',
                }}
              >
                {'★'}
              </span>
            </div>
            {/* Name — always visible (he outranks the hover-only unit chits).
                Absolutely positioned so it doesn't shift the star off the point. */}
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 1px)',
                left: '50%',
                transform: 'translateX(-50%)',
                fontSize: '10.5px',
                fontWeight: 700,
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                color: '#f3d089',
                background: 'rgba(16,12,8,0.82)',
                border: '1px solid rgba(232,181,74,0.6)',
                borderRadius: '3px',
                padding: '1px 6px',
                whiteSpace: 'nowrap',
                boxShadow: '0 1px 3px rgba(0,0,0,0.5)',
              }}
            >
              {track.name}
            </div>
          </div>
        </Html>
      </group>

      {/* Comet tail — positions/colors written each frame; hidden until it has
          length (no trail while he's standing still). */}
      <group ref={trailGroupRef} visible={false}>
        <Line
          ref={lineRef}
          points={[
            [0, 0, 0],
            [0, 0, 0],
          ]}
          vertexColors={[
            [0.16, 0.12, 0.05],
            [0.95, 0.8, 0.45],
          ]}
          lineWidth={2.5}
          transparent
          opacity={0.95}
          toneMapped={false}
          depthTest={false}
          renderOrder={10}
        />
      </group>
    </group>
  )
}
