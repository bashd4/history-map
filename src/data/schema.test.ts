import { describe, expect, it } from 'vitest'
import { journeySchema } from './schema'

const validStop = { name: 'Toulon', coords: { lat: 43.12, lng: 5.93 }, date: 'Dec 1793', story: 'Siege.' }
const validJourney = {
  id: 'test', figure: 'X', title: 'T', years: '1-2', color: '#e8b54a', intro: 'i',
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
        phases: [{
          caption: 'The trap.',
          movements: [{ side: 'french', style: 'feint', path: [{ lat: 49.1, lng: 16.7 }, { lat: 49.2, lng: 16.8 }] }],
        }],
      },
    }
    const j = journeySchema.parse({ ...validJourney, stops: [battleStop, validStop] })
    expect(j.stops[0].battle?.phases[0].movements[0].side).toBe('french')
  })
})
