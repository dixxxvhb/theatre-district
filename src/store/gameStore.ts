import { create } from 'zustand'
import { createTimeSlice, type TimeSlice } from './slices/timeSlice'
import { createEconomySlice, type EconomySlice } from './slices/economySlice'
import { createPropertySlice, type PropertySlice } from './slices/propertySlice'
import { createBuildingSlice, type BuildingSlice } from './slices/buildingSlice'
import { createShowSlice, type ShowSlice } from './slices/showSlice'
import { createCastSlice, type CastSlice } from './slices/castSlice'
import { createCrewSlice, type CrewSlice } from './slices/crewSlice'
import { createRehearsalSlice, type RehearsalSlice } from './slices/rehearsalSlice'
import { createMarketingSlice, type MarketingSlice } from './slices/marketingSlice'
import { createPerformanceSlice, type PerformanceSlice } from './slices/performanceSlice'
import { createEventSlice, type EventSlice } from './slices/eventSlice'
import { createProgressionSlice, type ProgressionSlice } from './slices/progressionSlice'
import { createUiSlice, type UiSlice } from './slices/uiSlice'
import { GamePhase } from '../types/enums'

export interface GameStore
  extends TimeSlice,
    EconomySlice,
    PropertySlice,
    BuildingSlice,
    ShowSlice,
    CastSlice,
    CrewSlice,
    RehearsalSlice,
    MarketingSlice,
    PerformanceSlice,
    EventSlice,
    ProgressionSlice,
    UiSlice {
  // ─── Meta ────────────────────────────────────────────────────────────────
  companyName: string
  phase: GamePhase
  setCompanyName: (name: string) => void
  setPhase: (phase: GamePhase) => void
}

export const useGameStore = create<GameStore>()((set, get) => ({
  // ─── Meta ────────────────────────────────────────────────────────────────
  companyName: '',
  phase: GamePhase.MAIN_MENU,
  setCompanyName: (name) => set(() => ({ companyName: name })),
  setPhase: (phase) => set(() => ({ phase })),

  // ─── Slices ──────────────────────────────────────────────────────────────
  ...createTimeSlice(set as Parameters<typeof createTimeSlice>[0]),
  ...createEconomySlice(set as Parameters<typeof createEconomySlice>[0]),
  ...createPropertySlice(
    set as Parameters<typeof createPropertySlice>[0],
    get as Parameters<typeof createPropertySlice>[1]
  ),
  ...createBuildingSlice(set as Parameters<typeof createBuildingSlice>[0]),
  ...createShowSlice(set as Parameters<typeof createShowSlice>[0]),
  ...createCastSlice(set as Parameters<typeof createCastSlice>[0]),
  ...createCrewSlice(set as Parameters<typeof createCrewSlice>[0]),
  ...createRehearsalSlice(set as Parameters<typeof createRehearsalSlice>[0]),
  ...createMarketingSlice(set as Parameters<typeof createMarketingSlice>[0]),
  ...createPerformanceSlice(set as Parameters<typeof createPerformanceSlice>[0]),
  ...createEventSlice(set as Parameters<typeof createEventSlice>[0]),
  ...createProgressionSlice(
    set as Parameters<typeof createProgressionSlice>[0],
    get as Parameters<typeof createProgressionSlice>[1]
  ),
  ...createUiSlice(set as Parameters<typeof createUiSlice>[0]),
}))
