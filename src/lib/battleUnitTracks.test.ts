import { describe, expect, it } from 'vitest'
import type { Battle, Movement } from '../data/schema'
import { battleUnitTracks, unitPositionAt } from './battleUnitTracks'

// --- fixture helpers ---------------------------------------------------------

function mv(partial: Partial<Movement> & { unit: string; path: Movement['path'] }): Movement {
  return {
    side: 'a',
    style: 'advance',
    branch: 'infantry',
    echelon: 'division',
    ...partial,
  } as Movement
}

/** 3 phases × 10s each. Alpha moves in phases 0 and 2 (rests in 1); its phase-2
 *  path starts away from its phase-0 endpoint to exercise gap-bridging. Bravo
 *  first appears in phase 1. */
function makeBattle(): Battle {
  return {
    name: 'Test',
    date: '1862',
    sides: { a: '#112233', b: '#445566' },
    phases: [
      { caption: 'p0', duration: 10, movements: [
        mv({ unit: 'Alpha', path: [{ lat: 0, lng: 0 }, { lat: 0, lng: 1 }] }),
      ] },
      { caption: 'p1', duration: 10, movements: [
        mv({ unit: 'Bravo', side: 'b', path: [{ lat: 1, lng: 0 }, { lat: 1, lng: 1 }] }),
      ] },
      { caption: 'p2', duration: 10, movements: [
        mv({ unit: 'Alpha', path: [{ lat: 0, lng: 2 }, { lat: 0, lng: 3 }] }),
      ] },
    ],
  } as Battle
}

// --- tests -------------------------------------------------------------------

describe('battleUnitTracks', () => {
  it('builds move/rest/move segments and gap-bridges the second move', () => {
    const tracks = battleUnitTracks(makeBattle())
    const alpha = tracks.find((t) => t.unit === 'Alpha')!
    expect(alpha.segments.map((s) => `${s.phaseIndex}:${s.kind}`)).toEqual([
      '0:move', '1:rest', '2:move',
    ])
    const rest = alpha.segments[1]
    expect(rest.kind === 'rest' && rest.at).toMatchObject({ lat: 0, lng: 1 })
    // phase-2 path[0] (0,2) ≠ rest endpoint (0,1) → bridged: (0,1) prepended.
    const move2 = alpha.segments[2]
    expect(move2.kind === 'move' && move2.path[0]).toMatchObject({ lat: 0, lng: 1 })
    expect(move2.kind === 'move' && move2.path.length).toBe(3)
    expect(alpha.branch).toBe('infantry')
    expect(alpha.echelon).toBe('division')
  })

  it('a unit first appearing in phase 1 has no phase-0 segment', () => {
    const bravo = battleUnitTracks(makeBattle()).find((t) => t.unit === 'Bravo')!
    expect(bravo.segments[0].phaseIndex).toBe(1)
    expect(bravo.side).toBe('b')
  })

  it.each([
    ['branch', { branch: 'cavalry' as const }, /conflicting branch/],
    ['echelon', { echelon: 'corps' as const }, /conflicting echelon/],
    ['side', { side: 'b' }, /conflicting side/],
  ])('throws on a unit with conflicting %s across movements', (_f, override, re) => {
    const b = {
      name: 'X', date: '1', sides: { a: '#000000', b: '#111111' },
      phases: [
        { caption: 'p0', duration: 10, movements: [mv({ unit: 'Conf', path: [{ lat: 0, lng: 0 }, { lat: 0, lng: 1 }] })] },
        { caption: 'p1', duration: 10, movements: [mv({ unit: 'Conf', path: [{ lat: 0, lng: 1 }, { lat: 0, lng: 2 }], ...override })] },
      ],
    } as Battle
    expect(() => battleUnitTracks(b)).toThrow(re)
  })

  it('caches per battle (identity)', () => {
    const b = makeBattle()
    expect(battleUnitTracks(b)).toBe(battleUnitTracks(b))
  })
})

describe('unitPositionAt', () => {
  const battle = makeBattle()
  const alpha = battleUnitTracks(battle).find((t) => t.unit === 'Alpha')!
  const bravo = battleUnitTracks(battle).find((t) => t.unit === 'Bravo')!

  it('returns the resting endpoint during a rest phase', () => {
    // elapsed 15 → phase 1 (Alpha rests at its phase-0 endpoint)
    expect(unitPositionAt(alpha, battle, 15)).toMatchObject({ lat: 0, lng: 1 })
  })

  it('interpolates to ~midpoint at phaseProgress 0.5 of a move', () => {
    // elapsed 5 → phase 0, progress 0.5 along (0,0)→(0,1)
    const p = unitPositionAt(alpha, battle, 5)!
    expect(p.lat).toBeCloseTo(0, 5)
    expect(p.lng).toBeCloseTo(0.5, 3)
  })

  it('returns null before the unit first appears', () => {
    // elapsed 5 → phase 0; Bravo first appears in phase 1
    expect(unitPositionAt(bravo, battle, 5)).toBeNull()
  })

  it('returns the final position when playback is done', () => {
    // elapsed 35 → past all 30s → done; Alpha ends its phase-2 move at (0,3)
    expect(unitPositionAt(alpha, battle, 35)).toMatchObject({ lat: 0, lng: 3 })
  })
})
