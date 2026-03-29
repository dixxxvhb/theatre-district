import type { Property } from '../../types'

export interface PropertySlice {
  properties: Property[]
  ownedPropertyIds: string[]
  activePropertyId: string | null
  setProperties: (properties: Property[]) => void
  buyProperty: (propertyId: string) => void
  setActiveProperty: (propertyId: string) => void
}

export const createPropertySlice = (
  set: (fn: (state: PropertySlice) => Partial<PropertySlice>) => void,
  get: () => PropertySlice
): PropertySlice => ({
  properties: [],
  ownedPropertyIds: [],
  activePropertyId: null,

  setProperties: (properties) => set(() => ({ properties })),

  buyProperty: (propertyId) =>
    set((state) => ({
      ownedPropertyIds: [...state.ownedPropertyIds, propertyId],
      activePropertyId: state.activePropertyId ?? propertyId,
    })),

  setActiveProperty: (propertyId) => {
    const state = get()
    if (state.ownedPropertyIds.includes(propertyId)) {
      set(() => ({ activePropertyId: propertyId }))
    }
  },
})
