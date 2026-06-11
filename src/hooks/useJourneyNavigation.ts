import gsap from 'gsap'
import { useEffect, useRef, useState } from 'react'
import type { Journey } from '../data/schema'
import { cameraAt, DWELL, stopsForCamera } from '../lib/journeyCamera'
import { useAppStore } from '../state/store'

/**
 * Computes the t value at the center of a stop's dwell window.
 * For the last stop the entire segment is dwell, so we use 0.5 as the
 * local offset (which maps to the exact midpoint of the unit segment).
 */
export function dwellCenterT(index: number, n: number): number {
  const isLast = index === n - 1
  const localOffset = isLast ? 0.5 : DWELL / 2
  return (index + localOffset) / n
}

/** Provides point-selector navigation for a journey.
 *  Returns goToStop / next / prev helpers and the currently active stop index. */
export function useJourneyNavigation(journey: Journey) {
  const n = journey.stops.length
  const stops = stopsForCamera(journey)

  // Proxy object for gsap to tween — avoids re-creating on every goToStop call.
  const proxy = useRef({ t: 0 })
  const tweenRef = useRef<gsap.core.Tween | null>(null)

  const setJourneyT = useAppStore((s) => s.setJourneyT)
  const setNavigating = useAppStore((s) => s.setNavigating)
  const setNearBattleStopIndex = useAppStore((s) => s.setNearBattleStopIndex)

  // Derived active stop index — re-computed when journeyT changes (subscription
  // is fine here: only updates at tween frequency during flights).
  const journeyT = useAppStore((s) => s.journeyT)
  const [activeStopIndex, setActiveStopIndex] = useState<number | null>(null)

  // Keep activeStopIndex in sync with journeyT changes.
  useEffect(() => {
    const cam = cameraAt(journeyT, stops)
    setActiveStopIndex(cam.activeStop)
    // Also maintain nearBattleStopIndex (terrain preheat).
    const index =
      cam.activeStop != null && journey.stops[cam.activeStop]?.battle != null
        ? cam.activeStop
        : null
    if (useAppStore.getState().nearBattleStopIndex !== index) {
      setNearBattleStopIndex(index)
    }
  }, [journeyT, stops, journey.stops, setNearBattleStopIndex])

  const goToStop = (index: number) => {
    const clamped = Math.max(0, Math.min(n - 1, index))
    const targetT = dwellCenterT(clamped, n)
    const currentT = useAppStore.getState().journeyT

    // Kill any running tween.
    if (tweenRef.current) {
      tweenRef.current.kill()
      tweenRef.current = null
    }

    // Snap proxy to current real position.
    proxy.current.t = currentT

    const diff = Math.abs(targetT - currentT)
    const duration = Math.min(4.5, 1.2 + 1.1 * diff * n)

    setNavigating(true)
    tweenRef.current = gsap.to(proxy.current, {
      t: targetT,
      duration,
      ease: 'power2.inOut',
      onUpdate: () => {
        const t = proxy.current.t
        setJourneyT(t)
        // Maintain preheat during flight.
        const cam = cameraAt(t, stops)
        const idx =
          cam.activeStop != null && journey.stops[cam.activeStop]?.battle != null
            ? cam.activeStop
            : null
        if (useAppStore.getState().nearBattleStopIndex !== idx) {
          setNearBattleStopIndex(idx)
        }
      },
      onComplete: () => setNavigating(false),
    })
  }

  const next = () => {
    const current = cameraAt(useAppStore.getState().journeyT, stops).activeStop
    const base = current ?? 0
    goToStop(base + 1)
  }

  const prev = () => {
    const current = cameraAt(useAppStore.getState().journeyT, stops).activeStop
    const base = current ?? 0
    goToStop(base - 1)
  }

  // Keyboard navigation.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (useAppStore.getState().mode === 'battle') return
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === ' ') {
        e.preventDefault()
        next()
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault()
        prev()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [n, journey]) // n and journey are stable refs; next/prev are closures over goToStop

  // Subscribe to requestedStopIndex from the store (set by globe marker clicks).
  useEffect(() => {
    const unsub = useAppStore.subscribe((state, prev) => {
      if (state.requestedStopIndex !== prev.requestedStopIndex &&
          state.requestedStopIndex !== null) {
        const idx = state.requestedStopIndex
        useAppStore.getState().clearRequestedStop()
        goToStop(idx)
      }
    })
    return () => unsub()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [n, journey])

  // Cleanup tween and preheat on unmount.
  useEffect(() => {
    return () => {
      if (tweenRef.current) tweenRef.current.kill()
      useAppStore.getState().setNearBattleStopIndex(null)
      useAppStore.getState().setNavigating(false)
    }
  }, [])

  return { goToStop, next, prev, activeStopIndex }
}
