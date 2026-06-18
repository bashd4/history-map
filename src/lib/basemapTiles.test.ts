import { describe, expect, it } from 'vitest'
import {
  pickHillshadeZoom, duotone, DARK, LIGHT, terrainDestRect, TILE_SIZE, Z_TERRAIN_SAFE,
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

it('Z_TERRAIN_SAFE is 9', () => expect(Z_TERRAIN_SAFE).toBe(9))
