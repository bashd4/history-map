import { describe, expect, it } from 'vitest'
import { DEFAULT_PHASE_SECONDS, playbackAt, totalDuration } from './battlePlayback'

const battle = {
  name: 'B', date: 'd',
  phases: [
    { caption: 'p0', duration: 4, movements: [] as never[] },
    { caption: 'p1', movements: [] as never[] }, // default duration
  ],
} as never

describe('playbackAt', () => {
  it('starts in phase 0', () => {
    expect(playbackAt(battle, 0)).toEqual({ phaseIndex: 0, phaseProgress: 0, done: false })
  })
  it('progresses within a phase', () => {
    expect(playbackAt(battle, 2).phaseProgress).toBeCloseTo(0.5)
  })
  it('advances to the next phase using default duration', () => {
    const s = playbackAt(battle, 4 + DEFAULT_PHASE_SECONDS / 2)
    expect(s.phaseIndex).toBe(1); expect(s.phaseProgress).toBeCloseTo(0.5)
  })
  it('reports done at the end and clamps', () => {
    const s = playbackAt(battle, 999)
    expect(s.done).toBe(true); expect(s.phaseIndex).toBe(1); expect(s.phaseProgress).toBe(1)
  })
  it('totalDuration sums phase durations', () => {
    expect(totalDuration(battle)).toBe(4 + DEFAULT_PHASE_SECONDS)
  })
})
