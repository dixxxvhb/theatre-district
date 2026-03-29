export interface ProgressionSlice {
  reputation: number
  milestones: string[]
  addReputation: (delta: number) => void
  unlockMilestone: (milestoneId: string) => void
  hasMilestone: (milestoneId: string) => boolean
}

export const createProgressionSlice = (
  set: (fn: (state: ProgressionSlice) => Partial<ProgressionSlice>) => void,
  get: () => ProgressionSlice
): ProgressionSlice => ({
  reputation: 0,
  milestones: [],

  addReputation: (delta) =>
    set((state) => ({
      reputation: Math.max(0, Math.min(100, state.reputation + delta)),
    })),

  unlockMilestone: (milestoneId) =>
    set((state) =>
      state.milestones.includes(milestoneId)
        ? {}
        : { milestones: [...state.milestones, milestoneId] }
    ),

  hasMilestone: (milestoneId) => get().milestones.includes(milestoneId),
})
