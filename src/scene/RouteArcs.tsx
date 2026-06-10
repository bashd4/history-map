import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Line } from '@react-three/drei'
import type { Line2 } from 'three-stdlib'
import type { Journey } from '../data/schema'
import { greatCirclePoints, latLngToVector3 } from '../lib/geo'
import { cameraAt, stopsForCamera } from '../lib/journeyCamera'
import { useAppStore } from '../state/store'

/** Shared geometry builder — returns raw arc points (Vector3[]) for drei <Line>. */
function useRouteGeometry(journey: Journey): THREE.Vector3[] {
  return useMemo(() => {
    return journey.stops.slice(0, -1).flatMap((s, i) =>
      greatCirclePoints(s.coords, journey.stops[i + 1].coords, 48).slice(i ? 1 : 0))
  }, [journey])
}

/**
 * Scale a sphere mesh to a constant screen size based on camera distance.
 * factor: pixels-per-unit-distance approximation; tune clamps for comfort.
 */
function markerScale(camPos: THREE.Vector3, markerPos: THREE.Vector3): number {
  const d = camPos.distanceTo(markerPos)
  return THREE.MathUtils.clamp(d * 0.004, 0.0008, 0.009)
}

/**
 * progress: 0..1 portion of the route drawn solid (1 = all).
 * dim: optional override for hub-mode faintness. When omitted, hover state drives it.
 */
export function RouteArcs({ journey, dim: dimProp }:
  { journey: Journey; dim?: boolean }) {
  const hoverDim = useAppStore((s) => s.hoveredJourneyId !== journey.id)
  const dim = dimProp ?? hoverDim
  const pts = useRouteGeometry(journey)

  // Refs for marker meshes — one per stop
  const markerRefs = useRef<(THREE.Mesh | null)[]>([])

  useFrame(({ camera }) => {
    const camPos = camera.position
    journey.stops.forEach((s, i) => {
      const mesh = markerRefs.current[i]
      if (!mesh) return
      const pos = latLngToVector3(s.coords.lat, s.coords.lng, 1.004)
      const sc = markerScale(camPos, pos)
      mesh.scale.setScalar(sc)
    })
  })

  return (
    <group>
      <Line
        points={pts}
        color={journey.color}
        lineWidth={dim ? 1.5 : 2.5}
        transparent
        opacity={dim ? 0.3 : 1}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        toneMapped={false}
      />
      {journey.stops.map((s, i) => (
        <mesh
          key={i}
          ref={(el) => { markerRefs.current[i] = el }}
          position={latLngToVector3(s.coords.lat, s.coords.lng, 1.004)}
        >
          <sphereGeometry args={[1, 24, 24]} />
          <meshBasicMaterial
            color={journey.color}
            transparent
            opacity={dim ? 0.4 : 1}
          />
        </mesh>
      ))}
    </group>
  )
}

/**
 * Bright progressive arc drawn up to scroll position, with a pulsing marker
 * at the active stop. Imperative useFrame reads scrollT — no per-frame React props.
 */
export function RouteArcsProgress({ journey }: { journey: Journey }) {
  const pts = useRouteGeometry(journey)
  const lineRef = useRef<Line2>(null)
  const pulseRef = useRef<THREE.Mesh>(null)
  // Total segments = pts.length - 1
  const totalSegments = pts.length - 1

  const stops = stopsForCamera(journey)

  useFrame(({ clock, camera }) => {
    const { scrollT: t, mode } = useAppStore.getState()
    // Battle mode owns the camera near the surface — hide the pulse so it
    // doesn't keep animating under the battle view.
    if (mode === 'battle') {
      if (pulseRef.current) pulseRef.current.visible = false
      return
    }
    const safeT = Number.isFinite(t) ? Math.min(1, Math.max(0, t)) : 0

    // Control how many segments are drawn via instanceCount
    if (lineRef.current) {
      const drawnSegments = Math.max(0, Math.floor(safeT * totalSegments))
      lineRef.current.geometry.instanceCount = drawnSegments
    }

    // Pulse the active stop marker
    if (pulseRef.current) {
      const cam = cameraAt(safeT, stops)
      if (cam.activeStop != null) {
        const stop = journey.stops[cam.activeStop]
        const markerPos = latLngToVector3(stop.coords.lat, stop.coords.lng, 1.004)
        pulseRef.current.position.copy(markerPos)
        const pulseFactor = 1 + 0.3 * Math.sin(clock.elapsedTime * 3)
        const sc = markerScale(camera.position, markerPos) * pulseFactor
        pulseRef.current.scale.setScalar(sc)
        pulseRef.current.visible = true
      } else {
        pulseRef.current.visible = false
      }
    }
  })

  return (
    <group>
      <Line
        ref={lineRef}
        points={pts}
        color={journey.color}
        lineWidth={3}
        transparent
        opacity={1}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        toneMapped={false}
      />
      <mesh ref={pulseRef} visible={false}>
        <sphereGeometry args={[1, 24, 24]} />
        <meshBasicMaterial
          color={journey.color}
          transparent
          opacity={0.9}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </group>
  )
}
