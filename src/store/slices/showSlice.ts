import type { Show } from '../../types'

export interface ShowSlice {
  availableShows: Show[]
  currentShow: Show | null
  pastShows: Show[]
  setAvailableShows: (shows: Show[]) => void
  selectShow: (showId: string) => void
  updateCurrentShow: (updates: Partial<Show>) => void
  closeShow: () => void
}

export const createShowSlice = (
  set: (fn: (state: ShowSlice) => Partial<ShowSlice>) => void
): ShowSlice => ({
  availableShows: [],
  currentShow: null,
  pastShows: [],

  setAvailableShows: (shows) => set(() => ({ availableShows: shows })),

  selectShow: (showId) =>
    set((state) => {
      const show = state.availableShows.find((s) => s.id === showId)
      if (!show) return {}
      return {
        currentShow: { ...show, status: 'in_production' },
        availableShows: state.availableShows.filter((s) => s.id !== showId),
      }
    }),

  updateCurrentShow: (updates) =>
    set((state) =>
      state.currentShow
        ? { currentShow: { ...state.currentShow, ...updates } }
        : {}
    ),

  closeShow: () =>
    set((state) => {
      if (!state.currentShow) return {}
      return {
        pastShows: [...state.pastShows, { ...state.currentShow, status: 'closed' }],
        currentShow: null,
      }
    }),
})
