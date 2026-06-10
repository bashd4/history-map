import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { journeys } from '../journeys'
import { useAppStore } from '../state/store'

export function Hub() {
  const exitJourney = useAppStore((s) => s.exitJourney)
  useEffect(() => {
    exitJourney() // arriving at / always resets to hub mode
    return () => useAppStore.getState().setHoveredJourneyId(null) // clicking a card unmounts before mouseleave fires
  }, [exitJourney])

  return (
    <div className="overlay hub">
      <h1>Paths of History</h1>
      <p className="tagline">Journeys of historical figures, told on the globe.</p>
      <nav>
        {journeys.map((j) => (
          <Link key={j.id} to={`/${j.id}`} className="journey-link"
            onMouseEnter={() => useAppStore.getState().setHoveredJourneyId(j.id)}
            onMouseLeave={() => useAppStore.getState().setHoveredJourneyId(null)}>
            <span className="journey-title">{j.title}</span>
            <span className="journey-meta">{j.figure} · {j.years}</span>
            <span className="journey-intro">{j.intro}</span>
          </Link>
        ))}
      </nav>
    </div>
  )
}
