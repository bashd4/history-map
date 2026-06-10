import { useEffect } from 'react'
import { phaseSeconds, playbackAt, totalDuration } from '../lib/battlePlayback'
import type { Battle } from '../data/schema'
import { useAppStore } from '../state/store'

export function BattleOverlay({ battle }: { battle: Battle }) {
  const battleElapsed = useAppStore((s) => s.battleElapsed)
  const battlePlaying = useAppStore((s) => s.battlePlaying)
  const setBattleElapsed = useAppStore((s) => s.setBattleElapsed)
  const setBattlePlaying = useAppStore((s) => s.setBattlePlaying)
  const exitBattle = useAppStore((s) => s.exitBattle)
  const total = totalDuration(battle)
  const { phaseIndex, done } = playbackAt(battle, battleElapsed)

  // rAF playback clock
  useEffect(() => {
    if (!battlePlaying) return
    let raf: number
    let last = performance.now()
    const tick = (now: number) => {
      const e = useAppStore.getState().battleElapsed
      const next = Math.min(total, e + (now - last) / 1000)
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [battle])

  return (
    <div className="battle-overlay">
      <header className="battle-header">
        <div>
          <h3>{battle.name}</h3>
          <div className="card-date">{battle.date} · Phase {phaseIndex + 1} of {battle.phases.length}</div>
        </div>
        <button onClick={exitBattle} aria-label="Exit battle">✕</button>
      </header>
      <footer className="battle-footer">
        <button className="battle-play" onClick={() =>
          done ? (setBattleElapsed(0), setBattlePlaying(true)) : setBattlePlaying(!battlePlaying)}>
          {done ? '↻' : battlePlaying ? '❚❚' : '▶'}
        </button>
        <input type="range" min={0} max={total} step={0.05} value={battleElapsed}
          onChange={(e) => { setBattlePlaying(false); setBattleElapsed(Number(e.target.value)) }} />
        <p className="battle-caption">{battle.phases[phaseIndex].caption}</p>
      </footer>
    </div>
  )
}
