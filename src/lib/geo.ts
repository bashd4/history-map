import * as THREE from 'three'
import type { LatLng } from '../data/schema'

export const GLOBE_RADIUS = 1

/**
 * Matches equirectangular texture mapping on THREE.SphereGeometry. Treats `lat`
 * as the spherical polar angle — correct for the sepia sphere and fine at
 * journey/hub zoom, but it does NOT agree with the Google 3D-Tiles globe at
 * close (battle) range: those tiles sit on the WGS84 *ellipsoid*, where geodetic
 * latitude differs from the spherical angle by up to ~0.19° (≈21 km) at
 * mid-latitudes. For anything that must register against the streamed tiles
 * (battle arrows, areas, the battle camera, terrain raycasts) use
 * `geodeticToVector3` instead. See geo.test.ts for the measured divergence.
 */
export function latLngToVector3(lat: number, lng: number, radius = GLOBE_RADIUS): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180)
  const theta = (lng + 180) * (Math.PI / 180)
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  )
}

// WGS84 ellipsoid — the datum Google Photorealistic 3D Tiles are authored on.
const WGS84_A = 6_378_137 // semi-major axis (m)
const WGS84_E2 = 0.00669437999014 // first eccentricity squared

/**
 * Convert geographic (geodetic) lat/lng to a scene-space direction that matches
 * where the Google 3D-Tiles renderer places that coordinate.
 *
 * The tiles group applies `scale 1/WGS84_A, rotation X(-90°)` to true ECEF
 * geometry, which maps ECEF (X,Y,Z) → scene (X/a, Z/a, -Y/a). We compute the
 * geodetic ECEF surface point on the WGS84 ellipsoid and apply the same map,
 * then normalise and scale to `radius`. The *direction* is what aligns battle
 * geometry with the tiles; absolute height is set later by terrain draping.
 *
 * Agrees with `latLngToVector3` exactly at the equator and poles (where geodetic
 * = geocentric) and diverges by up to ~21 km in between — see geo.test.ts.
 */
export function geodeticToVector3(lat: number, lng: number, radius = GLOBE_RADIUS): THREE.Vector3 {
  const la = lat * (Math.PI / 180)
  const lo = lng * (Math.PI / 180)
  const sinLa = Math.sin(la)
  const cosLa = Math.cos(la)
  const N = WGS84_A / Math.sqrt(1 - WGS84_E2 * sinLa * sinLa)
  const X = N * cosLa * Math.cos(lo)
  const Y = N * cosLa * Math.sin(lo)
  const Z = N * (1 - WGS84_E2) * sinLa
  // ECEF → scene: (X, Y, Z) → (X, Z, -Y); then normalise to a pure direction.
  return new THREE.Vector3(X, Z, -Y).normalize().multiplyScalar(radius)
}

/**
 * WGS84 ellipsoid surface radius in scene units (globe radius 1) at a geodetic
 * latitude — how far the ellipsoid surface sits from the scene centre there.
 * Use this to place billboarded battle markers on the surface deterministically
 * instead of per-frame terrain raycasts, whose miss-fallback (1.0, ~11 km above
 * the ellipsoid at mid-latitudes) flickers as a moving marker's ray hits/misses.
 */
export function ellipsoidSceneRadius(latDeg: number): number {
  const la = latDeg * (Math.PI / 180)
  const s = Math.sin(la)
  const c = Math.cos(la)
  const nOverA = 1 / Math.sqrt(1 - WGS84_E2 * s * s)
  return Math.hypot(nOverA * c, nOverA * (1 - WGS84_E2) * s)
}

/**
 * Inverse of `geodeticToVector3` (on unit directions): recover geographic
 * (geodetic) lat/lng from a scene-space vector. Exact bijection — feeding the
 * result back through `geodeticToVector3` reproduces the same direction, so
 * interpolated path points can be re-sampled for terrain height consistently.
 */
export function vector3ToGeodetic(v: THREE.Vector3): { lat: number; lng: number } {
  // scene (x, y, z) → ECEF (X, Y, Z) = (x, -z, y) (inverse of the map above).
  const X = v.x
  const Y = -v.z
  const Z = v.y
  const lng = Math.atan2(Y, X) * (180 / Math.PI)
  const hyp = Math.hypot(X, Y)
  // Surface point (h=0): Z/hyp = (1-e²)·tan(φ_geodetic) ⇒ recover φ_geodetic.
  const lat = Math.atan2(Z, hyp * (1 - WGS84_E2)) * (180 / Math.PI)
  return { lat, lng }
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

/**
 * Destination point on the unit sphere given an origin, compass bearing
 * (degrees, 0 = north, 90 = east), and angular distance in RADIANS.
 * Standard great-circle destination formula.
 */
export function offsetLatLng(origin: LatLng, bearingDeg: number, angularDist: number): LatLng {
  const DEG2RAD = Math.PI / 180
  const phi1 = origin.lat * DEG2RAD
  const lambda1 = origin.lng * DEG2RAD
  const theta = bearingDeg * DEG2RAD
  const delta = angularDist

  const phi2 = Math.asin(
    Math.sin(phi1) * Math.cos(delta) + Math.cos(phi1) * Math.sin(delta) * Math.cos(theta),
  )
  const lambda2 = lambda1 + Math.atan2(
    Math.sin(theta) * Math.sin(delta) * Math.cos(phi1),
    Math.cos(delta) - Math.sin(phi1) * Math.sin(phi2),
  )

  return {
    lat: phi2 / DEG2RAD,
    lng: ((lambda2 / DEG2RAD + 540) % 360) - 180, // normalise to [-180, 180)
  }
}

/** Point (unit vector) at arc-length fraction `tt`∈[0,1] along a polyline of unit
 *  vectors, paced by cumulative great-circle angle so speed is even across uneven
 *  hops. A 2-vertex input is a plain great-circle slerp. */
export function sampleArcByLength(verts: THREE.Vector3[], tt: number): THREE.Vector3 {
  if (verts.length <= 1) return verts[0].clone()
  const ang: number[] = []
  let total = 0
  for (let i = 0; i < verts.length - 1; i++) {
    const a = verts[i].angleTo(verts[i + 1])
    ang.push(a)
    total += a
  }
  if (total < 1e-9) return verts[0].clone()
  const target = Math.min(1, Math.max(0, tt)) * total
  let acc = 0
  for (let i = 0; i < ang.length; i++) {
    if (acc + ang[i] >= target || i === ang.length - 1) {
      const local = ang[i] < 1e-9 ? 0 : (target - acc) / ang[i]
      return slerpUnit(verts[i], verts[i + 1], local)
    }
    acc += ang[i]
  }
  return verts[verts.length - 1].clone()
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
