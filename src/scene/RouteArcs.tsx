import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Line } from '@react-three/drei'
import type { Line2 } from 'three-stdlib'
import type { Journey, LatLng } from '../data/schema'
import { greatCirclePoints, latLngToVector3 } from '../lib/geo'
import { cameraAt, routeProgressAt, stopsForCamera } from '../lib/journeyCamera'
import { screenScale } from '../lib/screenScale'
import { useAppStore } from '../state/store'

/** Segments for a sub-hop ∝ great-circle angle (~125 km/segment), clamped [2,96] —
 *  even dot density and point-index ≈ arc length within a leg (keeps the fill synced). */
function routeSegs(a: LatLng, b: LatLng): number {
  const ang = latLngToVector3(a.lat, a.lng).normalize()
    .angleTo(latLngToVector3(b.lat, b.lng).normalize())
  return Math.max(2, Math.min(96, Math.round(ang / 0.02)))
}

/** Route polyline through each leg's [prev, ...via, this] waypoints, plus the
 *  points-array index of each stop (for the progressive fill). */
function useRouteGeometry(journey: Journey): { points: THREE.Vector3[]; legStarts: number[] } {
  return useMemo(() => {
    const points: THREE.Vector3[] = []
    const legStarts: number[] = [] // points index of each stop (length = stops.length)
    legStarts.push(0)
    for (let i = 0; i < journey.stops.length - 1; i++) {
      const wpts = [
        journey.stops[i].coords,
        ...(journey.stops[i + 1].via ?? []),
        journey.stops[i + 1].coords,
      ]
      for (let h = 0; h < wpts.length - 1; h++) {
        const sub = greatCirclePoints(wpts[h], wpts[h + 1], routeSegs(wpts[h], wpts[h + 1]))
        points.push(...(points.length ? sub.slice(1) : sub)) // dedupe shared endpoint
      }
      legStarts.push(points.length - 1) // stop i+1 is now the last point
    }
    return { points, legStarts }
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

/** Faint full-route dash sizing IN SCREEN PIXELS — scaled with camera distance so
 *  short clustered legs show even dots instead of a solid line. The world size is
 *  QUANTIZED to power-of-2 steps (see RouteArcs useFrame) so it holds constant
 *  through a zoom (no crawling dots), re-normalizing only at 2x thresholds. */
const ROUTE_DASH_PX = 3.5
const ROUTE_GAP_PX = 6.5

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
  // Hide the route entirely during battles — a journey line slicing across
  // the battlefield is distracting at battle framing.
  const inBattle = useAppStore((s) => s.mode === 'battle')
  const dim = dimProp ?? hoverDim
  const { points: pts } = useRouteGeometry(journey)
  const markerPositions = useMarkerPositions(journey)

  // Refs for marker meshes — one per stop
  const markerRefs = useRef<(THREE.Mesh | null)[]>([])
  const lineRef = useRef<Line2>(null)

  // Clear any stuck pointer cursor if the component unmounts while hovering.
  useEffect(() => () => { document.body.style.cursor = '' }, [])

  useFrame(({ camera, size }) => {
    // Screen-space dashes: scale world dash/gap by camera distance so the dots
    // stay a constant pixel size everywhere along the route.
    const line = lineRef.current
    if (line) {
      const dist = camera.position.length() // ≈ distance to the globe the route wraps
      const fov = ((camera as THREE.PerspectiveCamera).fov ?? 45) * (Math.PI / 180)
      const worldPerPx = (2 * dist * Math.tan(fov / 2)) / size.height
      // Snap to the nearest power-of-2 world scale: constant within a zoom level so
      // the dashes don't crawl while zooming; jumps once per 2x zoom, barely seen.
      const q = Math.pow(2, Math.round(Math.log2(worldPerPx)))
      const mat = line.material as unknown as { dashSize: number; gapSize: number }
      mat.dashSize = ROUTE_DASH_PX * q
      mat.gapSize = ROUTE_GAP_PX * q
    }
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
        ref={lineRef}
        points={pts}
        color={journey.color}
        lineWidth={dim ? 2 : 2.5}
        transparent
        opacity={dim ? 0.55 : 0.85}
        // Normal (not additive) blending so overlapping legs in dense campaign
        // clusters don't pile up into a solid white blob.
        blending={THREE.NormalBlending}
        depthWrite={false}
        toneMapped={false}
        dashed
        dashSize={ROUTE_DASH_PX * 0.0006}
        gapSize={ROUTE_GAP_PX * 0.0006}
        visible={!inBattle}
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
            opacity={dim ? 0.7 : 1}
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
  const { points: pts, legStarts } = useRouteGeometry(journey)
  const markerPositions = useMarkerPositions(journey)
  const lowPerf = useAppStore((s) => s.lowPerf)
  const inBattle = useAppStore((s) => s.mode === 'battle')
  const lineRef = useRef<Line2>(null)
  const pulseRef = useRef<THREE.Mesh>(null)

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

    // Fill the line to match the CAMERA's route position, not raw t:
    // routeProgressAt holds at each stop through its dwell window (line tip
    // sits exactly on the marker) and eases through travel like the camera.
    if (lineRef.current) {
      const hops = routeProgressAt(safeT, stops.length) // seg + travel-fraction
      const seg = Math.min(legStarts.length - 2, Math.floor(hops))
      const frac = hops - seg
      const drawn = Math.round(legStarts[seg] + frac * (legStarts[seg + 1] - legStarts[seg]))
      lineRef.current.geometry.instanceCount = Math.max(0, drawn)
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
        visible={!inBattle}
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
