import type { CrewMember } from '../../types'

export interface CrewSlice {
  crew: CrewMember[]
  hireCrew: (member: CrewMember) => void
  fireCrew: (memberId: string) => void
  updateCrewMorale: (memberId: string, delta: number) => void
  updateCrewExperience: (memberId: string, delta: number) => void
}

export const createCrewSlice = (
  set: (fn: (state: CrewSlice) => Partial<CrewSlice>) => void
): CrewSlice => ({
  crew: [],

  hireCrew: (member) => set((state) => ({ crew: [...state.crew, member] })),

  fireCrew: (memberId) =>
    set((state) => ({ crew: state.crew.filter((c) => c.id !== memberId) })),

  updateCrewMorale: (memberId, delta) =>
    set((state) => ({
      crew: state.crew.map((c) =>
        c.id === memberId
          ? { ...c, morale: Math.max(0, Math.min(100, c.morale + delta)) }
          : c
      ),
    })),

  updateCrewExperience: (memberId, delta) =>
    set((state) => ({
      crew: state.crew.map((c) =>
        c.id === memberId
          ? { ...c, experience: Math.max(0, Math.min(100, c.experience + delta)) }
          : c
      ),
    })),
})
