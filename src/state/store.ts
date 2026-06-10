import { create } from 'zustand'

export type Mode = 'hub' | 'journey' | 'battle'

interface AppState {
  mode: Mode
  journeyId: string | null
  scrollT: number
  battleStopIndex: number | null
  battleElapsed: number
  battlePlaying: boolean
  enterJourney: (id: string) => void
  exitJourney: () => void
  setScrollT: (t: number) => void
  enterBattle: (stopIndex: number) => void
  exitBattle: () => void
  setBattleElapsed: (s: number) => void
  setBattlePlaying: (p: boolean) => void
  reset: () => void
}

const initial = {
  mode: 'hub' as Mode, journeyId: null, scrollT: 0,
  battleStopIndex: null, battleElapsed: 0, battlePlaying: false,
}

export const useAppStore = create<AppState>((set) => ({
  ...initial,
  enterJourney: (id) => set({ mode: 'journey', journeyId: id, scrollT: 0 }),
  exitJourney: () => set({ ...initial }),
  setScrollT: (scrollT) => set({ scrollT }),
  enterBattle: (battleStopIndex) =>
    set({ mode: 'battle', battleStopIndex, battleElapsed: 0, battlePlaying: true }),
  exitBattle: () => set({ mode: 'journey', battleStopIndex: null, battlePlaying: false }),
  setBattleElapsed: (battleElapsed) => set({ battleElapsed }),
  setBattlePlaying: (battlePlaying) => set({ battlePlaying }),
  reset: () => set({ ...initial }),
}))
