import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Html, Line } from '@react-three/drei'
import type { Line2 } from 'three-stdlib'
import type { Battle, LatLng } from '../data/schema'
import { ellipsoidSceneRadius, geodeticToVector3, slerpUnit, vector3ToGeodetic } from '../lib/geo'
import { type CommanderTrack, unitPositionAt } from '../lib/battleUnitTracks'
import { playbackAt } from '../lib/battlePlayback'
import { useAppStore } from '../state/store'

// Lift above the ellipsoid surface: the star sits a touch higher than its trail
// so the dashed line reads as running underneath the marker. Deterministic
// (ellipsoid, no terrain raycast) to stay flicker-free as the marker moves.
const MARKER_LIFT = 0.00008
const TRAIL_LIFT = 0.00002
// Slerp subdivisions per trail leg, so the route follows globe curvature.
const TRAIL_SUB = 6

const GOLD = '#e8c46a'
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
 * Flatten a commander track into an ordered scene-space polyline, each point
 * tagged with the global phase-time (phaseIndex + fraction) at which the
 * commander reaches it. The trail is revealed up to the current time by limiting
 * the line geometry's drawn segment count — so it "draws as it plays" and scrubs
 * cleanly in both directions.
 */
function buildTrail(track: CommanderTrack): { points: THREE.Vector3[]; times: number[] } {
  const points: THREE.Vector3[] = []
  const times: number[] = []
  const drape = (p: LatLng) =>
    geodeticToVector3(p.lat, p.lng, ellipsoidSceneRadius(p.lat) + TRAIL_LIFT)

  for (const seg of track.segments) {
    if (seg.kind === 'rest') {
      points.push(drape(seg.at))
      times.push(seg.phaseIndex)
      continue
    }
    const path = seg.path
    const legs = path.length - 1
    for (let j = 0; j < legs; j++) {
      const a = geodeticToVector3(path[j].lat, path[j].lng).normalize()
      const b = geodeticToVector3(path[j + 1].lat, path[j + 1].lng).normalize()
      for (let s = 0; s < TRAIL_SUB; s++) {
        const v = slerpUnit(a, b, s / TRAIL_SUB)
        const { lat } = vector3ToGeodetic(v)
        points.push(v.clone().multiplyScalar(ellipsoidSceneRadius(lat) + TRAIL_LIFT))
        times.push(seg.phaseIndex + (j + s / TRAIL_SUB) / legs)
      }
    }
    points.push(drape(path[legs]))
    times.push(seg.phaseIndex + 1)
  }
  return { points, times }
}

/**
 * The journey protagonist (Grant / Napoleon) as a single gold command star with
 * an always-on name and a pulsing halo, gliding along his personal researched
 * path with a dashed gold trail that unspools behind him as the battle plays.
 */
export function CommanderMarker({ track, battle }: { track: CommanderTrack; battle: Battle }) {
  const groupRef = useRef<THREE.Group>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const trailGroupRef = useRef<THREE.Group>(null)
  const lineRef = useRef<Line2>(null)

  useEffect(ensureHaloStyle, [])

  const trail = useMemo(() => buildTrail(track), [track])

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

    // Reveal the trail up to the current phase-time.
    const { phaseIndex, phaseProgress } = playbackAt(battle, battleElapsed)
    const now = phaseIndex + phaseProgress
    let revealed = 0
    while (revealed < trail.times.length && trail.times[revealed] <= now) revealed++
    if (trailGroup) trailGroup.visible = revealed >= 2
    if (line) line.geometry.instanceCount = Math.max(0, revealed - 1)
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

      {/* Dashed gold trail, hidden until revealed in useFrame (no first-frame flash). */}
      <group ref={trailGroupRef} visible={false}>
        <Line
          ref={lineRef}
          points={trail.points}
          color={GOLD}
          lineWidth={2}
          dashed
          dashSize={0.0011}
          gapSize={0.0007}
          opacity={0.8}
          transparent
          toneMapped={false}
          depthTest={false}
          renderOrder={10}
        />
      </group>
    </group>
  )
}
