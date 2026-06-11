import { beforeEach, describe, expect, it } from 'vitest'
import { useAppStore } from './store'

describe('app store', () => {
  beforeEach(() => useAppStore.getState().reset())

  it('starts in hub mode', () => {
    expect(useAppStore.getState().mode).toBe('hub')
  })
  it('enterJourney sets mode and journey id', () => {
    useAppStore.getState().enterJourney('napoleon')
    const s = useAppStore.getState()
    expect(s.mode).toBe('journey'); expect(s.journeyId).toBe('napoleon'); expect(s.scrollT).toBe(0)
  })
  it('enterBattle saves scroll position; exitBattle restores mode', () => {
    useAppStore.getState().enterJourney('napoleon')
    useAppStore.getState().setScrollT(0.57)
    useAppStore.getState().enterBattle(8)
    let s = useAppStore.getState()
    expect(s.mode).toBe('battle'); expect(s.battleStopIndex).toBe(8); expect(s.battleElapsed).toBe(0)
    useAppStore.getState().exitBattle()
    s = useAppStore.getState()
    expect(s.mode).toBe('journey'); expect(s.scrollT).toBe(0.57)
  })
  it('replayBattle resets elapsed and resumes playing', () => {
    useAppStore.getState().enterBattle(8)
    useAppStore.getState().setBattleElapsed(30)
    useAppStore.getState().setBattlePlaying(false)
    useAppStore.getState().replayBattle()
    const s = useAppStore.getState()
    expect(s.battleElapsed).toBe(0); expect(s.battlePlaying).toBe(true)
  })
  it('exitJourney returns to hub', () => {
    useAppStore.getState().enterJourney('napoleon')
    useAppStore.getState().exitJourney()
    expect(useAppStore.getState().mode).toBe('hub')
  })
  it('nearBattleStopIndex set/cleared and reset by exitJourney', () => {
    useAppStore.getState().enterJourney('napoleon')
    useAppStore.getState().setNearBattleStopIndex(8)
    expect(useAppStore.getState().nearBattleStopIndex).toBe(8)
    useAppStore.getState().setNearBattleStopIndex(null)
    expect(useAppStore.getState().nearBattleStopIndex).toBeNull()
    useAppStore.getState().setNearBattleStopIndex(8)
    useAppStore.getState().exitJourney()
    expect(useAppStore.getState().nearBattleStopIndex).toBeNull()
  })
})
