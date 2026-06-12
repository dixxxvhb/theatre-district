// Theatre District state types — the serializable shape held by the Zustand
// store and written to saves. Crowd agents are deliberately ABSENT: they live
// outside the store in the sim module and are never saved.
//
// Legacy Broadway Tycoon types remain in ./index.ts until the show-production
// systems are folded into this store (Session 5).

import type { Speed } from '../game/sim/clock';

// --- Catalog kinds -----------------------------------------------------------

export type TheatreKind = 'theatre_playhouse' | 'theatre_midhouse' | 'theatre_grand';

export type AmenityKind =
  | 'restaurant'
  | 'bar'
  | 'food_cart'
  | 'gift_shop'
  | 'cafe'
  | 'late_lounge';

export type BuildingKind = TheatreKind | AmenityKind;

export type DecorationKind =
  | 'street_lamp'
  | 'tree'
  | 'planter'
  | 'fountain'
  | 'bench'
  | 'poster_board'
  | 'billboard'
  | 'string_lights'
  | 'banner_pole'
  | 'newsstand'
  | 'phone_booth'
  | 'steam_grate';

// --- Placements --------------------------------------------------------------

export interface PlacedBuilding {
  id: string;
  kind: BuildingKind;
  /** West-most column of the footprint. */
  x: number;
  /** Which side of the road the lot is on; rows derive from footprint depth. */
  side: 'north' | 'south';
  /** Days of construction remaining; 0 = operational. */
  constructionDaysLeft: number;
  /** 0..1 maintenance condition (Session 7 wires aging). */
  condition: number;
  /** Purchased Theatre Upgrades (theatres only). */
  upgrades?: string[];
}

export interface PlacedDecoration {
  id: string;
  kind: DecorationKind;
  x: number;
  y: number;
  /** string_lights spans two anchors; second anchor column when present. */
  spanToX?: number;
}

// --- Root state ---------------------------------------------------------------

export interface TimeState {
  day: number; // 1-based
  tickOfDay: number; // 0..TICKS_PER_DAY-1
  speed: Speed;
  /** Speed to restore when unpausing with Space. */
  prePauseSpeed: Exclude<Speed, 'paused'>;
}

export interface EconomyState {
  cash: number;
}

export interface StreetState {
  /** Era index 0..4 — drives street length and progression (Session 8). */
  era: number;
  buildings: PlacedBuilding[];
  decorations: PlacedDecoration[];
}

export interface UpkeepState {
  /** Litter units per tile, keyed "x,y". Crowds drop it; sweepers clear it. */
  litter: Record<string, number>;
  sweeperHired: boolean;
}

export interface SettingsState {
  buzzOverlay: boolean;
}

// --- Production Desk (Session 5) ---------------------------------------------

export type ProductionStage = 'commissioning' | 'casting' | 'rehearsing' | 'previews' | 'running';

export type RoleSlot = 'lead' | 'second' | 'featured' | 'ensemble';

export interface CastMember {
  id: string;
  name: string;
  skill: number; // 0–100
  starPower: number; // 0–100
  personality: string;
  /** One-time signing fee + daily wage, both derived from the numbers above. */
  signingFee: number;
  dailyWage: number;
}

export interface ShowDraft {
  title: string;
  genre: string;
  archetype: string;
  archetypeLabel: string;
  scriptQuality: number; // 0–100
  appeal: number; // 0–100
  rightsCost: number;
}

/** One theatre's production, through the whole pipeline. */
export interface Production {
  stage: ProductionStage;
  /** Three drafts to choose from while commissioning. */
  options?: ShowDraft[];
  show?: ShowDraft;
  cast: Partial<Record<RoleSlot, CastMember>>;
  /** Casting pool per role, regenerated on demand. */
  candidates?: Partial<Record<RoleSlot, CastMember[]>>;
  readiness: number; // 0–100 while rehearsing
  rehearsalDays: number;
  usedDecisionIds: string[];
  /** Accumulated quality effects from director decisions (applied at opening). */
  qualityNudge: number;
  /** Set once at opening from script + cast + upgrades + polish. */
  quality: number;
  momentum: number;
  ticketPrice: number;
  lastAttendance: number;
  /** Cumulative box office for this show's run. */
  gross: number;
  runDays: number;
  /** Lifecycle (Session 6): cheap-ticket preview nights before opening. */
  previewDays: number;
  /** Opening-night verdicts from the three critics. */
  reviews?: Array<{ critic: string; stars: number; line: string }>;
  /** Consecutive nights under the forced-closing fill threshold. */
  belowParNights: number;
}

/** A pending director decision — gameplay-pausing (spec: decision modals auto-pause). */
export interface PendingDecision {
  theatreId: string;
  decisionId: string;
}

export interface TDState {
  initialized: boolean;
  districtName: string;
  time: TimeState;
  economy: EconomyState;
  street: StreetState;
  upkeep: UpkeepState;
  /** Keyed by theatre building id. */
  productions: Record<string, Production>;
  /** Auto-pauses the game until answered. */
  pendingDecision: PendingDecision | null;
  /** Daily-event modal (auto-pauses); passive events apply instantly. */
  pendingEvent: { eventId: string; theatreId?: string } | null;
  /** Temporary street-wide modifiers from events (festival crowds etc.). */
  dayMods: { spawnMult: number; untilDay: number } | null;
  /** The Daily Playbill — newest first, last 7 days. */
  playbill: PlaybillEntry[];
  /** Today's weather (Session 7). */
  weather: 'clear' | 'rain' | 'heat';
  /** Dark Week status (Session 7). 0 = not in Dark Week. */
  darkWeekDays: number;
  /** Per-era flag: has the patron rescue been used in this era? */
  patronRescueUsedEra: number;
  settings: SettingsState;
}

export interface PlaybillEntry {
  day: number;
  headline: string;
  lines: string[];
}
