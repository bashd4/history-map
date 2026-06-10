import { describe, expect, it } from 'vitest'
import { GLOBE_RADIUS, greatCirclePoints, latLngToVector3 } from './geo'

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
