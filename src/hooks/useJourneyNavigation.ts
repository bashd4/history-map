import gsap from 'gsap'
import { useEffect, useRef, useState } from 'react'
import type { Journey } from '../data/schema'
import { cameraAt, DWELL, DWELL_ALT, stopsForCamera } from '../lib/journeyCamera'
import { latLngToVector3 } from '../lib/geo'
import { useAppStore } from '../state/store'

/** Total great-circle angle (radians) of the leg between two adjacent stops, through
 *  the destination stop's `via` waypoints. Used to pace the flight: long legs (e.g.
 *  the Panama crossing) travel slower so you can follow the route. */
function legArcLength(journey: Journey, loIdx: number, hiIdx: number): number {
  if (loIdx === hiIdx) return 0
  const dest = journey.stops[hiIdx] // via belongs to the higher-indexed (destination) stop
  const wpts = [journey.stops[loIdx].coords, ...(dest.via ?? []), dest.coords]
  let total = 0
  for (let i = 0; i < wpts.length - 1; i++) {
    total += latLngToVector3(wpts[i].lat, wpts[i].lng).normalize()
      .angleTo(latLngToVector3(wpts[i + 1].lat, wpts[i + 1].lng).normalize())
  }
  return total
}

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

  // The stop we're navigating TOWARD. next()/prev() step off this rather than the
  // live, mid-flight journeyT, so rapid or held arrow presses ACCUMULATE — mashing
  // Right flies several stops ahead instead of re-targeting the same neighbour.
  const targetIndexRef = useRef<number | null>(null)

  const setJourneyT = useAppStore((s) => s.setJourneyT)
  const setNavigating = useAppStore((s) => s.setNavigating)
  const setNearBattleStopIndex = useAppStore((s) => s.setNearBattleStopIndex)
  const setFlight = useAppStore((s) => s.setFlight)
  const setFlightT = useAppStore((s) => s.setFlightT)
  const clearFlight = useAppStore((s) => s.clearFlight)

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
    targetIndexRef.current = clamped
    const targetT = dwellCenterT(clamped, n)

    // Kill any running tween and clear any active flight.
    if (tweenRef.current) {
      tweenRef.current.kill()
      tweenRef.current = null
    }

    // A flight always arrives at the curated framing — clear any wheel zoom.
    useAppStore.getState().setZoom(1)

    const state = useAppStore.getState()
    const currentT = state.journeyT

    // Derive current camera position — if a direct flight is already in progress,
    // sample from the flight's 2-stop array at the current flightT to get the
    // real screen position rather than the snapped journeyT destination.
    let currentCam: ReturnType<typeof cameraAt>
    if (state.flight) {
      const flightStops = [
        { lat: state.flight.from.lat, lng: state.flight.from.lng, camera: { altitude: state.flight.from.altitude } },
        { lat: state.flight.to.lat, lng: state.flight.to.lng, camera: { altitude: state.flight.to.altitude } },
      ]
      currentCam = cameraAt(state.flightT, flightStops)
    } else {
      currentCam = cameraAt(currentT, stops)
    }

    // Clear any prior flight after sampling it above.
    clearFlight()

    const currentActiveIndex = cameraAt(currentT, stops).activeStop
    const delta = currentActiveIndex != null ? Math.abs(clamped - currentActiveIndex) : 2

    if (delta <= 1) {
      // --- Adjacent move: scenic segment flight via journeyT tween (existing) ---
      proxy.current.t = currentT
      // Pace by the leg's GEOGRAPHIC arc length (through via waypoints), not the
      // uniform t-distance: short hops ~1.5 s, long sea legs (Panama ~1.6 rad) ~5 s,
      // so the camera follows the real route instead of flashing past it.
      const legAngle = legArcLength(journey, Math.min(currentActiveIndex!, clamped), Math.max(currentActiveIndex!, clamped))
      const duration = Math.min(6.5, Math.max(1.3, 1.4 + 2.2 * legAngle))

      setNavigating(true)
      tweenRef.current = gsap.to(proxy.current, {
        t: targetT,
        duration,
        ease: 'power2.out', // launch immediately (no slow ease-in) — feels responsive to a keypress
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
    } else {
      // --- Non-adjacent move: direct great-circle flight ---
      const targetStop = journey.stops[clamped]
      const toAltitude = targetStop.camera?.altitude ?? DWELL_ALT

      // Snap journeyT to the destination immediately so timeline highlight
      // and route line reflect the target from the very start of the flight.
      setJourneyT(targetT)

      // Set up the 2-stop flight from current camera position to target.
      const fromEndpoint = {
        lat: currentCam.lat,
        lng: currentCam.lng,
        altitude: currentCam.altitude,
      }
      const toEndpoint = {
        lat: targetStop.coords.lat,
        lng: targetStop.coords.lng,
        altitude: toAltitude,
      }
      setFlight({ from: fromEndpoint, to: toEndpoint })

      // Tween flightT from dwell-center of stop 0 to dwell-center of stop 1
      // in a 2-stop journey. dwellCenterT(0,2) ≈ DWELL/2/2, dwellCenterT(1,2) = 0.75.
      const tStart = dwellCenterT(0, 2)
      const tEnd = dwellCenterT(1, 2)
      proxy.current.t = tStart

      setNavigating(true)
      tweenRef.current = gsap.to(proxy.current, {
        t: tEnd,
        duration: 2.1,
        ease: 'power2.out', // launch immediately (no slow ease-in) — feels responsive to a keypress
        onUpdate: () => {
          setFlightT(proxy.current.t)
        },
        onComplete: () => {
          clearFlight()
          setNavigating(false)
        },
      })
    }
  }

  // Step `dir` stops from the current TARGET (not the live journeyT), so repeated
  // calls accumulate. Falls back to the live active stop when nothing's in flight.
  const step = (dir: number) => {
    const base =
      targetIndexRef.current ??
      cameraAt(useAppStore.getState().journeyT, stops).activeStop ??
      0
    goToStop(base + dir)
  }
  const next = () => step(1)
  const prev = () => step(-1)

  // Keyboard navigation. Each press steps off the running target (via `step`), so
  // distinct taps accumulate — mash Right and you skip several stops ahead in one
  // flight. A HELD arrow auto-repeats; we throttle those to a brisk, controllable
  // cadence (~9 stops/sec) so holding glides forward instead of rocketing to the end.
  useEffect(() => {
    let lastRepeat = 0
    const handler = (e: KeyboardEvent) => {
      if (useAppStore.getState().mode === 'battle') return
      let dir = 0
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === ' ') dir = 1
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') dir = -1
      else return
      e.preventDefault()
      if (e.repeat) {
        const now = performance.now()
        if (now - lastRepeat < 110) return // throttle held-key auto-repeat
        lastRepeat = now
      }
      step(dir)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [n, journey]) // n and journey are stable refs; step is a closure over goToStop

  // Subscribe to requestedStopIndex from the store (set by globe marker clicks).
  useEffect(() => {
    const unsub = useAppStore.subscribe((state, prev) => {
      if (state.requestedStopIndex !== prev.requestedStopIndex &&
          state.requestedStopIndex !== null) {
        if (useAppStore.getState().mode === 'battle') { useAppStore.getState().clearRequestedStop(); return }
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
