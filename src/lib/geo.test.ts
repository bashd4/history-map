import { describe, expect, it } from 'vitest'
import { GLOBE_RADIUS, greatCirclePoints, latLngToVector3, offsetLatLng } from './geo'

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
