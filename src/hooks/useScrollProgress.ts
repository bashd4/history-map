import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useEffect } from 'react'
import type { Journey } from '../data/schema'
import { cameraAt, stopsForCamera } from '../lib/journeyCamera'
import { useAppStore } from '../state/store'

gsap.registerPlugin(ScrollTrigger)

/** Maps document scroll over the journey container to store.scrollT (0..1).
 *  Also cheaply computes whether the active stop has a battle and updates
 *  store.nearBattleStop — only written when the value changes (no 60/s churn). */
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
        // Derive whether the active dwell stop has a battle, update store flag only on change.
        const activeStop = cameraAt(t, stops).activeStop
        const isBattle = activeStop != null && Boolean(journey.stops[activeStop]?.battle)
        if (useAppStore.getState().nearBattleStop !== isBattle) {
          useAppStore.getState().setNearBattleStop(isBattle)
        }
      },
    })
    // Re-measure after creation — guards against mis-measured scroll bounds
    // when layout settles late (fonts, mobile URL bar, etc.).
    ScrollTrigger.refresh()
    return () => {
      st.kill()
      // Reset flag when leaving the journey so GlobeScene doesn't keep terrain mounted.
      useAppStore.getState().setNearBattleStop(false)
    }
  }, [containerRef, journey])
}
