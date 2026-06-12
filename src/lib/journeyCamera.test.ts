import { describe, expect, it } from 'vitest'
import { cameraAt, DWELL, routeProgressAt } from './journeyCamera'

const stops = [
  { lat: 0, lng: 0 },   // A
  { lat: 0, lng: 90 },  // B
  { lat: 45, lng: 90 }, // C
]

describe('cameraAt', () => {
  it('t=0 dwells at the first stop', () => {
    const s = cameraAt(0, stops)
    expect(s.lat).toBeCloseTo(0); expect(s.lng).toBeCloseTo(0)
    expect(s.activeStop).toBe(0)
  })
  it('t=1 dwells at the last stop', () => {
    const s = cameraAt(1, stops)
    expect(s.lat).toBeCloseTo(45); expect(s.lng).toBeCloseTo(90)
    expect(s.activeStop).toBe(2)
  })
  it('mid-travel sits between stops with no active card', () => {
    // segment 0 travel midpoint: t = (DWELL + 1) / 2 / 3
    const s = cameraAt(((DWELL + 1) / 2) / 3, stops)
    expect(s.lng).toBeGreaterThan(10); expect(s.lng).toBeLessThan(80)
    expect(s.activeStop).toBeNull()
    expect(s.altitude).toBeGreaterThan(cameraAt(0, stops).altitude) // cruises higher than dwell
  })
  it('card opacity is 1 mid-dwell and 0 mid-travel', () => {
    expect(cameraAt(DWELL / 2 / 3, stops).cardOpacity).toBe(1)
    expect(cameraAt(((DWELL + 1) / 2) / 3, stops).cardOpacity).toBe(0)
  })
  it('clamps t outside [0,1]', () => {
    expect(cameraAt(-0.5, stops).activeStop).toBe(0)
    expect(cameraAt(1.5, stops).activeStop).toBe(2)
  })
})

describe('routeProgressAt', () => {
  const n = 3 // stops A, B, C → 2 hops

  it('holds at 0 through the whole first dwell window', () => {
    expect(routeProgressAt(0, n)).toBe(0)
    expect(routeProgressAt((DWELL / 2) / n, n)).toBe(0) // dwell center
    expect(routeProgressAt((DWELL * 0.99) / n, n)).toBe(0) // dwell end
  })

  it('reaches exactly 1 hop at the end of the first travel', () => {
    expect(routeProgressAt(1 / n - 1e-9, n)).toBeCloseTo(1, 3)
  })

  it('holds at 1 hop while dwelling at the second stop', () => {
    expect(routeProgressAt((1 + DWELL / 2) / n, n)).toBe(1)
  })

  it('is at half a hop at the eased travel midpoint', () => {
    // travel local midpoint → ease(0.5) = 0.5
    expect(routeProgressAt(((DWELL + 1) / 2) / n, n)).toBeCloseTo(0.5, 6)
  })

  it('is full at the last stop (whole last segment is dwell)', () => {
    expect(routeProgressAt((n - 1) / n, n)).toBe(n - 1)
    expect(routeProgressAt(1, n)).toBe(n - 1)
  })

  it('matches cameraAt: dwelling means line tip on the marker', () => {
    // any t where cameraAt reports an active stop must map to a whole hop count
    for (const t of [0.05, 0.12, 0.38, 0.45, 0.72, 0.95]) {
      const cam = cameraAt(t, stops)
      if (cam.activeStop != null) {
        expect(routeProgressAt(t, n)).toBe(cam.activeStop)
      }
    }
  })
})
