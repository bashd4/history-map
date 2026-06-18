import { useEffect } from 'react'
import { phaseSeconds, playbackAt, totalDuration } from '../lib/battlePlayback'
import type { Battle } from '../data/schema'
import { useAppStore, type BattleView, type BattleBasemap } from '../state/store'
import { BattleCompass } from './BattleCompass'
import { BattleScaleBar } from './BattleScaleBar'

const VIEWS: Array<{ id: BattleView; label: string }> = [
  { id: 'map', label: 'Map' },
  { id: 'field', label: 'Field' },
]

const BASEMAPS: Array<{ id: BattleBasemap; label: string }> = [
  { id: 'satellite', label: 'Imagery' },
  { id: 'relief', label: 'Relief' }, // not "Map" — that label belongs to the view control
]

export function BattleOverlay({ battle }: { battle: Battle }) {
  const battleElapsed = useAppStore((s) => s.battleElapsed)
  const battlePlaying = useAppStore((s) => s.battlePlaying)
  const battleView = useAppStore((s) => s.battleView)
  const battleBasemap = useAppStore((s) => s.battleBasemap)
  const setBattleElapsed = useAppStore((s) => s.setBattleElapsed)
  const setBattlePlaying = useAppStore((s) => s.setBattlePlaying)
  const setBattleView = useAppStore((s) => s.setBattleView)
  const setBattleBasemap = useAppStore((s) => s.setBattleBasemap)
  const replayBattle = useAppStore((s) => s.replayBattle)
  const exitBattle = useAppStore((s) => s.exitBattle)
  const total = totalDuration(battle)
  const { phaseIndex, done } = playbackAt(battle, battleElapsed)

  // Interior phase boundaries as fractions of the whole timeline — drawn as soft
  // tick marks so the phases read as labels on one continuous clock, not cuts.
  const durs = phaseSeconds(battle)
  const phaseTicks: number[] = []
  let acc = 0
  for (let i = 0; i < durs.length - 1; i++) {
    acc += durs[i]
    phaseTicks.push(acc / total)
  }

  // rAF playback clock
  useEffect(() => {
    if (!battlePlaying) return
    let raf: number
    let last = performance.now()
    const tick = (now: number) => {
      const e = useAppStore.getState().battleElapsed
      // Cap the delta so a backgrounded tab doesn't fast-forward on return.
      const dt = Math.min((now - last) / 1000, 0.1)
      const next = Math.min(total, e + dt)
      last = now
      setBattleElapsed(next)
      if (next < total) raf = requestAnimationFrame(tick)
      else setBattlePlaying(false)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [battlePlaying, total, setBattleElapsed, setBattlePlaying])

  // dev jump: ?battle=<phaseIndex>
  useEffect(() => {
    if (!import.meta.env.DEV) return
    const p = new URLSearchParams(window.location.search).get('battle')
    if (p == null) return
    const idx = Number(p)
    if (!Number.isInteger(idx) || idx < 0 || idx >= battle.phases.length) return
    const offset = phaseSeconds(battle).slice(0, idx).reduce((a, x) => a + x, 0)
    setBattleElapsed(offset)
    setBattlePlaying(false)
  }, [battle, setBattleElapsed, setBattlePlaying])

  return (
    <div className="battle-overlay">
      <BattleCompass />
      <BattleScaleBar />
      <header className="battle-header">
        <div>
          <h3>{battle.name}</h3>
          <div className="card-date">{battle.date}</div>
          {battle.strengths && (
            <div className="battle-strengths">
              {Object.entries(battle.strengths).map(([side, text]) => (
                <span key={side} className="battle-strength-chip">
                  <span className="battle-strength-dot"
                    style={{ background: battle.sides[side] ?? '#888888' }} />
                  {text}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="battle-header-right">
          <div className="battle-basemap-switcher" role="group" aria-label="Basemap">
            {BASEMAPS.map((b) => (
              <button key={b.id}
                className={`battle-view-btn${battleBasemap === b.id ? ' battle-view-btn--active' : ''}`}
                aria-pressed={battleBasemap === b.id}
                onClick={() => setBattleBasemap(b.id)}>
                {b.label}
              </button>
            ))}
          </div>
          <div className="battle-view-switcher" role="group" aria-label="Camera view">
            {VIEWS.map((v) => (
              <button key={v.id}
                className={`battle-view-btn${battleView === v.id ? ' battle-view-btn--active' : ''}`}
                aria-pressed={battleView === v.id}
                onClick={() => setBattleView(v.id)}>
                {v.label}
              </button>
            ))}
          </div>
          <button className="battle-close" onClick={exitBattle} aria-label="Exit battle">✕</button>
        </div>
        {battleBasemap === 'relief' && (
          <div className="relief-attribution">
            Relief &copy; Esri — World Hillshade, World Terrain Base
          </div>
        )}
      </header>
      <footer className="battle-footer">
        <button className="battle-play" onClick={() =>
          done ? replayBattle() : setBattlePlaying(!battlePlaying)}>
          {done ? '↻' : battlePlaying ? '❚❚' : '▶'}
        </button>
        <div className="battle-timeline">
          <input type="range" min={0} max={total} step={0.05} value={battleElapsed}
            aria-label="Battle timeline"
            onChange={(e) => { setBattlePlaying(false); setBattleElapsed(Number(e.target.value)) }} />
          <div className="battle-phase-ticks" aria-hidden="true">
            {phaseTicks.map((frac, i) => (
              <span key={i} className="battle-phase-tick" style={{ left: `${frac * 100}%` }} />
            ))}
          </div>
        </div>
        {/* keyed by phase so the narration cross-fades as the battle flows */}
        <p className="battle-caption" key={phaseIndex}>{battle.phases[phaseIndex].caption}</p>
      </footer>
    </div>
  )
}
