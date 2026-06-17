import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import {
  GLOBE_RADIUS,
  geodeticToVector3,
  greatCirclePoints,
  latLngToVector3,
  offsetLatLng,
  vector3ToGeodetic,
} from './geo'

/**
 * Independent reference: where the Google 3D-Tiles renderer actually places a
 * geodetic coordinate. Tiles are true ECEF (WGS84) under a group transform of
 * scale 1/a + rotationX(-90°), i.e. ECEF (X,Y,Z) → scene (X/a, Z/a, -Y/a).
 * Computed from first principles here so the test can't drift with the
 * implementation it checks.
 */
function ecefTileSceneDir(lat: number, lng: number): THREE.Vector3 {
  const a = 6378137, e2 = 0.00669437999014, D2R = Math.PI / 180
  const la = lat * D2R, lo = lng * D2R
  const N = a / Math.sqrt(1 - e2 * Math.sin(la) ** 2)
  const X = N * Math.cos(la) * Math.cos(lo)
  const Y = N * Math.cos(la) * Math.sin(lo)
  const Z = N * (1 - e2) * Math.sin(la)
  return new THREE.Vector3(X / a, Z / a, -Y / a).normalize()
}

// Angular gap between two unit directions, expressed as ground distance (km).
function groundGapKm(u: THREE.Vector3, v: THREE.Vector3): number {
  return u.angleTo(v) * 6371
}

describe('geodeticToVector3 (tiles alignment)', () => {
  // The battles span ~32°–49°N; every authored coordinate must register with
  // the streamed tiles, so the placement function must match ECEF, not a sphere.
  const sites: Array<[string, number, number]> = [
    ['Fort Donelson', 36.5, -87.86],
    ['Shiloh', 35.14, -88.34],
    ['Vicksburg', 32.35, -90.87],
    ['Chattanooga', 35.05, -85.31],
    ['Austerlitz', 49.13, 16.76],
  ]

  it.each(sites)('places %s within 5 m of the real ECEF tile position', (_name, lat, lng) => {
    const got = geodeticToVector3(lat, lng).normalize()
    const ref = ecefTileSceneDir(lat, lng)
    // 5 m at ground scale is ~0.000045° — far tighter than any tile feature.
    expect(groundGapKm(got, ref) * 1000).toBeLessThan(5)
  })

  it('agrees with the spherical mapping ONLY at the equator and poles', () => {
    for (const lng of [-90, 0, 16.76]) {
      expect(groundGapKm(geodeticToVector3(0, lng).normalize(), latLngToVector3(0, lng).normalize()))
        .toBeLessThan(0.001)
    }
    expect(groundGapKm(geodeticToVector3(90, 0).normalize(), latLngToVector3(90, 0).normalize()))
      .toBeLessThan(0.001)
  })

  it('REGRESSION GUARD: spherical placement is ~20 km off at battle latitudes', () => {
    // If anyone "simplifies" the battle layer back to latLngToVector3, this fails.
    // This is the exact bug that put gunboats off the river three times.
    for (const [, lat, lng] of sites) {
      const gap = groundGapKm(
        geodeticToVector3(lat, lng).normalize(),
        latLngToVector3(lat, lng).normalize(),
      )
      expect(gap).toBeGreaterThan(18)
      expect(gap).toBeLessThan(23)
    }
  })

  it('round-trips through vector3ToGeodetic to <1e-6°', () => {
    for (const [, lat, lng] of sites) {
      const { lat: rlat, lng: rlng } = vector3ToGeodetic(geodeticToVector3(lat, lng))
      expect(rlat).toBeCloseTo(lat, 6)
      expect(rlng).toBeCloseTo(lng, 6)
    }
  })

  it('respects the radius argument', () => {
    expect(geodeticToVector3(36.5, -87.86, 1.012).length()).toBeCloseTo(1.012, 9)
  })
})

describe('latLngToVector3', () => {
  it('puts the north pole at +Y', () => {
    const v = latLngToVector3(90, 0)
    expect(v.y).toBeCloseTo(1); expect(v.x).toBeCloseTo(0); expect(v.z).toBeCloseTo(0)
  })
  it('puts equator points on the XZ plane at the right radius', () => {
    const v = latLngToVector3(0, 45, 2)
    expect(v.y).toBeCloseTo(0); expect(v.length()).toBeCloseTo(2)
  })
})

describe('greatCirclePoints', () => {
  const paris = { lat: 48.85, lng: 2.35 }
  const moscow = { lat: 55.75, lng: 37.61 }
  it('starts and ends just above the surface', () => {
    const pts = greatCirclePoints(paris, moscow)
    expect(pts[0].length()).toBeCloseTo(GLOBE_RADIUS * 1.002, 3)
    expect(pts.at(-1)!.length()).toBeCloseTo(GLOBE_RADIUS * 1.002, 3)
  })
  it('arcs above the surface at the midpoint', () => {
    const pts = greatCirclePoints(paris, moscow)
    expect(pts[Math.floor(pts.length / 2)].length()).toBeGreaterThan(GLOBE_RADIUS * 1.01)
  })
  it('returns segments+1 points', () => {
    expect(greatCirclePoints(paris, moscow, 32)).toHaveLength(33)
  })
})

describe('offsetLatLng', () => {
  const RAD2DEG = 180 / Math.PI
  it('due north from equator by 0.1 rad ≈ +5.73° lat', () => {
    const r = offsetLatLng({ lat: 0, lng: 0 }, 0, 0.1)
    expect(r.lat).toBeCloseTo(0.1 * RAD2DEG, 1)
    expect(r.lng).toBeCloseTo(0, 3)
  })
  it('due east from (0,0) by 0.1 rad ≈ +5.73° lng', () => {
    const r = offsetLatLng({ lat: 0, lng: 0 }, 90, 0.1)
    expect(r.lat).toBeCloseTo(0, 3)
    expect(r.lng).toBeCloseTo(0.1 * RAD2DEG, 1)
  })
  it('due south decreases lat, keeps lng', () => {
    const r = offsetLatLng({ lat: 10, lng: 20 }, 180, 0.05)
    expect(r.lat).toBeLessThan(10)
    expect(r.lng).toBeCloseTo(20, 1)
  })
  it('zero distance returns the origin', () => {
    const r = offsetLatLng({ lat: 49.128, lng: 16.762 }, 45, 0)
    expect(r.lat).toBeCloseTo(49.128, 5)
    expect(r.lng).toBeCloseTo(16.762, 5)
  })
  it('round-trip along a meridian is exact (no convergence)', () => {
    const origin = { lat: 49.128, lng: 16.762 }
    const fwd = offsetLatLng(origin, 0, 0.05)
    const back = offsetLatLng(fwd, 180, 0.05)
    expect(back.lat).toBeCloseTo(origin.lat, 6)
    expect(back.lng).toBeCloseTo(origin.lng, 6)
  })
  it('round-trip with oblique bearing returns near the origin (within convergence error)', () => {
    // Reversing the start bearing is only approximate on a sphere — meridian
    // convergence at 49°N over 0.05 rad gives ~0.15° of drift. Sanity bound only.
    const origin = { lat: 49.128, lng: 16.762 }
    const fwd = offsetLatLng(origin, 250, 0.05)
    const back = offsetLatLng(fwd, (250 + 180) % 360, 0.05)
    expect(back.lat).toBeCloseTo(origin.lat, 0)
    expect(back.lng).toBeCloseTo(origin.lng, 0)
  })
})
