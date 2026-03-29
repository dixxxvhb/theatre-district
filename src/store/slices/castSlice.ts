import type { CastMember } from '../../types'

export interface CastSlice {
  auditionPool: CastMember[]
  cast: CastMember[]
  setAuditionPool: (pool: CastMember[]) => void
  castMember: (memberId: string) => void
  removeCastMember: (memberId: string) => void
  updateCastMorale: (memberId: string, delta: number) => void
  clearCast: () => void
}

export const createCastSlice = (
  set: (fn: (state: CastSlice) => Partial<CastSlice>) => void
): CastSlice => ({
  auditionPool: [],
  cast: [],

  setAuditionPool: (pool) => set(() => ({ auditionPool: pool })),

  castMember: (memberId) =>
    set((state) => {
      const member = state.auditionPool.find((m) => m.id === memberId)
      if (!member) return {}
      return {
        cast: [...state.cast, member],
        auditionPool: state.auditionPool.filter((m) => m.id !== memberId),
      }
    }),

  removeCastMember: (memberId) =>
    set((state) => ({ cast: state.cast.filter((m) => m.id !== memberId) })),

  updateCastMorale: (memberId, delta) =>
    set((state) => ({
      cast: state.cast.map((m) =>
        m.id === memberId
          ? { ...m, morale: Math.max(0, Math.min(100, m.morale + delta)) }
          : m
      ),
    })),

  clearCast: () => set(() => ({ cast: [], auditionPool: [] })),
})
