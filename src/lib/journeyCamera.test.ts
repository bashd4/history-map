import { describe, expect, it } from 'vitest'
import { cameraAt, DWELL } from './journeyCamera'

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
