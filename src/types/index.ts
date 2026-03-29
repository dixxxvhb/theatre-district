import type { GamePhase, RoomType, ShowGenre, ShowArchetype, PropertyCondition, CrewRole, GameSpeed } from './enums'

export type { GamePhase, RoomType, ShowGenre, ShowArchetype, PropertyCondition, CrewRole, GameSpeed }

// ─── Property ────────────────────────────────────────────────────────────────

export interface Property {
  id: string
  name: string
  gridWidth: number
  gridHeight: number
  price: number
  condition: PropertyCondition
  locationBonus: {
    attendance: number   // multiplier added to base (0.0–0.3)
    ticketPrice: number  // multiplier added to base (0.0–0.15)
  }
  maxSeats: number
  requiredReputation: number
}

// ─── Grid / Building ──────────────────────────────────────────────────────────

export type CellType = 'empty' | 'room' | 'wall' | 'door'

export interface GridCell {
  x: number
  y: number
  roomId: string | null
  type: CellType
  walkable: boolean
}

export interface Room {
  id: string
  type: RoomType
  x: number           // grid col of top-left corner
  y: number           // grid row of top-left corner
  width: number       // in cells
  height: number      // in cells
  upgradeTier: number // 0 = base, 1–3 = upgrade levels
  constructionDaysLeft: number // 0 = complete
  propertyId: string
}

// ─── Show ─────────────────────────────────────────────────────────────────────

export type ShowStatus = 'available' | 'in_production' | 'running' | 'closed'

export interface Show {
  id: string
  title: string
  genre: ShowGenre
  archetype: ShowArchetype
  scriptQuality: number   // 1–100
  audienceAppeal: number  // 1–100
  complexity: number      // 1–5
  castSize: number
  idealBudget: number
  actualBudget: number
  quality: number         // calculated after rehearsal
  status: ShowStatus
}

// ─── Cast ─────────────────────────────────────────────────────────────────────

export interface CastMember {
  id: string
  name: string
  skill: number        // 1–100
  starPower: number    // 0–50
  salary: number       // weekly
  chemistry: number    // 0–100 (per-show fit)
  reliability: number  // 0–100
  morale: number       // 0–100
  quirk: string | null
  roleIndex: number
  showId: string
}

// ─── Crew ─────────────────────────────────────────────────────────────────────

export interface CrewMember {
  id: string
  name: string
  role: CrewRole
  skill: number        // 1–100
  salary: number       // weekly
  morale: number       // 0–100
  experience: number   // 0–100
}

// ─── Events ──────────────────────────────────────────────────────────────────

export type EventEffectType =
  | 'money'
  | 'reputation'
  | 'buzz'
  | 'morale_cast'
  | 'morale_crew'
  | 'quality'
  | 'attendance'

export interface EventEffect {
  type: EventEffectType
  value: number
  duration?: number  // days if temporary
}

export interface EventOption {
  label: string
  description: string
  effects: EventEffect[]
}

export interface GameEvent {
  id: string
  templateId: string
  title: string
  description: string
  options: EventOption[]
  resolved: boolean
  dayOccurred: number
}

// ─── Economy ──────────────────────────────────────────────────────────────────

export interface Transaction {
  day: number
  amount: number       // positive = income, negative = expense
  category: string
  description: string
}

export interface Loan {
  id: string
  principal: number
  totalRepayment: number
  dailyPayment: number
  daysRemaining: number
}

// ─── Runs / Stats ─────────────────────────────────────────────────────────────

export type ReviewTier = 'devastating' | 'negative' | 'mixed' | 'positive' | 'glowing'

export interface CriticReview {
  score: number
  tier: ReviewTier
  dayPublished: number
}

export interface RunStats {
  showId: string
  totalPerformances: number
  totalRevenue: number
  totalExpenses: number
  totalProfit: number
  avgAttendance: number
  peakAttendance: number
  criticReviews: CriticReview[]
}

// ─── Settings ─────────────────────────────────────────────────────────────────

export interface GameSettings {
  musicVolume: number
  sfxVolume: number
  autoSaveEnabled: boolean
  showTooltips: boolean
  defaultSpeed: GameSpeed
}

// ─── Full game state (mirrors store shape, used for save serialization) ───────

export interface GameState {
  companyName: string
  phase: GamePhase
  day: number
  speed: GameSpeed
  paused: boolean
  balance: number
  transactions: Transaction[]
  loans: Loan[]
  properties: Property[]
  ownedPropertyIds: string[]
  activePropertyId: string | null
  grids: Record<string, GridCell[]>
  rooms: Room[]
  availableShows: Show[]
  currentShow: Show | null
  pastShows: Show[]
  auditionPool: CastMember[]
  cast: CastMember[]
  crew: CrewMember[]
  rehearsalReadiness: number
  buzzScore: number
  runDay: number
  runStats: RunStats | null
  activeEvents: GameEvent[]
  eventHistory: string[]
  reputation: number
  milestones: string[]
}
