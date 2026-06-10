import * as THREE from 'three'
import type { LatLng } from '../data/schema'

export const GLOBE_RADIUS = 1

/** Matches equirectangular texture mapping on THREE.SphereGeometry. */
export function latLngToVector3(lat: number, lng: number, radius = GLOBE_RADIUS): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180)
  const theta = (lng + 180) * (Math.PI / 180)
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  )
}

/**
 * Spherical interpolation between two unit vectors (assumes |a| = |b| = 1).
 * Undefined for antipodal inputs (angle ≈ π) — no v1 route needs one.
 */
export function slerpUnit(a: THREE.Vector3, b: THREE.Vector3, t: number): THREE.Vector3 {
  const angle = a.angleTo(b)
  if (angle < 1e-6) return a.clone()
  const s = Math.sin(angle)
  return a.clone().multiplyScalar(Math.sin((1 - t) * angle) / s)
    .add(b.clone().multiplyScalar(Math.sin(t * angle) / s))
}

/** Great-circle arc lifted off the surface; lift scales with arc length. */
export function greatCirclePoints(from: LatLng, to: LatLng, segments = 64, lift = 0.05): THREE.Vector3[] {
  const a = latLngToVector3(from.lat, from.lng).normalize()
  const b = latLngToVector3(to.lat, to.lng).normalize()
  const angle = a.angleTo(b)
  const pts: THREE.Vector3[] = []
  for (let i = 0; i <= segments; i++) {
    const t = i / segments
    const r = GLOBE_RADIUS * (1.002 + lift * Math.max(angle, 0.15) * Math.sin(Math.PI * t))
    pts.push(slerpUnit(a, b, t).multiplyScalar(r))
  }
  return pts
}
