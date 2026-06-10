import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useEffect } from 'react'
import { useAppStore } from '../state/store'

gsap.registerPlugin(ScrollTrigger)

/** Maps document scroll over the journey container to store.scrollT (0..1). */
export function useScrollProgress(containerRef: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const st = ScrollTrigger.create({
      trigger: el, start: 'top top', end: 'bottom bottom',
      onUpdate: (self) => useAppStore.getState().setScrollT(self.progress),
    })
    return () => st.kill()
  }, [containerRef])
}
