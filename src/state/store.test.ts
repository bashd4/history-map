import { beforeEach, describe, expect, it } from 'vitest'
import { useAppStore } from './store'

describe('app store', () => {
  beforeEach(() => {
    useAppStore.getState().reset()
    // reset() preserves lowPerf by design — clear it explicitly so tests
    // are order-independent (e.g. under --sequence.shuffle).
    useAppStore.getState().setLowPerf(false)
  })

  it('starts in hub mode', () => {
    expect(useAppStore.getState().mode).toBe('hub')
  })
  it('enterJourney sets mode and journey id', () => {
    useAppStore.getState().enterJourney('napoleon')
    const s = useAppStore.getState()
    expect(s.mode).toBe('journey'); expect(s.journeyId).toBe('napoleon'); expect(s.journeyT).toBe(0)
  })
  it('navigating starts false', () => {
    expect(useAppStore.getState().navigating).toBe(false)
  })
  it('setNavigating toggles navigating flag', () => {
    useAppStore.getState().setNavigating(true)
    expect(useAppStore.getState().navigating).toBe(true)
    useAppStore.getState().setNavigating(false)
    expect(useAppStore.getState().navigating).toBe(false)
  })
  it('navigating resets on exitJourney', () => {
    useAppStore.getState().enterJourney('napoleon')
    useAppStore.getState().setNavigating(true)
    useAppStore.getState().exitJourney()
    expect(useAppStore.getState().navigating).toBe(false)
  })
  it('enterBattle saves journey position; exitBattle restores mode', () => {
    useAppStore.getState().enterJourney('napoleon')
    useAppStore.getState().setJourneyT(0.57)
    useAppStore.getState().enterBattle(8)
    let s = useAppStore.getState()
    expect(s.mode).toBe('battle'); expect(s.battleStopIndex).toBe(8); expect(s.battleElapsed).toBe(0)
    useAppStore.getState().exitBattle()
    s = useAppStore.getState()
    expect(s.mode).toBe('journey'); expect(s.journeyT).toBe(0.57)
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
  it('lowPerf starts false', () => {
    expect(useAppStore.getState().lowPerf).toBe(false)
  })
  it('setLowPerf latches to true', () => {
    useAppStore.getState().setLowPerf(true)
    expect(useAppStore.getState().lowPerf).toBe(true)
  })
  it('lowPerf persists through reset()', () => {
    useAppStore.getState().setLowPerf(true)
    useAppStore.getState().reset()
    expect(useAppStore.getState().lowPerf).toBe(true)
  })
  it('lowPerf persists through exitJourney()', () => {
    useAppStore.getState().enterJourney('napoleon')
    useAppStore.getState().setLowPerf(true)
    useAppStore.getState().exitJourney()
    expect(useAppStore.getState().lowPerf).toBe(true)
    expect(useAppStore.getState().mode).toBe('hub')
  })
  it('requestStop sets requestedStopIndex', () => {
    useAppStore.getState().requestStop(5)
    expect(useAppStore.getState().requestedStopIndex).toBe(5)
  })
  it('clearRequestedStop nulls requestedStopIndex', () => {
    useAppStore.getState().requestStop(5)
    useAppStore.getState().clearRequestedStop()
    expect(useAppStore.getState().requestedStopIndex).toBeNull()
  })
  it('requestedStopIndex resets on exitJourney', () => {
    useAppStore.getState().enterJourney('napoleon')
    useAppStore.getState().requestStop(3)
    useAppStore.getState().exitJourney()
    expect(useAppStore.getState().requestedStopIndex).toBeNull()
  })
  it('zoom starts at 1', () => {
    expect(useAppStore.getState().zoom).toBe(1)
  })
  it('setZoom updates zoom', () => {
    useAppStore.getState().setZoom(2.5)
    expect(useAppStore.getState().zoom).toBe(2.5)
  })
  it('zoom resets to 1 on enterBattle', () => {
    useAppStore.getState().setZoom(2)
    useAppStore.getState().enterBattle(3)
    expect(useAppStore.getState().zoom).toBe(1)
  })
  it('zoom resets to 1 on exitBattle', () => {
    useAppStore.getState().enterBattle(3)
    useAppStore.getState().setZoom(0.5)
    useAppStore.getState().exitBattle()
    expect(useAppStore.getState().zoom).toBe(1)
  })
  it('zoom resets to 1 on reset()', () => {
    useAppStore.getState().setZoom(3)
    useAppStore.getState().reset()
    expect(useAppStore.getState().zoom).toBe(1)
  })
  it('zoom resets to 1 on enterJourney', () => {
    useAppStore.getState().setZoom(4)
    useAppStore.getState().enterJourney('napoleon')
    expect(useAppStore.getState().zoom).toBe(1)
  })
  it('battleView defaults to map', () => {
    expect(useAppStore.getState().battleView).toBe('map')
  })
  it('setBattleView updates battleView', () => {
    useAppStore.getState().setBattleView('field')
    expect(useAppStore.getState().battleView).toBe('field')
  })
  it('battleView resets to map on enterBattle', () => {
    useAppStore.getState().setBattleView('field')
    useAppStore.getState().enterBattle(8)
    expect(useAppStore.getState().battleView).toBe('map')
  })
  it('battleView resets to map on exitBattle', () => {
    useAppStore.getState().enterBattle(8)
    useAppStore.getState().setBattleView('field')
    useAppStore.getState().exitBattle()
    expect(useAppStore.getState().battleView).toBe('map')
  })
  it('battleView resets to map on reset()', () => {
    useAppStore.getState().setBattleView('field')
    useAppStore.getState().reset()
    expect(useAppStore.getState().battleView).toBe('map')
  })

  it('battleBasemap defaults to satellite', () => {
    expect(useAppStore.getState().battleBasemap).toBe('satellite')
  })
  it('setBattleBasemap updates battleBasemap', () => {
    useAppStore.getState().setBattleBasemap('relief')
    expect(useAppStore.getState().battleBasemap).toBe('relief')
  })
  it('battleBasemap resets to satellite on enterBattle', () => {
    useAppStore.getState().setBattleBasemap('relief')
    useAppStore.getState().enterBattle(3)
    expect(useAppStore.getState().battleBasemap).toBe('satellite')
  })
  it('battleBasemap resets to satellite on exitBattle', () => {
    useAppStore.getState().enterBattle(3)
    useAppStore.getState().setBattleBasemap('relief')
    useAppStore.getState().exitBattle()
    expect(useAppStore.getState().battleBasemap).toBe('satellite')
  })
  it('battleBasemap resets to satellite on reset()', () => {
    useAppStore.getState().setBattleBasemap('relief')
    useAppStore.getState().reset()
    expect(useAppStore.getState().battleBasemap).toBe('satellite')
  })

  // Direct-flight state
  it('flight starts null', () => {
    expect(useAppStore.getState().flight).toBeNull()
  })
  it('flightT starts at 0', () => {
    expect(useAppStore.getState().flightT).toBe(0)
  })
  it('setFlight sets flight and setFlightT updates flightT', () => {
    const f = { from: { lat: 1, lng: 2, altitude: 0.09 }, to: { lat: 10, lng: 20, altitude: 0.09 } }
    useAppStore.getState().setFlight(f)
    expect(useAppStore.getState().flight).toBe(f)
    useAppStore.getState().setFlightT(0.5)
    expect(useAppStore.getState().flightT).toBe(0.5)
  })
  it('clearFlight nulls flight', () => {
    useAppStore.getState().setFlight({ from: { lat: 0, lng: 0, altitude: 0 }, to: { lat: 1, lng: 1, altitude: 0 } })
    useAppStore.getState().clearFlight()
    expect(useAppStore.getState().flight).toBeNull()
  })
  it('flight clears on enterBattle', () => {
    useAppStore.getState().setFlight({ from: { lat: 0, lng: 0, altitude: 0 }, to: { lat: 1, lng: 1, altitude: 0 } })
    useAppStore.getState().enterBattle(3)
    expect(useAppStore.getState().flight).toBeNull()
  })
  it('flight clears on exitJourney', () => {
    useAppStore.getState().enterJourney('napoleon')
    useAppStore.getState().setFlight({ from: { lat: 0, lng: 0, altitude: 0 }, to: { lat: 1, lng: 1, altitude: 0 } })
    useAppStore.getState().exitJourney()
    expect(useAppStore.getState().flight).toBeNull()
  })
  it('flight clears on reset()', () => {
    useAppStore.getState().setFlight({ from: { lat: 0, lng: 0, altitude: 0 }, to: { lat: 1, lng: 1, altitude: 0 } })
    useAppStore.getState().reset()
    expect(useAppStore.getState().flight).toBeNull()
  })
})
