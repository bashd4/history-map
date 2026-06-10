import type { Battle } from '../data/schema'

// Deliberate simplification vs spec ("proportional to path length"): a flat default.
// Austerlitz sets explicit durations anyway; revisit if a future battle omits them.
export const DEFAULT_PHASE_SECONDS = 6

export interface PlaybackState { phaseIndex: number; phaseProgress: number; done: boolean }

export const phaseSeconds = (b: Battle): number[] =>
  b.phases.map((p) => p.duration ?? DEFAULT_PHASE_SECONDS)

export const totalDuration = (b: Battle): number =>
  phaseSeconds(b).reduce((a, x) => a + x, 0)

export function playbackAt(b: Battle, elapsed: number): PlaybackState {
  const durs = phaseSeconds(b)
  let t = Math.max(0, elapsed)
  for (let i = 0; i < durs.length; i++) {
    if (t < durs[i]) return { phaseIndex: i, phaseProgress: t / durs[i], done: false }
    t -= durs[i]
  }
  return { phaseIndex: durs.length - 1, phaseProgress: 1, done: true }
}
