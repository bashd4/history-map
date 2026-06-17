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

  it('present from start by default: a unit that first acts in phase 1 rests at its start position from phase 0', () => {
    const bravo = battleUnitTracks(makeBattle()).find((t) => t.unit === 'Bravo')!
    expect(bravo.segments.map((s) => `${s.phaseIndex}:${s.kind}`)).toEqual(['0:rest', '1:move', '2:rest'])
    const rest0 = bravo.segments[0]
    expect(rest0.kind === 'rest' && rest0.at).toMatchObject({ lat: 1, lng: 0 }) // its phase-1 start
    expect(bravo.side).toBe('b')
  })

  it('arrives:true — unit appears only at its first movement, no earlier segment', () => {
    const b = makeBattle()
    ;(b.phases[1].movements[0] as { arrives?: boolean }).arrives = true
    const bravo = battleUnitTracks(b).find((t) => t.unit === 'Bravo')!
    expect(bravo.segments.map((s) => s.phaseIndex)).toEqual([1, 2]) // move(1), rest(2) — nothing at phase 0
  })

  it('departs:true — unit leaves after its last move and is hidden afterwards', () => {
    const b = {
      name: 'D', date: '1', sides: { a: '#000000' },
      phases: [
        { caption: 'p0', duration: 10, movements: [mv({ unit: 'Gone', departs: true, path: [{ lat: 0, lng: 0 }, { lat: 0, lng: 1 }] })] },
        { caption: 'p1', duration: 10, movements: [mv({ unit: 'Stay', path: [{ lat: 2, lng: 0 }, { lat: 2, lng: 1 }] })] },
      ],
    } as Battle
    const gone = battleUnitTracks(b).find((t) => t.unit === 'Gone')!
    expect(gone.segments.map((s) => s.phaseIndex)).toEqual([0]) // exists phase 0 only
    expect(unitPositionAt(gone, b, 5)).not.toBeNull()   // visible during phase 0
    expect(unitPositionAt(gone, b, 15)).toBeNull()       // departed by phase 1
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

  it('present-from-start unit rests at its start position before it acts', () => {
    // elapsed 5 → phase 0; Bravo (present from start) rests at its phase-1 start (1,0)
    expect(unitPositionAt(bravo, battle, 5)).toMatchObject({ lat: 1, lng: 0 })
  })

  it('returns the final position when playback is done', () => {
    // elapsed 35 → past all 30s → done; Alpha ends its phase-2 move at (0,3)
    expect(unitPositionAt(alpha, battle, 35)).toMatchObject({ lat: 0, lng: 3 })
  })
})
