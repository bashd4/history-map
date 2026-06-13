import { describe, expect, it } from 'vitest'
import { battleExtent, battleFrameAltitude } from './battleExtent'
import type { Battle } from '../data/schema'

const site = { lat: 0, lng: 0 }
const DEG = Math.PI / 180

function makeBattle(paths: Array<Array<{ lat: number; lng: number }>>): Battle {
  return {
    name: 'B', date: 'd',
    sides: { a: '#ffffff' },
    phases: [{
      caption: 'c',
      movements: paths.map((path) => ({ side: 'a', style: 'advance' as const, path })),
    }],
  }
}

describe('battleExtent', () => {
  it('uses the 90th-percentile distance, dropping the lone outlier', () => {
    // 10 waypoints at 1° and one outlier at 10° — p90 (index floor(11*0.9)=9)
    // lands on the cluster, excluding the single far point.
    const core = Array.from({ length: 10 }, (_, i) => ({ lat: 0, lng: 1 + i * 1e-6 }))
    const b = makeBattle([[...core, { lat: 0, lng: 10 }]])
    expect(battleExtent(b, site)).toBeCloseTo(1 * DEG, 4)
  })

  it('includes area outlines and events in the distribution', () => {
    const b = makeBattle([[{ lat: 0, lng: 1 }, { lat: 0, lng: 1 }]])
    b.areas = [
      {
        name: 'Area A',
        outline: [{ lat: 0, lng: 1 }, { lat: 0, lng: 1 }, { lat: 2, lng: 0 }],
      },
    ]
    // sorted dists: [1°,1°,1°,1°,2°]; index floor(5*0.9)=4 → 2°
    expect(battleExtent(b, site)).toBeCloseTo(2 * DEG, 5)
  })

  it('caches per battle object', () => {
    const b = makeBattle([[{ lat: 0, lng: 0.5 }, { lat: 0, lng: 1 }]])
    const first = battleExtent(b, site)
    expect(battleExtent(b, site)).toBe(first)
  })
})

describe('battleFrameAltitude', () => {
  it('clamps tiny battles to the close floor', () => {
    const b = makeBattle([[{ lat: 0, lng: 0.001 }, { lat: 0, lng: 0.002 }]])
    expect(battleFrameAltitude(b, site)).toBe(0.0015)
  })

  it('scales mid-size battles with extent', () => {
    // p90 of [0.5°, 1°] is index floor(2*0.9)=1 → 1° ≈ 0.01745 rad → ×3.3
    const b = makeBattle([[{ lat: 0, lng: 0.5 }, { lat: 0, lng: 1 }]])
    expect(battleFrameAltitude(b, site)).toBeCloseTo(0.01745 * 3.3, 3)
  })

  it('clamps campaign-scale battles to the wide ceiling', () => {
    const b = makeBattle([[{ lat: 0, lng: 3 }, { lat: 0, lng: 5 }]])
    expect(battleFrameAltitude(b, site)).toBe(0.06)
  })
})
