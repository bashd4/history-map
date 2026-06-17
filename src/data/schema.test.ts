import { describe, expect, it } from 'vitest'
import { journeySchema } from './schema'

const validStop = { name: 'Toulon', coords: { lat: 43.12, lng: 5.93 }, date: 'Dec 1793', story: 'Siege.' }
const validJourney = {
  id: 'test', figure: 'X', title: 'T', years: '1-2', color: '#e8b54a', intro: 'i',
  protagonistSide: 'french',
  stops: [validStop, { ...validStop, name: 'Paris' }],
}

describe('journeySchema', () => {
  it('accepts a valid journey', () => {
    expect(journeySchema.parse(validJourney).id).toBe('test')
  })
  it('rejects out-of-range coords', () => {
    const bad = { ...validJourney, stops: [{ ...validStop, coords: { lat: 99, lng: 0 } }, validStop] }
    expect(() => journeySchema.parse(bad)).toThrow()
  })
  it('rejects fewer than 2 stops', () => {
    expect(() => journeySchema.parse({ ...validJourney, stops: [validStop] })).toThrow()
  })
  it('accepts an optional battle with phases and movements', () => {
    const battleStop = {
      ...validStop,
      battle: {
        name: 'Austerlitz', date: '2 Dec 1805',
        sides: { french: '#4d8fdb', coalition: '#c0392b' },
        phases: [{
          caption: 'The trap.',
          movements: [{ side: 'french', style: 'feint', path: [{ lat: 49.1, lng: 16.7 }, { lat: 49.2, lng: 16.8 }] }],
        }],
      },
    }
    const j = journeySchema.parse({ ...validJourney, stops: [battleStop, validStop] })
    expect(j.stops[0].battle?.phases[0].movements[0].side).toBe('french')
  })
  it('rejects a movement whose side is not a key in battle.sides', () => {
    const battleStop = {
      ...validStop,
      battle: {
        name: 'Austerlitz', date: '2 Dec 1805',
        sides: { french: '#4d8fdb' },
        phases: [{
          caption: 'The trap.',
          movements: [{ side: 'unknown-side', style: 'advance', path: [{ lat: 49.1, lng: 16.7 }, { lat: 49.2, lng: 16.8 }] }],
        }],
      },
    }
    expect(() => journeySchema.parse({ ...validJourney, stops: [battleStop, validStop] })).toThrow(/unknown-side/)
  })
  it('rejects sides with a bad hex color', () => {
    const battleStop = {
      ...validStop,
      battle: {
        name: 'Austerlitz', date: '2 Dec 1805',
        sides: { french: 'blue' },
        phases: [{
          caption: 'The trap.',
          movements: [{ side: 'french', style: 'advance', path: [{ lat: 49.1, lng: 16.7 }, { lat: 49.2, lng: 16.8 }] }],
        }],
      },
    }
    expect(() => journeySchema.parse({ ...validJourney, stops: [battleStop, validStop] })).toThrow()
  })

  // ── enrichment fields ──────────────────────────────────────────────────
  const baseBattle = {
    name: 'Austerlitz', date: '2 Dec 1805',
    sides: { french: '#4d8fdb', coalition: '#c0392b' },
    phases: [{
      caption: 'Phase.',
      movements: [{ side: 'french', style: 'advance', path: [{ lat: 49.1, lng: 16.7 }, { lat: 49.2, lng: 16.8 }] }],
    }],
  }
  const withBattle = (battle: object) =>
    journeySchema.parse({ ...validJourney, stops: [{ ...validStop, battle }, validStop] })

  it('accepts battle with strengths matching sides keys', () => {
    const j = withBattle({ ...baseBattle, strengths: { french: '73,000 men', coalition: '85,000 men' } })
    expect(j.stops[0].battle?.strengths?.french).toBe('73,000 men')
  })
  it('rejects battle with strengths key not in sides', () => {
    expect(() => withBattle({ ...baseBattle, strengths: { french: '73,000', ottoman: '10,000' } }))
      .toThrow(/ottoman/)
  })
  it('accepts battle with areas', () => {
    const j = withBattle({
      ...baseBattle,
      areas: [
        {
          name: 'Pratzen Heights',
          outline: [
            { lat: 49.115, lng: 16.740 },
            { lat: 49.130, lng: 16.775 },
            { lat: 49.140, lng: 16.780 },
            { lat: 49.125, lng: 16.745 },
          ],
          kind: 'terrain',
        },
      ],
    })
    expect(j.stops[0].battle?.areas?.[0].name).toBe('Pratzen Heights')
  })
  it('rejects an area with fewer than 3 outline points', () => {
    expect(() => withBattle({
      ...baseBattle,
      areas: [{
        name: 'Too Small',
        outline: [{ lat: 49.1, lng: 16.7 }, { lat: 49.2, lng: 16.8 }],
      }],
    })).toThrow()
  })
  it('rejects an area with name > 40 chars', () => {
    expect(() => withBattle({
      ...baseBattle,
      areas: [{
        name: 'A'.repeat(41),
        outline: [{ lat: 49.1, lng: 16.7 }, { lat: 49.2, lng: 16.8 }, { lat: 49.15, lng: 16.75 }],
      }],
    })).toThrow()
  })
  it('accepts battle with fieldAzimuth', () => {
    const j = withBattle({ ...baseBattle, fieldAzimuth: 250 })
    expect(j.stops[0].battle?.fieldAzimuth).toBe(250)
  })
  it('rejects fieldAzimuth > 360', () => {
    expect(() => withBattle({ ...baseBattle, fieldAzimuth: 361 })).toThrow()
  })
  it('accepts a phase with events', () => {
    const j = withBattle({
      ...baseBattle,
      phases: [{
        ...baseBattle.phases[0],
        events: [{ coords: { lat: 49.08, lng: 16.73 }, label: 'Allied troops flee across the frozen ponds' }],
      }],
    })
    expect(j.stops[0].battle?.phases[0].events?.[0].label).toMatch(/frozen/)
  })
  it('rejects an event label > 60 chars', () => {
    expect(() => withBattle({
      ...baseBattle,
      phases: [{
        ...baseBattle.phases[0],
        events: [{ coords: { lat: 49.08, lng: 16.73 }, label: 'A'.repeat(61) }],
      }],
    })).toThrow()
  })
  it('accepts a movement with unit label', () => {
    const j = withBattle({
      ...baseBattle,
      phases: [{
        caption: 'Phase.',
        movements: [{ side: 'french', style: 'advance', unit: 'Soult — IV Corps', path: [{ lat: 49.1, lng: 16.7 }, { lat: 49.2, lng: 16.8 }] }],
      }],
    })
    expect(j.stops[0].battle?.phases[0].movements[0].unit).toBe('Soult — IV Corps')
  })
  it('rejects a movement unit > 40 chars', () => {
    expect(() => withBattle({
      ...baseBattle,
      phases: [{
        caption: 'Phase.',
        movements: [{ side: 'french', style: 'advance', unit: 'A'.repeat(41), path: [{ lat: 49.1, lng: 16.7 }, { lat: 49.2, lng: 16.8 }] }],
      }],
    })).toThrow()
  })

  // ── protagonistSide ────────────────────────────────────────────────────
  it('rejects a journey missing protagonistSide', () => {
    const { protagonistSide: _, ...noProtagSide } = validJourney
    expect(() => journeySchema.parse(noProtagSide)).toThrow()
  })
  it("rejects a journey where protagonistSide is not a key in a battle's sides", () => {
    const battleStop = {
      ...validStop,
      battle: {
        name: 'Austerlitz', date: '2 Dec 1805',
        sides: { french: '#4d8fdb', coalition: '#c0392b' },
        phases: [{
          caption: 'The trap.',
          movements: [{ side: 'french', style: 'feint', path: [{ lat: 49.1, lng: 16.7 }, { lat: 49.2, lng: 16.8 }] }],
        }],
      },
    }
    expect(() => journeySchema.parse({
      ...validJourney,
      protagonistSide: 'union', // 'union' is not in sides { french, coalition }
      stops: [battleStop, validStop],
    })).toThrow(/protagonistSide/)
  })
})
