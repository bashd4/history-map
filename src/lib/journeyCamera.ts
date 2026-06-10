import { latLngToVector3, slerpUnit } from './geo'
import type { LatLng } from '../data/schema'

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

const ease = (t: number) => t * t * (3 - 2 * t) // smoothstep

export function cameraAt(
  t: number,
  stops: Array<LatLng & { camera?: { altitude: number } }>,
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
  const p = slerpUnit(
    latLngToVector3(stop.lat, stop.lng).normalize(),
    latLngToVector3(next.lat, next.lng).normalize(),
    tt,
  )
  const nextAlt = next.camera?.altitude ?? DWELL_ALT
  const base = tt < 0.5 ? dwellAlt : nextAlt
  const altitude = base + (CRUISE_ALT - base) * Math.sin(Math.PI * tt)
  const { lat, lng } = vecToLatLng(p)
  return { lat, lng, altitude, activeStop: null, cardOpacity: 0 }
}
