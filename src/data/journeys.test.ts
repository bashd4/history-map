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

  describe('grant journey', () => {
    it('exists in the registry', () => {
      const grant = journeys.find((j) => j.id === 'grant')
      expect(grant).toBeDefined()
    })

    it('has exactly 70 stops', () => {
      const grant = journeys.find((j) => j.id === 'grant')!
      expect(grant.stops).toHaveLength(70)
    })

    it('has exactly 4 battles', () => {
      const grant = journeys.find((j) => j.id === 'grant')!
      const battles = grant.stops.filter((s) => s.battle)
      expect(battles).toHaveLength(4)
    })

    it('battle names match expected engagements', () => {
      const grant = journeys.find((j) => j.id === 'grant')!
      const battleNames = grant.stops.filter((s) => s.battle).map((s) => s.battle!.name)
      expect(battleNames.some((n) => /Donelson/.test(n))).toBe(true)
      expect(battleNames.some((n) => /Shiloh/.test(n))).toBe(true)
      expect(battleNames.some((n) => /Vicksburg/.test(n))).toBe(true)
      expect(battleNames.some((n) => /Chattanooga|Missionary/.test(n))).toBe(true)
    })

    it('every stop name matches /^Ch\\. \\d+ — /', () => {
      const grant = journeys.find((j) => j.id === 'grant')!
      for (const stop of grant.stops) {
        expect(stop.name).toMatch(/^Ch\. \d+ — /)
      }
    })
  })
})
