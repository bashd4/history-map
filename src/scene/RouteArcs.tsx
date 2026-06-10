import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { Journey } from '../data/schema'
import { greatCirclePoints, latLngToVector3 } from '../lib/geo'
import { cameraAt, stopsForCamera } from '../lib/journeyCamera'
import { useAppStore } from '../state/store'

/** Shared geometry builder — avoids duplicating the arc/pts logic. */
function useRouteGeometry(journey: Journey) {
  return useMemo(() => {
    const pts = journey.stops.slice(0, -1).flatMap((s, i) =>
      greatCirclePoints(s.coords, journey.stops[i + 1].coords, 48).slice(i ? 1 : 0))
    const curve = new THREE.CatmullRomCurve3(pts)
    const totalLen = pts.length
    const geometry = new THREE.TubeGeometry(curve, totalLen * 2, 0.0035, 8, false)
    return { geometry, indexCount: geometry.index!.count }
  }, [journey])
}

/**
 * progress: 0..1 portion of the route drawn solid (1 = all).
 * dim: optional override for hub-mode faintness. When omitted, hover state drives it:
 * the hovered journey renders bright, everything else (including hub at rest) dim.
 */
export function RouteArcs({ journey, dim: dimProp }:
  { journey: Journey; dim?: boolean }) {
  const hoverDim = useAppStore((s) => s.hoveredJourneyId !== journey.id)
  const dim = dimProp ?? hoverDim
  const { geometry, indexCount } = useRouteGeometry(journey)

  // Full route (progress=1 always)
  geometry.setDrawRange(0, indexCount)

  useEffect(() => () => geometry.dispose(), [geometry])

  return (
    <group>
      <mesh geometry={geometry}>
        <meshBasicMaterial color={journey.color} transparent
          opacity={dim ? 0.25 : 1} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      {journey.stops.map((s, i) => (
        <mesh key={i} position={latLngToVector3(s.coords.lat, s.coords.lng, 1.004)}>
          <sphereGeometry args={[0.008, 16, 16]} />
          <meshBasicMaterial color={journey.color} transparent opacity={dim ? 0.4 : 1} />
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
  const { geometry, indexCount } = useRouteGeometry(journey)
  const meshRef = useRef<THREE.Mesh>(null)
  const pulseRef = useRef<THREE.Mesh>(null)

  useEffect(() => () => geometry.dispose(), [geometry])

  const stops = stopsForCamera(journey)

  useFrame(({ clock }) => {
    const t = useAppStore.getState().scrollT
    const safeT = Number.isFinite(t) ? Math.min(1, Math.max(0, t)) : 0

    // Update draw range imperatively
    if (meshRef.current) {
      const drawn = Math.floor(indexCount * safeT)
      meshRef.current.geometry.setDrawRange(0, drawn)
    }

    // Pulse the active stop marker
    if (pulseRef.current) {
      const cam = cameraAt(safeT, stops)
      if (cam.activeStop != null) {
        const stop = journey.stops[cam.activeStop]
        const pos = latLngToVector3(stop.coords.lat, stop.coords.lng, 1.004)
        pulseRef.current.position.copy(pos)
        const scale = 1 + 0.3 * Math.sin(clock.elapsedTime * 3)
        pulseRef.current.scale.setScalar(scale)
        pulseRef.current.visible = true
      } else {
        pulseRef.current.visible = false
      }
    }
  })

  return (
    <group>
      <mesh ref={meshRef} geometry={geometry}>
        <meshBasicMaterial color={journey.color} transparent
          opacity={1} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      <mesh ref={pulseRef} visible={false}>
        <sphereGeometry args={[0.012, 16, 16]} />
        <meshBasicMaterial color={journey.color} transparent opacity={0.9} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
    </group>
  )
}
