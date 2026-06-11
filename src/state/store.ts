import { create } from 'zustand'

export type Mode = 'hub' | 'journey' | 'battle'

interface AppState {
  mode: Mode
  journeyId: string | null
  scrollT: number
  battleStopIndex: number | null
  battleElapsed: number
  battlePlaying: boolean
  hoveredJourneyId: string | null
  /** True when the scroll position is dwelling at a stop that has a battle — used to
   *  preload the terrain layer before the user clicks ⚔. Only changes when the stop
   *  type changes (battle vs non-battle) so components subscribing to it re-render rarely. */
  nearBattleStop: boolean
  enterJourney: (id: string) => void
  exitJourney: () => void
  setScrollT: (t: number) => void
  enterBattle: (stopIndex: number) => void
  exitBattle: () => void
  replayBattle: () => void
  setBattleElapsed: (s: number) => void
  setBattlePlaying: (p: boolean) => void
  setHoveredJourneyId: (id: string | null) => void
  setNearBattleStop: (near: boolean) => void
  reset: () => void
}

const initial = {
  mode: 'hub' as Mode, journeyId: null, scrollT: 0,
  battleStopIndex: null, battleElapsed: 0, battlePlaying: false,
  hoveredJourneyId: null, nearBattleStop: false,
}

export const useAppStore = create<AppState>((set) => ({
  ...initial,
  enterJourney: (id) => set({ mode: 'journey', journeyId: id, scrollT: 0 }),
  exitJourney: () => set({ ...initial }),
  setScrollT: (scrollT) => set({ scrollT }),
  enterBattle: (battleStopIndex) =>
    set({ mode: 'battle', battleStopIndex, battleElapsed: 0, battlePlaying: true }),
  exitBattle: () => set({ mode: 'journey', battleStopIndex: null, battlePlaying: false }),
  replayBattle: () => set({ battleElapsed: 0, battlePlaying: true }),
  setBattleElapsed: (battleElapsed) => set({ battleElapsed }),
  setBattlePlaying: (battlePlaying) => set({ battlePlaying }),
  setHoveredJourneyId: (hoveredJourneyId) => set({ hoveredJourneyId }),
  setNearBattleStop: (nearBattleStop) => set({ nearBattleStop }),
  reset: () => set({ ...initial }),
}))
