import { useMemo, type CSSProperties } from 'react'
import { Html, Line } from '@react-three/drei'
import * as THREE from 'three'
import type { Battle } from '../data/schema'
import { latLngToVector3, slerpUnit } from '../lib/geo'
import { playbackAt } from '../lib/battlePlayback'
import { useAppStore } from '../state/store'
import { terrainSampler, useTerrainHeightsVersion } from './useTerrainHeights'

// Clearance above sampled terrain surface for outlines (~250 m) and labels (~500 m).
const OUTLINE_CLEARANCE = 0.00004
const LABEL_CLEARANCE = 0.00008

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
 * Helper: recover approximate (lat, lng) from a unit THREE.Vector3 generated
 * by latLngToVector3 / slerpUnit.  Used to look up sampled terrain height.
 */
function vec3ToLatLng(v: THREE.Vector3): { lat: number; lng: number } {
  const lat = Math.asin(Math.max(-1, Math.min(1, v.y))) * (180 / Math.PI)
  const lng = Math.atan2(v.z, -v.x) * (180 / Math.PI)
  return { lat, lng }
}

/**
 * Build a closed, slerp-subdivided outline loop for an area, draped onto terrain.
 * Each interpolated point is lifted to sampledRadius + OUTLINE_CLEARANCE.
 */
function buildOutlineLoop(outline: Array<{ lat: number; lng: number }>): THREE.Vector3[] {
  const unitVerts = outline.map((p) => latLngToVector3(p.lat, p.lng).normalize())
  const pts: THREE.Vector3[] = []
  const n = unitVerts.length
  for (let i = 0; i < n; i++) {
    const a = unitVerts[i]
    const b = unitVerts[(i + 1) % n]
    for (let s = 0; s < SEGS_PER_EDGE; s++) {
      const v = slerpUnit(a, b, s / SEGS_PER_EDGE)
      const { lat, lng } = vec3ToLatLng(v)
      const r = terrainSampler.sampleRadius(lat, lng) + OUTLINE_CLEARANCE
      pts.push(v.clone().multiplyScalar(r))
    }
  }
  // close the loop
  pts.push(pts[0].clone())
  return pts
}

/**
 * Collect all (lat, lng) points needed for all areas, for pre-registering
 * with the terrain sampler.
 */
function allAreaPoints(areas: Array<{ outline: Array<{ lat: number; lng: number }> }>): Array<{ lat: number; lng: number }> {
  const out: Array<{ lat: number; lng: number }> = []
  for (const area of areas) {
    const unitVerts = area.outline.map((p) => latLngToVector3(p.lat, p.lng).normalize())
    const n = unitVerts.length
    for (let i = 0; i < n; i++) {
      const a = unitVerts[i]
      const b = unitVerts[(i + 1) % n]
      for (let s = 0; s < SEGS_PER_EDGE; s++) {
        out.push(vec3ToLatLng(slerpUnit(a, b, s / SEGS_PER_EDGE)))
      }
    }
    // centroid
    const sum = new THREE.Vector3()
    for (const p of area.outline) sum.add(latLngToVector3(p.lat, p.lng).normalize())
    out.push(vec3ToLatLng(sum.normalize()))
  }
  return out
}

/**
 * Compute centroid of outline as the normalised average of unit vectors,
 * then lift to sampledRadius + LABEL_CLEARANCE.
 */
function outlineCentroid(outline: Array<{ lat: number; lng: number }>): THREE.Vector3 {
  const sum = new THREE.Vector3()
  for (const p of outline) {
    sum.add(latLngToVector3(p.lat, p.lng).normalize())
  }
  const unit = sum.normalize()
  const { lat, lng } = vec3ToLatLng(unit)
  const r = terrainSampler.sampleRadius(lat, lng) + LABEL_CLEARANCE
  return unit.clone().multiplyScalar(r)
}

/**
 * Area outlines + phase-event labels for battle mode. DOM labels via drei <Html>
 * (constant screen size, no pointer events). Mounted only while a battle is active.
 */
export function BattleAnnotations({ battle }: { battle: Battle }) {
  const battleElapsed = useAppStore((s) => s.battleElapsed)
  const { phaseIndex: currentPhase } = playbackAt(battle, battleElapsed)
  const heightsVersion = useTerrainHeightsVersion()

  // Pre-register area and event points with the terrain sampler so they stay cached.
  useMemo(() => {
    const rawAreas = battle.areas ?? []
    const areaPoints = allAreaPoints(rawAreas)
    const eventPoints = battle.phases.flatMap((phase) =>
      (phase.events ?? []).map((ev) => ({ lat: ev.coords.lat, lng: ev.coords.lng }))
    )
    terrainSampler.registerPoints('annotations', [...areaPoints, ...eventPoints])
  }, [battle])

  const areas = useMemo(
    () =>
      (battle.areas ?? []).map((area) => ({
        ...area,
        loop: buildOutlineLoop(area.outline),
        centroid: outlineCentroid(area.outline),
        color: KIND_COLOR[area.kind ?? 'terrain'] ?? KIND_COLOR.terrain,
      })),
    // heightsVersion triggers a rebuild when terrain data refreshes
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [battle, heightsVersion],
  )

  const events = useMemo(() => {
    const out: Array<{ phaseIndex: number; label: string; pos: THREE.Vector3 }> = []
    battle.phases.forEach((phase, phaseIndex) => {
      for (const ev of phase.events ?? []) {
        const r = terrainSampler.sampleRadius(ev.coords.lat, ev.coords.lng) + LABEL_CLEARANCE
        out.push({
          phaseIndex,
          label: ev.label,
          pos: latLngToVector3(ev.coords.lat, ev.coords.lng, r),
        })
      }
    })
    return out
  // heightsVersion triggers a rebuild when terrain data refreshes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [battle, heightsVersion])

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
                opacity: 0.7,
                display: 'inline-block',
              }}>
                {area.name}
              </span>
            </Html>
          </group>
        </group>
      ))}

      {/* Events — current phase only; past events are hidden to reduce clutter.
          When done=true (playback finished), show only the final phase's events. */}
      {events.map((ev, i) => {
        // Only show events belonging to the current phase
        if (ev.phaseIndex !== currentPhase) return null
        return (
          <group key={`${ev.phaseIndex}-${i}`} position={ev.pos}>
            <Html zIndexRange={[15, 0]} style={{ pointerEvents: 'none' }}>
              <span style={{
                ...baseLabelStyle,
                fontSize: '11px',
                color: '#e8b54a',
                opacity: 1,
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
