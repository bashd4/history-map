import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import { useAppStore } from '../state/store'

const SAMPLE_COUNT = 120
const SLOW_MEDIAN_MS = 22 // > 22 ms median ≈ < 45 fps → low-perf

/** Samples the first SAMPLE_COUNT frame deltas after mount. If the median
 *  exceeds SLOW_MEDIAN_MS, sets the one-way lowPerf latch in the store. */
export function PerfSampler() {
  const samples = useRef<number[]>([])
  const done = useRef(false)

  useFrame((_, dt) => {
    if (done.current) return
    samples.current.push(dt * 1000) // convert to ms
    if (samples.current.length >= SAMPLE_COUNT) {
      done.current = true
      const sorted = [...samples.current].sort((a, b) => a - b)
      const median = sorted[Math.floor(sorted.length / 2)]
      if (median > SLOW_MEDIAN_MS) {
        useAppStore.getState().setLowPerf(true)
      }
    }
  })

  return null
}
