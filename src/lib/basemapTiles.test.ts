import { describe, expect, it } from 'vitest'
import {
  pickHillshadeZoom, duotone, DARK, LIGHT, terrainDestRect, TILE_SIZE, Z_TERRAIN_MAX,
  WATER_DARK, WATER_LIGHT, luminance, contrastStretch, toneRamp, isWaterPixel,
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

it('Z_TERRAIN_MAX is 13', () => expect(Z_TERRAIN_MAX).toBe(13))

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
  it('pushes below-mid down and above-mid up (default mid=0.6)', () => {
    expect(contrastStretch(0.4)).toBeLessThan(0.4) // below mid → darker
    expect(contrastStretch(0.7)).toBeGreaterThan(0.7) // above mid → lighter
  })
})

describe('toneRamp', () => {
  it('maps l=0 → dark and l=1 → light', () => {
    expect(toneRamp(0, DARK, LIGHT)).toEqual(DARK)
    expect(toneRamp(1, DARK, LIGHT)).toEqual(LIGHT)
    expect(toneRamp(0, WATER_DARK, WATER_LIGHT)).toEqual(WATER_DARK)
    expect(toneRamp(1, WATER_DARK, WATER_LIGHT)).toEqual(WATER_LIGHT)
  })
})

describe('isWaterPixel', () => {
  it('is true for a bluish pixel', () => {
    expect(isWaterPixel(60, 120, 180)).toBe(true)
  })
  it('is false for tan land', () => {
    expect(isWaterPixel(180, 160, 120)).toBe(false)
  })
  it('is false for neutral gray placeholder', () => {
    expect(isWaterPixel(200, 200, 200)).toBe(false)
  })
})
