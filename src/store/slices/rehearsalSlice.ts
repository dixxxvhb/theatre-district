export interface RehearsalSlice {
  rehearsalReadiness: number
  tickRehearsal: (gainPerDay: number) => void
  resetRehearsal: () => void
}

export const createRehearsalSlice = (
  set: (fn: (state: RehearsalSlice) => Partial<RehearsalSlice>) => void
): RehearsalSlice => ({
  rehearsalReadiness: 0,

  tickRehearsal: (gainPerDay) =>
    set((state) => ({
      rehearsalReadiness: Math.min(100, state.rehearsalReadiness + gainPerDay),
    })),

  resetRehearsal: () => set(() => ({ rehearsalReadiness: 0 })),
})
