import { useEffect, useRef } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import type { Journey } from '../data/schema'
import { journeyById } from '../journeys'
import { cameraAt, stopsForCamera } from '../lib/journeyCamera'
import { useJourneyNavigation, dwellCenterT } from '../hooks/useJourneyNavigation'
import { useAppStore } from '../state/store'
import { BattleOverlay } from './BattleOverlay'

export function JourneyRoute() {
  const { journeyId } = useParams()
  const journey = journeyId ? journeyById(journeyId) : undefined
  if (!journey) return <div className="overlay hub"><h1>Unknown journey</h1><Link to="/">← Back</Link></div>
  return <JourneyStory journey={journey} />
}

function JourneyStory({ journey }: { journey: Journey }) {
  const enterJourney = useAppStore((s) => s.enterJourney)
  const setJourneyT = useAppStore((s) => s.setJourneyT)
  const enterBattle = useAppStore((s) => s.enterBattle)
  const mode = useAppStore((s) => s.mode)
  const journeyT = useAppStore((s) => s.journeyT)
  const [searchParams] = useSearchParams()
  const stopParam = searchParams.get('stop')

  const navigating = useAppStore((s) => s.navigating)
  const { goToStop, activeStopIndex } = useJourneyNavigation(journey)
  const n = journey.stops.length
  const activeItemRef = useRef<HTMLLIElement | null>(null)

  // Enter journey on mount and position camera at stop 0 dwell center.
  useEffect(() => {
    enterJourney(journey.id)
    // DEV: ?stop=N jumps instantly, no tween.
    if (import.meta.env.DEV && stopParam != null) {
      const idx = Number(stopParam)
      if (Number.isFinite(idx)) {
        setJourneyT(dwellCenterT(Math.max(0, Math.min(n - 1, idx)), n))
        return
      }
    }
    setJourneyT(dwellCenterT(0, n))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [journey.id])

  // Scroll the active timeline item into view whenever it changes.
  // During navigation tweens use 'instant' (or 'auto') to avoid jitter on long flights.
  useEffect(() => {
    if (activeItemRef.current) {
      activeItemRef.current.scrollIntoView({ block: 'nearest', behavior: navigating ? 'auto' : 'smooth' })
    }
  }, [activeStopIndex, navigating])

  const cam = cameraAt(journeyT, stopsForCamera(journey))
  const stop = cam.activeStop != null ? journey.stops[cam.activeStop] : null
  const battleStop = useAppStore((s) =>
    s.battleStopIndex != null ? journey.stops[s.battleStopIndex] : null,
  )

  return (
    <div>
      {/* Journey header — hidden during battle */}
      {mode !== 'battle' && (
        <header className="overlay journey-header">
          <span>{journey.title}</span>
          <Link to="/" aria-label="Back to globe">✕</Link>
        </header>
      )}

      {/* Timeline panel — left side, hidden during battle */}
      {mode !== 'battle' && (
        <nav className="overlay timeline-panel" aria-label="Journey stops">
          <ul className="timeline-list">
            {journey.stops.map((s, i) => (
              <li
                key={i}
                ref={activeStopIndex === i ? activeItemRef : null}
                className={`timeline-item${activeStopIndex === i ? ' timeline-item--active' : ''}`}
                role="button"
                tabIndex={0}
                onClick={() => goToStop(i)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    if (e.key === ' ') e.preventDefault()
                    goToStop(i)
                  }
                }}
              >
                <span className="timeline-bullet">{i + 1}</span>
                <span className="timeline-info">
                  <span className="timeline-name">{s.name}</span>
                  <span className="timeline-date">{s.date}</span>
                </span>
              </li>
            ))}
          </ul>
          <div className="timeline-nav">
            <button
              className="timeline-nav-btn"
              disabled={navigating}
              onClick={() => {
                const base = activeStopIndex ?? 0
                goToStop(base - 1)
              }}
              aria-label="Previous stop"
            >
              ◀
            </button>
            <span className="timeline-nav-hint">← → keys</span>
            <button
              className="timeline-nav-btn"
              disabled={navigating}
              onClick={() => {
                const base = activeStopIndex ?? 0
                goToStop(base + 1)
              }}
              aria-label="Next stop"
            >
              ▶
            </button>
          </div>
        </nav>
      )}

      {/* Story card — right side */}
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

      {/* Battle overlay */}
      {mode === 'battle' && battleStop?.battle && <BattleOverlay battle={battleStop.battle} />}
    </div>
  )
}
