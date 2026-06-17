import { useMemo, useRef, type CSSProperties } from 'react'
import { Html, Line } from '@react-three/drei'
import * as THREE from 'three'
import type { Battle } from '../data/schema'
import { geodeticToVector3, slerpUnit, vector3ToGeodetic } from '../lib/geo'
import { playbackAt } from '../lib/battlePlayback'
import { useAppStore } from '../state/store'
import { terrainSampler, useTerrainHeightsVersion } from './useTerrainHeights'

// Clearance above sampled terrain surface for outlines (~65 m) and labels (~130 m).
// depthTest is false so nothing gets buried visually at these tight clearances.
const OUTLINE_CLEARANCE = 0.00001
const LABEL_CLEARANCE = 0.00002

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
 * Build a closed, slerp-subdivided outline loop for an area, draped onto terrain.
 * Each interpolated point is lifted to sampledRadius + OUTLINE_CLEARANCE.
 * Uses geodeticToVector3 so outlines register with the streamed tiles (the
 * spherical mapping lands ~20 km off at battle latitudes — see geo.ts).
 */
function buildOutlineLoop(outline: Array<{ lat: number; lng: number }>): THREE.Vector3[] {
  const unitVerts = outline.map((p) => geodeticToVector3(p.lat, p.lng).normalize())
  const pts: THREE.Vector3[] = []
  const n = unitVerts.length
  for (let i = 0; i < n; i++) {
    const a = unitVerts[i]
    const b = unitVerts[(i + 1) % n]
    for (let s = 0; s < SEGS_PER_EDGE; s++) {
      const v = slerpUnit(a, b, s / SEGS_PER_EDGE)
      const { lat, lng } = vector3ToGeodetic(v)
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
    const unitVerts = area.outline.map((p) => geodeticToVector3(p.lat, p.lng).normalize())
    const n = unitVerts.length
    for (let i = 0; i < n; i++) {
      const a = unitVerts[i]
      const b = unitVerts[(i + 1) % n]
      for (let s = 0; s < SEGS_PER_EDGE; s++) {
        out.push(vector3ToGeodetic(slerpUnit(a, b, s / SEGS_PER_EDGE)))
      }
    }
    // centroid
    const sum = new THREE.Vector3()
    for (const p of area.outline) sum.add(geodeticToVector3(p.lat, p.lng).normalize())
    out.push(vector3ToGeodetic(sum.normalize()))
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
    sum.add(geodeticToVector3(p.lat, p.lng).normalize())
  }
  const unit = sum.normalize()
  const { lat, lng } = vector3ToGeodetic(unit)
  const r = terrainSampler.sampleRadius(lat, lng) + LABEL_CLEARANCE
  return unit.clone().multiplyScalar(r)
}

/**
 * Transparent triangle-fan fill over an area — an invisible hover target so the
 * whole area region (not just its thin outline) reveals the name on hover.
 */
function buildAreaFill(outline: Array<{ lat: number; lng: number }>): THREE.BufferGeometry {
  const center = new THREE.Vector3()
  const verts = outline.map((p) => geodeticToVector3(p.lat, p.lng).normalize())
  for (const v of verts) center.add(v)
  center.normalize()
  const drape = (u: THREE.Vector3) => {
    const { lat, lng } = vector3ToGeodetic(u)
    return u.clone().multiplyScalar(terrainSampler.sampleRadius(lat, lng) + OUTLINE_CLEARANCE)
  }
  const c = drape(center)
  const pos: number[] = []
  for (let i = 0; i < verts.length; i++) {
    const a = drape(verts[i])
    const b = drape(verts[(i + 1) % verts.length])
    pos.push(c.x, c.y, c.z, a.x, a.y, a.z, b.x, b.y, b.z)
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  return geo
}

/** One area: dashed outline (always), hover-fill that reveals the name. */
function AreaAnnotation({
  loop, fill, centroid, name, color,
}: {
  loop: THREE.Vector3[]
  fill: THREE.BufferGeometry
  centroid: THREE.Vector3
  name: string
  color: string
}) {
  const nameRef = useRef<HTMLSpanElement>(null)
  return (
    <group>
      <Line
        points={loop}
        color={color}
        lineWidth={1.5}
        dashed
        dashSize={0.0008}
        gapSize={0.0005}
        opacity={0.5}
        transparent
        toneMapped={false}
        depthTest={false}
        renderOrder={9}
      />
      {/* invisible hover target covering the area interior */}
      <mesh
        geometry={fill}
        renderOrder={8}
        onPointerOver={() => {
          if (nameRef.current) nameRef.current.style.opacity = '0.8'
          document.body.style.cursor = 'pointer'
        }}
        onPointerOut={() => {
          if (nameRef.current) nameRef.current.style.opacity = '0'
          document.body.style.cursor = ''
        }}
      >
        <meshBasicMaterial transparent opacity={0} depthWrite={false} depthTest={false} />
      </mesh>
      <group position={centroid}>
        <Html zIndexRange={[14, 0]} style={{ pointerEvents: 'none' }}>
          <span ref={nameRef} style={{
            ...baseLabelStyle,
            opacity: 0,
            fontStyle: 'italic',
            fontSize: '11px',
            color,
            background: 'rgba(16,12,8,0.6)',
            padding: '1px 6px',
            borderRadius: '3px',
            display: 'inline-block',
          }}>
            {name}
          </span>
        </Html>
      </group>
    </group>
  )
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
        fill: buildAreaFill(area.outline),
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
          pos: geodeticToVector3(ev.coords.lat, ev.coords.lng, r),
        })
      }
    })
    return out
  // heightsVersion triggers a rebuild when terrain data refreshes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [battle, heightsVersion])

  return (
    <group>
      {/* Area outlines always visible; the name appears only on hover, so the
          default map stays clean (just shapes). */}
      {areas.map((area) => (
        <AreaAnnotation
          key={area.name}
          loop={area.loop}
          fill={area.fill}
          centroid={area.centroid}
          name={area.name}
          color={area.color}
        />
      ))}

      {/* Events — current phase only; past events are hidden to reduce clutter.
          When done=true (playback finished), show only the final phase's events. */}
      {events.map((ev, i) => {
        // Only show events belonging to the current phase
        if (ev.phaseIndex !== currentPhase) return null
        return (
          <group key={`${ev.phaseIndex}-${i}`} position={ev.pos}>
            <Html zIndexRange={[15, 0]} style={{ pointerEvents: 'none' }}>
              {/* Events are key moments — gold chip, pops. */}
              <span style={{
                ...baseLabelStyle,
                fontSize: '11px',
                color: '#f3d089',
                background: 'rgba(16,12,8,0.86)',
                border: '1px solid rgba(232,181,74,0.5)',
                boxShadow: '0 1px 4px rgba(0,0,0,0.55)',
                padding: '2px 8px',
                borderRadius: '4px',
                display: 'inline-block',
                // Lift events above the unit-label column so they don't collide.
                transform: 'translate(6px, calc(-50% - 34px))',
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
