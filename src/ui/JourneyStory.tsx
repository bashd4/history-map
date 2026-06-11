import { useEffect, useRef } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import type { Journey } from '../data/schema'
import { journeyById } from '../journeys'
import { cameraAt, stopsForCamera } from '../lib/journeyCamera'
import { useScrollProgress } from '../hooks/useScrollProgress'
import { useAppStore } from '../state/store'
import { BattleOverlay } from './BattleOverlay'

export function JourneyRoute() {
  const { journeyId } = useParams()
  const journey = journeyId ? journeyById(journeyId) : undefined
  if (!journey) return <div className="overlay hub"><h1>Unknown journey</h1><Link to="/">← Back</Link></div>
  return <JourneyStory journey={journey} />
}

function JourneyStory({ journey }: { journey: Journey }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const savedScrollY = useRef<number>(0)
  const enterJourney = useAppStore((s) => s.enterJourney)
  const enterBattle = useAppStore((s) => s.enterBattle)
  const mode = useAppStore((s) => s.mode)
  const scrollT = useAppStore((s) => s.scrollT)
  const battleStopIndex = useAppStore((s) => s.battleStopIndex)
  const [searchParams] = useSearchParams()
  const stopParam = searchParams.get('stop')

  // Scroll lock when entering battle mode
  useEffect(() => {
    if (mode !== 'battle') return
    savedScrollY.current = window.scrollY
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
      window.scrollTo(0, savedScrollY.current)
    }
  }, [mode])

  useEffect(() => { enterJourney(journey.id); window.scrollTo(0, 0) }, [journey.id, enterJourney])
  useScrollProgress(containerRef, journey)

  // dev jump: /napoleon?stop=8 scrolls to stop 8's dwell
  useEffect(() => {
    if (!import.meta.env.DEV) return
    const n = Number(stopParam)
    if (stopParam == null || !Number.isFinite(n) || !containerRef.current) return
    const el = containerRef.current
    requestAnimationFrame(() => {
      const scrollable = el.scrollHeight - window.innerHeight
      window.scrollTo(0, ((n + 0.2) / journey.stops.length) * scrollable)
    })
  }, [journey, stopParam])

  const cam = cameraAt(scrollT, stopsForCamera(journey))
  const stop = cam.activeStop != null ? journey.stops[cam.activeStop] : null

  const battleStop = battleStopIndex != null ? journey.stops[battleStopIndex] : null

  return (
    <div style={{ position: 'relative' }}>
      <div ref={containerRef} style={{ height: `${journey.stops.length * 100}vh`, position: 'relative' }} />
      <footer className="journey-outro">
        <p className="card-date">{journey.figure} · {journey.years}</p>
        <Link to="/">← Back to the globe</Link>
      </footer>
      {mode !== 'battle' && (
        <header className="overlay journey-header">
          <span>{journey.title}</span>
          <Link to="/" aria-label="Back to globe">✕</Link>
        </header>
      )}
      {stop && mode === 'journey' && (
        <article className="overlay story-card" style={{ opacity: cam.cardOpacity }}>
          <div className="card-date">{stop.date}</div>
          <h3>{stop.name}</h3>
          <p>{stop.story}</p>
          {stop.battle && (
            <button className="battle-button" onClick={() => enterBattle(cam.activeStop!)}>
              ⚔ Witness the battle
            </button>
          )}
        </article>
      )}
      {mode === 'battle' && battleStop?.battle && <BattleOverlay battle={battleStop.battle} />}
    </div>
  )
}
