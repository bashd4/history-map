import { describe, expect, it } from 'vitest'
import { journeys } from './index'
import type { Battle } from '../data/schema'

/**
 * Guard against the "two flotillas going opposite directions" bug: a single unit
 * given more than one movement within the same phase animates them all at once,
 * so an advance + a retreat of the same unit in one phase renders as two ghosts
 * moving in opposite directions. Advance-then-retreat must be split across
 * consecutive phases instead.
 */
function allBattles(): Array<{ journey: string; stop: string; battle: Battle }> {
  const out: Array<{ journey: string; stop: string; battle: Battle }> = []
  for (const j of journeys) {
    for (const s of j.stops) {
      if (s.battle) out.push({ journey: j.id, stop: s.name, battle: s.battle })
    }
  }
  return out
}

describe('battle phase integrity', () => {
  it('never gives one unit two movements in the same phase', () => {
    const offenders: string[] = []
    for (const { journey, stop, battle } of allBattles()) {
      battle.phases.forEach((phase, pi) => {
        const byUnit = new Map<string, number>()
        for (const m of phase.movements) {
          if (!m.unit) continue
          byUnit.set(m.unit, (byUnit.get(m.unit) ?? 0) + 1)
        }
        for (const [unit, count] of byUnit) {
          if (count > 1) {
            offenders.push(`${journey}/${stop} · phase ${pi + 1} · "${unit}" ×${count}`)
          }
        }
      })
    }
    expect(offenders, `units moving twice in one phase:\n${offenders.join('\n')}`).toEqual([])
  })
})
