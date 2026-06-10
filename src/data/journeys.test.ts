import { describe, expect, it } from 'vitest'
import { journeys } from '../journeys'
import { journeySchema } from './schema'

describe('journey data files', () => {
  it('has at least one journey', () => { expect(journeys.length).toBeGreaterThan(0) })
  for (const j of journeys) {
    it(`${j.id ?? '?'} passes schema validation`, () => { journeySchema.parse(j) })
  }
  it('napoleon has exactly one battle (Austerlitz)', () => {
    const napoleon = journeys.find((j) => j.id === 'napoleon')!
    const battles = napoleon.stops.filter((s) => s.battle)
    expect(battles).toHaveLength(1)
    expect(battles[0].battle!.name).toMatch(/Austerlitz/)
  })
})
