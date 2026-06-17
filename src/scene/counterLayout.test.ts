import { beforeEach, describe, expect, it } from 'vitest'
import { counterLayout } from './counterLayout'

describe('counterLayout', () => {
  beforeEach(() => counterLayout.clear())

  it('pushes overlapping counters apart', () => {
    counterLayout.report('a', 100, 100)
    counterLayout.report('b', 100, 100) // coincident
    counterLayout.resolve()
    const a = counterLayout.offset('a')
    const b = counterLayout.offset('b')
    const dist = Math.hypot(100 + b.x - (100 + a.x), 100 + b.y - (100 + a.y))
    expect(dist).toBeGreaterThan(20) // separated, not stacked
  })

  it('leaves well-separated counters untouched', () => {
    counterLayout.report('a', 0, 0)
    counterLayout.report('b', 500, 400)
    counterLayout.resolve()
    expect(Math.hypot(counterLayout.offset('a').x, counterLayout.offset('a').y)).toBeLessThan(1)
  })

  it('forgets a counter that goes hidden', () => {
    counterLayout.report('gone', 10, 10)
    counterLayout.forget('gone')
    expect(counterLayout.offset('gone')).toEqual({ x: 0, y: 0 })
  })
})
