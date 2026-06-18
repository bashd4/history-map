import { useEffect } from 'react'
import { useAppStore } from '../state/store'

const ZOOM_MIN = 0.12
const ZOOM_MAX = 6

/**
 * Wheel / trackpad-pinch zoom while focused on a journey stop.
 * Multiplies store.zoom (camera altitude multiplier in CameraRig).
 * Inactive in hub mode and in battle mode (where OrbitControls owns the wheel for
 * free zoom). Wheel events over the timeline panel, story card, or battle footer
 * keep their native behavior (list scrolling etc.).
 */
export function useWheelZoom() {
  useEffect(() => {
    const handler = (e: WheelEvent) => {
      const { mode, zoom, setZoom, navigating } = useAppStore.getState()
      // Only journey mode uses the altitude-multiplier zoom. Hub: no zoom.
      // Battle: OrbitControls owns pan/zoom. Mid-flight: flights own framing.
      if (mode !== 'journey' || navigating) return
      const target = e.target as Element | null
      if (target?.closest('.timeline-panel, .battle-footer, .story-card')) return
      e.preventDefault()
      // Normalize deltaMode: Firefox mechanical mice report DOM_DELTA_LINE (1).
      const deltaY = e.deltaMode === 1 ? e.deltaY * 30 : e.deltaMode === 2 ? e.deltaY * 300 : e.deltaY
      // deltaY > 0 (wheel down / pinch in) zooms OUT → larger altitude.
      // Trackpad pinch arrives as wheel with ctrlKey and small deltas — boost it.
      const k = e.ctrlKey ? 0.005 : 0.0015
      setZoom(Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoom * Math.exp(deltaY * k))))
    }
    // passive: false — we conditionally preventDefault
    window.addEventListener('wheel', handler, { passive: false })
    return () => window.removeEventListener('wheel', handler)
  }, [])
}
