export interface MarketingSlice {
  buzzScore: number
  setBuzz: (buzz: number) => void
  addBuzz: (amount: number) => void
  decayBuzz: (amount: number) => void
  resetBuzz: () => void
}

export const createMarketingSlice = (
  set: (fn: (state: MarketingSlice) => Partial<MarketingSlice>) => void
): MarketingSlice => ({
  buzzScore: 0,

  setBuzz: (buzz) => set(() => ({ buzzScore: Math.max(0, Math.min(100, buzz)) })),
  addBuzz: (amount) =>
    set((state) => ({ buzzScore: Math.max(0, Math.min(100, state.buzzScore + amount)) })),
  decayBuzz: (amount) =>
    set((state) => ({ buzzScore: Math.max(0, state.buzzScore - amount) })),
  resetBuzz: () => set(() => ({ buzzScore: 0 })),
})
