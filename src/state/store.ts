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
  /** Index of the battle stop the scroll position is currently dwelling at, or null
   *  when the active stop has no battle. Used to preload the terrain layer (and aim
   *  the preheat camera) before the user clicks ⚔. Only written when the value
   *  changes (change-detected in useScrollProgress) so subscribers re-render rarely. */
  nearBattleStopIndex: number | null
  enterJourney: (id: string) => void
  exitJourney: () => void
  setScrollT: (t: number) => void
  enterBattle: (stopIndex: number) => void
  exitBattle: () => void
  replayBattle: () => void
  setBattleElapsed: (s: number) => void
  setBattlePlaying: (p: boolean) => void
  setHoveredJourneyId: (id: string | null) => void
  setNearBattleStopIndex: (index: number | null) => void
  reset: () => void
}

const initial = {
  mode: 'hub' as Mode, journeyId: null, scrollT: 0,
  battleStopIndex: null, battleElapsed: 0, battlePlaying: false,
  hoveredJourneyId: null, nearBattleStopIndex: null as number | null,
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
  setNearBattleStopIndex: (nearBattleStopIndex) => set({ nearBattleStopIndex }),
  reset: () => set({ ...initial }),
}))
