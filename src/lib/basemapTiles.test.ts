import { describe, expect, it } from 'vitest'
import {
  pickHillshadeZoom, duotone, DARK, LIGHT, terrainDestRect, TILE_SIZE,
  luminance, contrastStretch, toneRamp, isHydroWater, WATER_SLATE, Z_HYDRO_MAX,
} from './basemapTiles'

describe('pickHillshadeZoom', () => {
  it('increases as coverage shrinks (finer zoom when tighter)', () => {
    const wide = pickHillshadeZoom(2.0)
    const tight = pickHillshadeZoom(0.2)
    expect(tight).toBeGreaterThan(wide)
  })
  it('clamps to [7, 16]', () => {
    expect(pickHillshadeZoom(1e-6)).toBe(16)
    expect(pickHillshadeZoom(1e6)).toBe(7)
  })
})

describe('duotone', () => {
  it('maps black → DARK and white → LIGHT', () => {
    expect(duotone(0, 0, 0)).toEqual(DARK)
    expect(duotone(255, 255, 255)).toEqual(LIGHT)
  })
  it('is monotonic in luminance (brighter input → channel ≥ darker input)', () => {
    const lo = duotone(40, 40, 40)
    const hi = duotone(200, 200, 200)
    expect(hi[0]).toBeGreaterThanOrEqual(lo[0])
    expect(hi[1]).toBeGreaterThanOrEqual(lo[1])
    expect(hi[2]).toBeGreaterThanOrEqual(lo[2])
  })
})

describe('terrainDestRect', () => {
  it('a terrain tile one zoom coarser covers a 2× region of the hillshade canvas', () => {
    const zHi = 14
    const zLo = 13 // coarser-than-hillshade underlay zoom
    const cov = { z: zHi, xMin: 8000, yMin: 6000 }
    const r = terrainDestRect(4000, 3000, zLo, cov)
    const scale = Math.pow(2, zHi - zLo) // 2
    expect(r.dx).toBe(0)
    expect(r.dy).toBe(0)
    expect(r.dw).toBe(scale * TILE_SIZE)
    expect(r.dh).toBe(scale * TILE_SIZE)
  })
  it('offsets by whole hillshade tiles for neighbouring terrain tiles', () => {
    const cov = { z: 14, xMin: 8000, yMin: 6000 }
    const r = terrainDestRect(4001, 3000, 13, cov) // one tile east at zLo
    expect(r.dx).toBe(2 * TILE_SIZE) // 2 hillshade tiles east
    expect(r.dy).toBe(0)
  })
})

it('Z_HYDRO_MAX is 12', () => expect(Z_HYDRO_MAX).toBe(12))

it('WATER_SLATE is exported', () => expect(WATER_SLATE).toEqual([0x35, 0x5a, 0x74]))

describe('luminance', () => {
  it('maps black → 0 and white → 1', () => {
    expect(luminance(0, 0, 0)).toBe(0)
    expect(luminance(255, 255, 255)).toBeCloseTo(1, 10)
  })
})

describe('contrastStretch', () => {
  it('is monotonic non-decreasing in l', () => {
    let prev = -1
    for (let l = 0; l <= 1.0001; l += 0.05) {
      const v = contrastStretch(l)
      expect(v).toBeGreaterThanOrEqual(prev)
      prev = v
    }
  })
  it('stays within [0, 1]', () => {
    for (let l = 0; l <= 1.0001; l += 0.1) {
      const v = contrastStretch(l)
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThanOrEqual(1)
    }
  })
  it('defaults (k=12, mid=0.93) pivot on mid and expand the high band', () => {
    expect(contrastStretch(0.93)).toBeCloseTo(0.93, 5) // mid maps to itself
    expect(contrastStretch(1.0)).toBe(1) // (0.07)*12+0.93 = 1.77 → clamp 1
    expect(contrastStretch(0.85)).toBe(0) // (−0.08)*12+0.93 = −0.03 → clamp 0
  })
})

describe('toneRamp', () => {
  it('maps l=0 → dark and l=1 → light', () => {
    expect(toneRamp(0, DARK, LIGHT)).toEqual(DARK)
    expect(toneRamp(1, DARK, LIGHT)).toEqual(LIGHT)
  })
})

describe('isHydroWater', () => {
  it('is true for water-blue semi-opaque pixel', () => {
    expect(isHydroWater(40, 80, 160, 255)).toBe(true)
  })
  it('is false for a transparent pixel (land, no overlay)', () => {
    expect(isHydroWater(0, 0, 255, 0)).toBe(false)
  })
  it('is false for a neutral gray pixel', () => {
    expect(isHydroWater(200, 200, 200, 255)).toBe(false)
  })
})
