import { describe, expect, it } from 'vitest'
import { echelonTicks } from './unitSymbol'

describe('echelonTicks', () => {
  it('maps each echelon to its APP-6 ticks', () => {
    expect(echelonTicks('corps')).toBe('XXX')
    expect(echelonTicks('division')).toBe('XX')
    expect(echelonTicks('brigade')).toBe('X')
    expect(echelonTicks('regiment')).toBe('III')
    expect(echelonTicks('flotilla')).toBe('≈')
  })
})
