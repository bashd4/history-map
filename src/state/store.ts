import { create } from 'zustand'

export type Mode = 'hub' | 'journey' | 'battle'
export type BattleView = 'map' | 'field' | 'orbit'
export type BattleBasemap = 'satellite' | 'topo'

interface AppState {
  mode: Mode
  journeyId: string | null
  journeyT: number
  navigating: boolean
  battleStopIndex: number | null
  battleElapsed: number
  battlePlaying: boolean
  hoveredJourneyId: string | null
  /** Index of the battle stop currently being dwelled at, or null when the
   *  active stop has no battle. Used to preload the terrain layer (and aim
   *  the preheat camera) before the user clicks ⚔. Only written when the
   *  value changes (change-detected in useJourneyNavigation) so subscribers
   *  re-render rarely. */
  nearBattleStopIndex: number | null
  /** One-way latch: set when median frame dt > 22 ms (~<45 fps) during warmup.
   *  Persists through reset/exitJourney because hardware capability doesn't change. */
  lowPerf: boolean
  /** When set, the navigation hook picks this up, runs goToStop, then clears it.
   *  This allows 3-D marker clicks (RouteArcs) to request navigation without
   *  holding a direct reference to the hook. */
  requestedStopIndex: number | null
  /** Camera altitude multiplier driven by wheel/pinch while focused on a stop
   *  or battle. 1 = curated framing; <1 closer, >1 further out. Reset to 1 on
   *  enterBattle/exitBattle and when a stop flight starts (goToStop). */
  zoom: number
  /** Battle camera mode: map = straight down (default), field = oblique from
   *  fieldAzimuth, orbit = slow rotation around the site. Reset to 'map' on
   *  enterBattle/exitBattle. */
  battleView: BattleView
  /** Basemap shown during battle. 'satellite' = Google Photorealistic 3D Tiles
   *  (default). 'topo' = Esri World Topo XYZ tiles stitched onto a globe patch.
   *  Reset to 'satellite' on enterBattle/exitBattle. */
  battleBasemap: BattleBasemap
  enterJourney: (id: string) => void
  exitJourney: () => void
  setJourneyT: (t: number) => void
  setNavigating: (v: boolean) => void
  enterBattle: (stopIndex: number) => void
  exitBattle: () => void
  replayBattle: () => void
  setBattleElapsed: (s: number) => void
  setBattlePlaying: (p: boolean) => void
  setHoveredJourneyId: (id: string | null) => void
  setNearBattleStopIndex: (index: number | null) => void
  setLowPerf: (v: boolean) => void
  setZoom: (z: number) => void
  setBattleView: (v: BattleView) => void
  setBattleBasemap: (v: BattleBasemap) => void
  requestStop: (index: number) => void
  clearRequestedStop: () => void
  reset: () => void
}

const initial = {
  mode: 'hub' as Mode, journeyId: null, journeyT: 0, navigating: false,
  battleStopIndex: null, battleElapsed: 0, battlePlaying: false,
  hoveredJourneyId: null, nearBattleStopIndex: null as number | null,
  requestedStopIndex: null as number | null,
  zoom: 1,
  battleView: 'map' as BattleView,
  battleBasemap: 'satellite' as BattleBasemap,
  // NOTE: lowPerf is intentionally NOT in initial — it's preserved across resets.
}

export const useAppStore = create<AppState>((set) => ({
  ...initial,
  lowPerf: false,
  enterJourney: (id) => set({ mode: 'journey', journeyId: id, journeyT: 0, zoom: 1 }),
  exitJourney: () => set((s) => ({ ...initial, lowPerf: s.lowPerf })),
  setJourneyT: (journeyT) => set({ journeyT }),
  setNavigating: (navigating) => set({ navigating }),
  enterBattle: (battleStopIndex) =>
    set({ mode: 'battle', battleStopIndex, battleElapsed: 0, battlePlaying: true, zoom: 1, battleView: 'map', battleBasemap: 'satellite' }),
  exitBattle: () =>
    set({ mode: 'journey', battleStopIndex: null, battlePlaying: false, zoom: 1, battleView: 'map', battleBasemap: 'satellite' }),
  replayBattle: () => set({ battleElapsed: 0, battlePlaying: true }),
  setBattleElapsed: (battleElapsed) => set({ battleElapsed }),
  setBattlePlaying: (battlePlaying) => set({ battlePlaying }),
  setHoveredJourneyId: (hoveredJourneyId) => set({ hoveredJourneyId }),
  setNearBattleStopIndex: (nearBattleStopIndex) => set({ nearBattleStopIndex }),
  setLowPerf: (lowPerf) => set({ lowPerf }),
  setZoom: (zoom) => set({ zoom }),
  setBattleView: (battleView) => set({ battleView }),
  setBattleBasemap: (battleBasemap) => set({ battleBasemap }),
  requestStop: (requestedStopIndex) => set({ requestedStopIndex }),
  clearRequestedStop: () => set({ requestedStopIndex: null }),
  reset: () => set((s) => ({ ...initial, lowPerf: s.lowPerf })),
}))
