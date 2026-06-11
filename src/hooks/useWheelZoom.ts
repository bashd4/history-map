import { useEffect } from 'react'
import { useAppStore } from '../state/store'

const ZOOM_MIN = 0.12
const ZOOM_MAX = 6

/**
 * Wheel / trackpad-pinch zoom while focused on a stop or battle.
 * Multiplies store.zoom (camera altitude multiplier in CameraRig).
 * Inactive in hub mode. Wheel events over the timeline panel, story card,
 * or battle footer keep their native behavior (list scrolling etc.).
 */
export function useWheelZoom() {
  useEffect(() => {
    const handler = (e: WheelEvent) => {
      const { mode, zoom, setZoom } = useAppStore.getState()
      if (mode === 'hub') return
      const target = e.target as Element | null
      if (target?.closest('.timeline-panel, .battle-footer, .story-card')) return
      e.preventDefault()
      // deltaY > 0 (wheel down / pinch in) zooms OUT → larger altitude.
      // Trackpad pinch arrives as wheel with ctrlKey and small deltas — boost it.
      const k = e.ctrlKey ? 0.005 : 0.0015
      setZoom(Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoom * Math.exp(e.deltaY * k))))
    }
    // passive: false — we conditionally preventDefault
    window.addEventListener('wheel', handler, { passive: false })
    return () => window.removeEventListener('wheel', handler)
  }, [])
}
