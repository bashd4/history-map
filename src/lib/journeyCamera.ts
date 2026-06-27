import { latLngToVector3, sampleArcByLength } from './geo'
import type { Journey, LatLng } from '../data/schema'

export const DWELL = 0.4
export const DWELL_ALT = 0.09   // ~570 km — city framing
export const CRUISE_ALT = 0.45  // pulled out for travel
const CARD_FADE = 0.25 // fraction of dwell window for opacity ramp in/out

export interface CameraState {
  lat: number
  lng: number
  altitude: number
  activeStop: number | null
  cardOpacity: number
}

/** Assumes a unit vector input; y is clamped against floating-point drift from slerp. */
function vecToLatLng(v: { x: number; y: number; z: number }): LatLng {
  const lat = 90 - (Math.acos(Math.max(-1, Math.min(1, v.y))) * 180) / Math.PI
  const lng = ((Math.atan2(v.z, -v.x) * 180) / Math.PI) - 180
  return { lat, lng: ((lng + 540) % 360) - 180 }
}

/** Per-journey cache of the stop array shape cameraAt expects — avoids a per-render .map(). */
const stopsCache = new WeakMap<Journey, Parameters<typeof cameraAt>[1]>()
export function stopsForCamera(journey: Journey): Parameters<typeof cameraAt>[1] {
  let stops = stopsCache.get(journey)
  if (!stops) {
    stops = journey.stops.map((s) => ({ ...s.coords, camera: s.camera, via: s.via }))
    stopsCache.set(journey, stops)
  }
  return stops
}

const ease = (t: number) => t * t * (3 - 2 * t) // smoothstep

/**
 * Fraction of the route, measured in HOPS (0..n-1), that should be drawn at
 * journey progress t. Mirrors cameraAt's dwell/travel model exactly: while
 * dwelling at stop i the value holds at i (line fills precisely to the
 * marker), and during travel it advances with the same smoothstep easing as
 * the camera — so the bright arc tip always tracks the camera's position.
 */
export function routeProgressAt(t: number, n: number): number {
  const tc = Math.min(1, Math.max(0, t))
  const seg = Math.min(n - 1, Math.floor(tc * n))
  const local = tc * n - seg
  if (seg >= n - 1 || local < DWELL) return seg
  return seg + ease((local - DWELL) / (1 - DWELL))
}

export function cameraAt(
  t: number,
  stops: Array<LatLng & { camera?: { altitude: number }; via?: LatLng[] }>,
): CameraState {
  const n = stops.length
  const tc = Math.min(1, Math.max(0, t))
  const seg = Math.min(n - 1, Math.floor(tc * n))
  const local = tc * n - seg
  const stop = stops[seg]
  const dwellAlt = stop.camera?.altitude ?? DWELL_ALT
  const isLast = seg === n - 1

  if (isLast || local < DWELL) {
    const d = isLast ? local : local / DWELL // 0..1 through the dwell window
    const fadeIn = Math.min(1, d / CARD_FADE)
    const fadeOut = isLast ? 1 : Math.min(1, (1 - d) / CARD_FADE)
    return { lat: stop.lat, lng: stop.lng, altitude: dwellAlt, activeStop: seg,
      cardOpacity: Math.min(fadeIn, fadeOut) }
  }

  const next = stops[seg + 1]
  const tt = ease((local - DWELL) / (1 - DWELL))
  const verts = [
    latLngToVector3(stop.lat, stop.lng).normalize(),
    ...(next.via ?? []).map((w) => latLngToVector3(w.lat, w.lng).normalize()),
    latLngToVector3(next.lat, next.lng).normalize(),
  ]
  const p = sampleArcByLength(verts, tt)
  const nextAlt = next.camera?.altitude ?? DWELL_ALT
  const base = tt < 0.5 ? dwellAlt : nextAlt
  const altitude = base + (CRUISE_ALT - base) * Math.sin(Math.PI * tt)
  const { lat, lng } = vecToLatLng(p)
  return { lat, lng, altitude, activeStop: null, cardOpacity: 0 }
}
