import { describe, expect, it } from 'vitest'
import { metersPerPixel, niceScaleDistance, screenAngleFromUp, R_EARTH } from './mapScale'

const DEG = Math.PI / 180

describe('metersPerPixel', () => {
  it('scales linearly with camera distance', () => {
    const fov = 45 * DEG
    const near = metersPerPixel(0.01, fov, 800)
    const far = metersPerPixel(0.02, fov, 800)
    expect(far).toBeCloseTo(near * 2, 6)
  })
  it('matches the closed-form vertical span', () => {
    const fov = 45 * DEG
    const dist = 0.01 // globe radii
    const h = 800
    const expected = (2 * dist * Math.tan(fov / 2) * R_EARTH) / h
    expect(metersPerPixel(dist, fov, h)).toBeCloseTo(expected, 3)
  })
})

describe('niceScaleDistance', () => {
  it('snaps to a 1/2/5 × 10^n distance within the max bar width', () => {
    // 10 m/px, max 160 px → max 1600 m → nice = 1000 m
    const r = niceScaleDistance(10, 160)
    expect(r.meters).toBe(1000)
    expect(r.pixels).toBeCloseTo(100, 6)
    expect(r.label).toBe('1 km')
  })
  it('uses metre labels below 1 km and never exceeds the max width', () => {
    const r = niceScaleDistance(2, 160) // max 320 m → nice = 200 m
    expect(r.meters).toBe(200)
    expect(r.label).toBe('200 m')
    expect(r.pixels).toBeLessThanOrEqual(160)
  })
})

describe('screenAngleFromUp', () => {
  it('is 0 when north points straight up the screen', () => {
    // screen y grows downward; "up" is decreasing y
    expect(screenAngleFromUp(100, 100, 100, 40)).toBeCloseTo(0, 6)
  })
  it('is +90° (π/2) when north points screen-right', () => {
    expect(screenAngleFromUp(100, 100, 160, 100)).toBeCloseTo(Math.PI / 2, 6)
  })
})
