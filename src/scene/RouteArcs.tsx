import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Line } from '@react-three/drei'
import type { Line2 } from 'three-stdlib'
import type { Journey } from '../data/schema'
import { greatCirclePoints, latLngToVector3 } from '../lib/geo'
import { cameraAt, stopsForCamera } from '../lib/journeyCamera'
import { screenScale } from '../lib/screenScale'
import { useAppStore } from '../state/store'

/** Shared geometry builder — returns raw arc points (Vector3[]) for drei <Line>. */
function useRouteGeometry(journey: Journey): THREE.Vector3[] {
  return useMemo(() => {
    return journey.stops.slice(0, -1).flatMap((s, i) =>
      greatCirclePoints(s.coords, journey.stops[i + 1].coords, 48).slice(i ? 1 : 0))
  }, [journey])
}

/** Precomputed stop marker world positions — avoids per-frame Vector3 allocs. */
function useMarkerPositions(journey: Journey): THREE.Vector3[] {
  return useMemo(
    () => journey.stops.map((s) => latLngToVector3(s.coords.lat, s.coords.lng, 1.004)),
    [journey],
  )
}

/** Marker radius as a fraction of frustum half-height — constant screen size at any zoom. */
const MARKER_FRAC = 0.0135

/** Marker scale via the shared screen-size helper (see src/lib/screenScale.ts). */
function markerScale(camera: THREE.Camera, markerPos: THREE.Vector3): number {
  return screenScale(camera, markerPos, MARKER_FRAC, 0.0006, 0.016)
}

/**
 * progress: 0..1 portion of the route drawn solid (1 = all).
 * dim: optional override for hub-mode faintness. When omitted, hover state drives it.
 * onStopClick: when provided, markers become clickable and show pointer cursor on hover.
 */
export function RouteArcs({ journey, dim: dimProp, onStopClick }:
  { journey: Journey; dim?: boolean; onStopClick?: (i: number) => void }) {
  const hoverDim = useAppStore((s) => s.hoveredJourneyId !== journey.id)
  const lowPerf = useAppStore((s) => s.lowPerf)
  const dim = dimProp ?? hoverDim
  const pts = useRouteGeometry(journey)
  const markerPositions = useMarkerPositions(journey)

  // Refs for marker meshes — one per stop
  const markerRefs = useRef<(THREE.Mesh | null)[]>([])

  // Clear any stuck pointer cursor if the component unmounts while hovering.
  useEffect(() => () => { document.body.style.cursor = '' }, [])

  useFrame(({ camera }) => {
    // Battle mode dives the camera to the surface — even clamped markers
    // dominate the frame there, so hide them outright.
    const inBattle = useAppStore.getState().mode === 'battle'
    markerPositions.forEach((pos, i) => {
      const mesh = markerRefs.current[i]
      if (!mesh) return
      mesh.visible = !inBattle
      if (inBattle) return
      mesh.scale.setScalar(markerScale(camera, pos))
    })
  })

  return (
    <group>
      <Line
        points={pts}
        color={journey.color}
        lineWidth={dim ? 2 : 2.5}
        transparent
        opacity={dim ? 0.3 : 1}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        toneMapped={false}
        alphaToCoverage={!lowPerf} // A2C needs MSAA; without it (lowPerf) it dithers
      />
      {markerPositions.map((pos, i) => (
        <mesh
          key={i}
          ref={(el) => { markerRefs.current[i] = el }}
          position={pos}
          onClick={onStopClick ? (e) => { e.stopPropagation(); onStopClick(i) } : undefined}
          onPointerOver={onStopClick ? () => { document.body.style.cursor = 'pointer' } : undefined}
          onPointerOut={onStopClick ? () => { document.body.style.cursor = '' } : undefined}
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
 * at the active stop. Imperative useFrame reads journeyT — no per-frame React props.
 */
export function RouteArcsProgress({ journey }: { journey: Journey }) {
  const pts = useRouteGeometry(journey)
  const markerPositions = useMarkerPositions(journey)
  const lowPerf = useAppStore((s) => s.lowPerf)
  const lineRef = useRef<Line2>(null)
  const pulseRef = useRef<THREE.Mesh>(null)
  // Total segments = pts.length - 1
  const totalSegments = pts.length - 1

  const stops = useMemo(() => stopsForCamera(journey), [journey])

  useFrame(({ clock, camera }) => {
    const { journeyT: t, mode } = useAppStore.getState()
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
        const markerPos = markerPositions[cam.activeStop]
        pulseRef.current.position.copy(markerPos)
        const pulseFactor = 1 + 0.3 * Math.sin(clock.elapsedTime * 3)
        const sc = markerScale(camera, markerPos) * pulseFactor
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
        lineWidth={3.5}
        transparent
        opacity={1}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        toneMapped={false}
        alphaToCoverage={!lowPerf} // A2C needs MSAA; without it (lowPerf) it dithers
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
