import { describe, expect, it } from 'vitest'
import { affiliationOf } from './affiliation'
describe('affiliationOf', () => {
  const journey = { protagonistSide: 'union' } as any
  it('protagonist side is friendly', () => { expect(affiliationOf(journey, 'union')).toBe('friendly') })
  it('any other side is hostile', () => {
    expect(affiliationOf(journey, 'confederate')).toBe('hostile')
    expect(affiliationOf(journey, 'coalition')).toBe('hostile')
  })
})
