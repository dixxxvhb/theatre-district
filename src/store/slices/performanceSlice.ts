import type { RunStats } from '../../types'

export interface PerformanceSlice {
  runDay: number
  runStats: RunStats | null
  initRunStats: (showId: string) => void
  recordPerformance: (attendance: number, revenue: number, expenses: number) => void
  incrementRunDay: () => void
  resetRun: () => void
}

export const createPerformanceSlice = (
  set: (fn: (state: PerformanceSlice) => Partial<PerformanceSlice>) => void
): PerformanceSlice => ({
  runDay: 0,
  runStats: null,

  initRunStats: (showId) =>
    set(() => ({
      runDay: 0,
      runStats: {
        showId,
        totalPerformances: 0,
        totalRevenue: 0,
        totalExpenses: 0,
        totalProfit: 0,
        avgAttendance: 0,
        peakAttendance: 0,
        criticReviews: [],
      },
    })),

  recordPerformance: (attendance, revenue, expenses) =>
    set((state) => {
      if (!state.runStats) return {}
      const s = state.runStats
      const total = s.totalPerformances + 1
      const totalRevenue = s.totalRevenue + revenue
      const totalExpenses = s.totalExpenses + expenses
      return {
        runStats: {
          ...s,
          totalPerformances: total,
          totalRevenue,
          totalExpenses,
          totalProfit: totalRevenue - totalExpenses,
          avgAttendance: (s.avgAttendance * s.totalPerformances + attendance) / total,
          peakAttendance: Math.max(s.peakAttendance, attendance),
        },
      }
    }),

  incrementRunDay: () => set((state) => ({ runDay: state.runDay + 1 })),

  resetRun: () => set(() => ({ runDay: 0, runStats: null })),
})
