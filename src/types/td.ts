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

/** Session-4 simplified production — one running show per theatre. The full
 *  Production Desk (Session 5) replaces the source; the shape persists. */
export interface SimpleShow {
  title: string;
  /** 0–100 — drives word-of-mouth and (later) reviews. */
  quality: number;
  /** Word-of-mouth multiplier on attendance (MOMENTUM_MIN..MAX). */
  momentum: number;
  ticketPrice: number;
  lastAttendance: number;
}

export interface TDState {
  initialized: boolean;
  districtName: string;
  time: TimeState;
  economy: EconomyState;
  street: StreetState;
  upkeep: UpkeepState;
  /** Keyed by theatre building id. */
  productions: Record<string, SimpleShow>;
  settings: SettingsState;
}
