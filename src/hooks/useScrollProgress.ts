import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useEffect } from 'react'
import type { Journey } from '../data/schema'
import { cameraAt, stopsForCamera } from '../lib/journeyCamera'
import { useAppStore } from '../state/store'

gsap.registerPlugin(ScrollTrigger)

/** Maps document scroll over the journey container to store.scrollT (0..1).
 *  Also cheaply derives the active dwell stop and, when it has a battle, writes
 *  its index to store.nearBattleStopIndex — only when the value changes
 *  (no 60/s churn). */
export function useScrollProgress(
  containerRef: React.RefObject<HTMLElement | null>,
  journey: Journey,
) {
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const stops = stopsForCamera(journey)
    const st = ScrollTrigger.create({
      trigger: el, start: 'top top', end: 'bottom bottom',
      onUpdate: (self) => {
        const t = self.progress
        useAppStore.getState().setScrollT(t)
        // Derive the active battle-stop index (null if the active stop has no
        // battle), update the store only on change.
        const activeStop = cameraAt(t, stops).activeStop
        const index =
          activeStop != null && journey.stops[activeStop]?.battle != null ? activeStop : null
        if (useAppStore.getState().nearBattleStopIndex !== index) {
          useAppStore.getState().setNearBattleStopIndex(index)
        }
      },
    })
    // Re-measure after creation — guards against mis-measured scroll bounds
    // when layout settles late (fonts, mobile URL bar, etc.).
    ScrollTrigger.refresh()
    return () => {
      st.kill()
      // Reset when leaving the journey so GlobeScene doesn't keep terrain mounted.
      useAppStore.getState().setNearBattleStopIndex(null)
    }
  }, [containerRef, journey])
}
