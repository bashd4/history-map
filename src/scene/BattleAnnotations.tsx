import { useMemo, type CSSProperties } from 'react'
import { Html, Line } from '@react-three/drei'
import * as THREE from 'three'
import type { Battle } from '../data/schema'
import { latLngToVector3, slerpUnit } from '../lib/geo'
import { playbackAt } from '../lib/battlePlayback'
import { useAppStore } from '../state/store'

// Just above the arrow layer's surface footprint, below the camera.
const LABEL_ALT = 1.0008
// Area outline sits slightly below the label altitude
const OUTLINE_ALT = 1.0006

/** Number of slerp subdivisions per outline edge to follow globe curvature */
const SEGS_PER_EDGE = 8

const KIND_COLOR: Record<string, string> = {
  terrain: '#cfc4ab',
  water: '#9fc4d4',
  woods: '#9fb892',
  settlement: '#e8dcc3',
}

const baseLabelStyle: CSSProperties = {
  fontFamily: "Georgia, 'Times New Roman', serif",
  whiteSpace: 'nowrap',
  textShadow: '0 1px 3px rgba(0,0,0,.95), 0 0 8px rgba(0,0,0,.7)',
  userSelect: 'none',
  transform: 'translate(-50%, -50%)',
}

/**
 * Build a closed, slerp-subdivided outline loop for an area at the given radius.
 * The loop is closed by appending the first interpolated segment back to origin.
 */
function buildOutlineLoop(outline: Array<{ lat: number; lng: number }>, radius: number): THREE.Vector3[] {
  const unitVerts = outline.map((p) => latLngToVector3(p.lat, p.lng).normalize())
  const pts: THREE.Vector3[] = []
  const n = unitVerts.length
  for (let i = 0; i < n; i++) {
    const a = unitVerts[i]
    const b = unitVerts[(i + 1) % n]
    for (let s = 0; s < SEGS_PER_EDGE; s++) {
      pts.push(slerpUnit(a, b, s / SEGS_PER_EDGE).multiplyScalar(radius))
    }
  }
  // close the loop
  pts.push(pts[0].clone())
  return pts
}

/**
 * Compute centroid of outline as the normalised average of unit vectors,
 * then lift to the given radius.
 */
function outlineCentroid(outline: Array<{ lat: number; lng: number }>, radius: number): THREE.Vector3 {
  const sum = new THREE.Vector3()
  for (const p of outline) {
    sum.add(latLngToVector3(p.lat, p.lng).normalize())
  }
  return sum.normalize().multiplyScalar(radius)
}

/**
 * Area outlines + phase-event labels for battle mode. DOM labels via drei <Html>
 * (constant screen size, no pointer events). Mounted only while a battle is active.
 */
export function BattleAnnotations({ battle }: { battle: Battle }) {
  const battleElapsed = useAppStore((s) => s.battleElapsed)
  const { phaseIndex: currentPhase, done } = playbackAt(battle, battleElapsed)

  const areas = useMemo(
    () =>
      (battle.areas ?? []).map((area) => ({
        ...area,
        loop: buildOutlineLoop(area.outline, OUTLINE_ALT),
        centroid: outlineCentroid(area.outline, LABEL_ALT),
        color: KIND_COLOR[area.kind ?? 'terrain'] ?? KIND_COLOR.terrain,
      })),
    [battle],
  )

  const events = useMemo(() => {
    const out: Array<{ phaseIndex: number; label: string; pos: THREE.Vector3 }> = []
    battle.phases.forEach((phase, phaseIndex) => {
      for (const ev of phase.events ?? []) {
        out.push({
          phaseIndex,
          label: ev.label,
          pos: latLngToVector3(ev.coords.lat, ev.coords.lng, LABEL_ALT),
        })
      }
    })
    return out
  }, [battle])

  return (
    <group>
      {/* Area outlines — always visible during battle */}
      {areas.map((area) => (
        <group key={area.name}>
          <Line
            points={area.loop}
            color={area.color}
            lineWidth={1.5}
            dashed
            dashSize={0.0008}
            gapSize={0.0005}
            opacity={0.55}
            transparent
            toneMapped={false}
            depthTest={false}
            renderOrder={9}
          />
          <group position={area.centroid}>
            <Html zIndexRange={[15, 0]} style={{ pointerEvents: 'none' }}>
              <span style={{
                ...baseLabelStyle,
                fontStyle: 'italic',
                fontSize: '11px',
                color: area.color,
                display: 'inline-block',
              }}>
                {area.name}
              </span>
            </Html>
          </group>
        </group>
      ))}

      {/* Events — visible once their phase is current or past; past fades to 60% */}
      {events.map((ev, i) => {
        if (ev.phaseIndex > currentPhase) return null
        const isPast = ev.phaseIndex < currentPhase || done
        return (
          <group key={`${ev.phaseIndex}-${i}`} position={ev.pos}>
            <Html zIndexRange={[15, 0]} style={{ pointerEvents: 'none' }}>
              <span style={{
                ...baseLabelStyle,
                fontSize: '11px',
                color: '#e8b54a',
                opacity: isPast ? 0.6 : 1,
                display: 'inline-block',
                transform: 'translate(6px, -50%)',
              }}>
                ✶ {ev.label}
              </span>
            </Html>
          </group>
        )
      })}
    </group>
  )
}
