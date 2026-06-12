// ============================================================================
// THEATRE DISTRICT — BALANCE
// Every tunable number in the game lives in this file. No magic numbers in
// logic code, ever. Tuning the game must be a five-minute job.
//
// Organized by system. Values marked [LOCKED] come from the v2.1 spec and
// must not change without a design decision from Dixon
// (docs/DESIGN_DECISIONS.md). Everything else is fair game for tuning.
// ============================================================================

// ---------------------------------------------------------------------------
// TIME & SIMULATION
// ---------------------------------------------------------------------------
export const TIME = {
  /** [LOCKED] Fixed sim rate at 1x speed. Render is decoupled and interpolates. */
  SIM_TICKS_PER_SECOND: 10,
  /** [LOCKED] One in-game day at 1x speed. 90s × 10 ticks = 900 ticks/day. */
  REAL_SECONDS_PER_DAY: 90,
  /** Derived: sim ticks in one in-game day. */
  TICKS_PER_DAY: 90 * 10,
  /** [LOCKED] Clamp on accumulated frame delta (ms) so a backgrounded tab
   *  regaining focus can't spiral the accumulator. */
  MAX_FRAME_DELTA_MS: 250,
  /** Speed multipliers: more sim ticks per real frame. Never frame-delta scaling. */
  SPEED_MULTIPLIERS: { paused: 0, normal: 1, fast: 2, ultra: 4 } as const,
} as const;

// ---------------------------------------------------------------------------
// CALENDAR  [LOCKED structure]
// Week = 7 days · season = 4 weeks · year = 4 seasons (~2.8h at 1x).
// ---------------------------------------------------------------------------
export const CALENDAR = {
  DAYS_PER_WEEK: 7,
  WEEKS_PER_SEASON: 4,
  SEASONS_PER_YEAR: 4,
  /** Day 1 of a new game lands on this weekday index (0 = Monday). */
  STARTING_WEEKDAY: 0,
  /** Order is gameplay-relevant: spring = Tony season, summer = tourists,
   *  fall = openings, winter = the slump. */
  SEASONS: ['spring', 'summer', 'fall', 'winter'] as const,
  WEEKDAY_NAMES: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const,
} as const;

// ---------------------------------------------------------------------------
// DAILY SHOWTIME PULSE
// Phase boundaries as fractions of the day [start, end). The street's rhythm:
// quiet afternoon → pre-show gathering → curtain (street goes quiet) →
// post-show rush → wind-down. Tuned so the exciting parts get screen time.
// ---------------------------------------------------------------------------
export const DAY_PHASES = {
  quiet:    { start: 0.0,  end: 0.35 },
  preshow:  { start: 0.35, end: 0.55 },
  curtain:  { start: 0.55, end: 0.75 },
  postshow: { start: 0.75, end: 0.9 },
  winddown: { start: 0.9,  end: 1.0 },
} as const;

// ---------------------------------------------------------------------------
// STREET TOPOLOGY  [LOCKED]
// Horizontal iso strip. Rows, north to south:
// lot(3) · sidewalk(1) · road(2) · sidewalk(1) · lot(3)  = 10 rows total.
// ---------------------------------------------------------------------------
export const STREET = {
  LOT_DEPTH: 3,
  SIDEWALK_ROWS: 1,
  ROAD_ROWS: 2,
  /** Derived: total rows in the strip. */
  TOTAL_ROWS: 3 + 1 + 2 + 1 + 3,
  /** [LOCKED] Street length (columns) by era index 0–4. */
  COLUMNS_BY_ERA: [20, 28, 40, 52, 64] as const,
} as const;

// ---------------------------------------------------------------------------
// FOOTPRINTS  (finalized Session 1 — engineering call within spec ranges)
// width = columns along the street, depth = rows into the lot (max 3).
// ---------------------------------------------------------------------------
export const FOOTPRINTS = {
  theatre_playhouse: { width: 3, depth: 3 },
  theatre_midhouse:  { width: 4, depth: 3 },
  theatre_grand:     { width: 6, depth: 3 },
  amenity_small:     { width: 2, depth: 3 },
  amenity_large:     { width: 3, depth: 3 },
  decoration:        { width: 1, depth: 1 },
} as const;

// ---------------------------------------------------------------------------
// BUILD CATALOG
// Costs, build times, footprints, and buzz emission per placeable kind.
// Footprint width = columns along the street; theatres/amenities are 3 deep
// (full lot), decoration is 1×1. Buzz emission feeds the locked Buzz spec.
// ---------------------------------------------------------------------------
export interface CatalogEntry {
  label: string;
  cost: number;
  buildDays: number;
  width: number;
  buzz: number;
  /** Theatre seats (theatres only) — the box-office ceiling. */
  capacity?: number;
}

export const THEATRES = {
  theatre_playhouse: { label: 'Playhouse', cost: 28_000, buildDays: 5, width: 3, buzz: 8, capacity: 120 },
  theatre_midhouse:  { label: 'Mid-house', cost: 70_000, buildDays: 8, width: 4, buzz: 10, capacity: 320 },
  theatre_grand:     { label: 'Grand Theatre', cost: 160_000, buildDays: 12, width: 6, buzz: 14, capacity: 700 },
} as const satisfies Record<string, CatalogEntry>;

export const AMENITIES = {
  food_cart:   { label: 'Food Cart', cost: 2_500, buildDays: 1, width: 2, buzz: 2.5 },
  cafe:        { label: 'Cafe', cost: 8_000, buildDays: 2, width: 2, buzz: 3 },
  bar:         { label: 'Bar', cost: 9_500, buildDays: 2, width: 2, buzz: 3.5 },
  gift_shop:   { label: 'Gift Shop', cost: 7_000, buildDays: 2, width: 2, buzz: 2.5 },
  restaurant:  { label: 'Restaurant', cost: 14_000, buildDays: 3, width: 3, buzz: 4 },
  late_lounge: { label: 'Late Lounge', cost: 16_000, buildDays: 3, width: 3, buzz: 4.5 },
} as const satisfies Record<string, CatalogEntry>;

export const DECORATIONS = {
  street_lamp:   { label: 'Street Lamp', cost: 350, buzz: 1.2 },
  bench:         { label: 'Bench', cost: 400, buzz: 0.8 },
  planter:       { label: 'Planter', cost: 250, buzz: 0.8 },
  tree:          { label: 'Tree', cost: 600, buzz: 1.4 },
  poster_board:  { label: 'Poster Board', cost: 650, buzz: 1.2 },
  banner_pole:   { label: 'Banner Pole', cost: 700, buzz: 1.0 },
  string_lights: { label: 'String Lights', cost: 900, buzz: 1.8 },
  newsstand:     { label: 'Newsstand', cost: 1_200, buzz: 1.2 },
  phone_booth:   { label: 'Phone Booth', cost: 900, buzz: 0.8 },
  steam_grate:   { label: 'Steam Grate', cost: 500, buzz: 0.6 },
  fountain:      { label: 'Fountain', cost: 4_500, buzz: 2.2 },
  billboard:     { label: 'Billboard', cost: 3_200, buzz: 1.8 },
} as const satisfies Record<string, { label: string; cost: number; buzz: number }>;

/** Demolishing a building refunds this fraction of its cost. Decoration: none. */
export const DEMOLISH_REFUND = 0.25;

// ---------------------------------------------------------------------------
// BUZZ  [LOCKED spec — see CLAUDE.md]
// ---------------------------------------------------------------------------
export const BUZZ = {
  /** Spread radius in tiles (Chebyshev rings); zero at SPREAD+1. */
  SPREAD: 3,
  /** Linear falloff per ring: 1.0, 0.75, 0.5, 0.25, then 0. */
  FALLOFF: [1.0, 0.75, 0.5, 0.25] as const,
  /** Decoration diminishing returns: per tile, decoration contributions are
   *  sorted strongest-first and weighted by DIMINISH^index. Buildings don't
   *  diminish. Kills the carpet-the-street-in-lamps exploit. */
  DIMINISH: 0.6,
  /** Negative emission from a neglected building (condition below threshold). */
  NEGLECT_EMISSION: -4,
  NEGLECT_THRESHOLD: 0.4,
  /** Derelict (unrestored) buildings always emit this. */
  DERELICT_EMISSION: -4,
  /** Negative buzz per unit of litter on a tile (litter does not spread). */
  LITTER_PER_UNIT: -0.6,
  LITTER_MAX_UNITS: 5,
} as const;

// ---------------------------------------------------------------------------
// MAINTENANCE & LITTER
// ---------------------------------------------------------------------------
export const UPKEEP = {
  /** Daily condition decay for operational buildings. ~1 season to neglect. */
  CONDITION_DECAY_PER_DAY: 0.012,
  /** Daily litter decay without a sweeper (wind, rain, civic miracle). */
  LITTER_DECAY_PER_DAY: 0.25,
  /** Street crew: clears this much litter per tile per day, costs cash daily. */
  SWEEPER_LITTER_PER_DAY: 2,
  SWEEPER_COST_PER_DAY: 120,
} as const;

// ---------------------------------------------------------------------------
// CROWD
// Agents are ephemeral (never saved); these shape the street's daily breath.
// ---------------------------------------------------------------------------
export const CROWD = {
  MAX_AGENTS: 300,
  /** Base spawn probability per sim tick per point of street appeal. */
  SPAWN_PER_APPEAL: 0.008,
  SPAWN_MAX_PER_TICK: 3,
  /** Phase multipliers — the showtime pulse in crowd form. */
  PHASE_SPAWN: { quiet: 0.35, preshow: 1.6, curtain: 0.25, postshow: 0.9, winddown: 0.15 } as const,
  WEEKEND_SPAWN_MULT: 1.45,
  /** Walking speed, world px per sim tick (10 ticks/sec). */
  WALK_SPEED: 7,
  /** Lane wobble within the sidewalk, world px. */
  LANE_SPREAD: 11,
  /** Pause lengths in ticks. */
  SPEND_TICKS: [18, 40] as const,
  PHOTO_TICKS: [12, 25] as const,
  /** Wallet range per visitor; amenity purchases draw from it. */
  WALLET: [20, 60] as const,
  AMENITY_SPEND: [6, 16] as const,
  /** Chance to drop litter when leaving an amenity / after a show. */
  LITTER_CHANCE: 0.22,
  /** Litter flush cadence (sim ticks) — batches store writes. */
  LITTER_FLUSH_TICKS: 40,
} as const;

// ---------------------------------------------------------------------------
// SHOWTIME — the simplified Session-4 production loop. Session 5 replaces the
// show source with the full Production Desk; the rhythm stays.
// ---------------------------------------------------------------------------
export const SHOWTIME = {
  DEFAULT_TICKET_PRICE: 35,
  /** Quality roll for auto-assigned shows (Session 4 placeholder). */
  QUALITY_RANGE: [42, 88] as const,
  /** Walk-in attendance per point of buzz at the theatre's door. */
  WALKINS_PER_BUZZ: 1.6,
  /** Momentum (word-of-mouth lite): nightly nudge scale and decay. */
  MOMENTUM_GAIN: 0.08,
  MOMENTUM_DECAY: 0.03,
  MOMENTUM_MIN: 0.5,
  MOMENTUM_MAX: 1.6,
  /** Marquee ignition cascade: delay per column, total ramp per light. */
  IGNITION_MS_PER_COLUMN: 110,
  IGNITION_RAMP_MS: 600,
} as const;

// ---------------------------------------------------------------------------
// PRODUCTION — the Desk pipeline: commission → cast → rehearse → run.
// Tuned so the first full production lands ~$20–25k all-in [LOCKED anchor].
// ---------------------------------------------------------------------------
export const PRODUCTION = {
  /** Drafting three script options costs this once per commission. */
  COMMISSION_COST: 1_500,
  /** Rights cost by archetype (the spread IS the risk profile). */
  RIGHTS_COST: {
    crowd_pleaser: 6_000,
    safe_bet: 5_000,
    critics_darling: 7_000,
    big_spectacle: 10_000,
    intimate_chamber: 4_000,
    dark_horse: 3_000,
  } as Record<string, number>,
  /** Cast signing fee multiplier on (skill+starPower); daily wage fraction. */
  SIGNING_PER_POINT: 28,
  DAILY_WAGE_PER_POINT: 1.1,
  /** Rehearsal: base readiness gained per day; opening allowed at threshold. */
  REHEARSAL_PER_DAY: 9,
  OPEN_THRESHOLD: 70,
  /** Readiness above threshold converts to a small quality bonus at opening. */
  POLISH_QUALITY_PER_POINT: 0.15,
  /** A director decision lands roughly every N rehearsal days. */
  DECISION_EVERY_DAYS: 4,
  /** Opening-night staging cost. */
  OPENING_COST: 2_000,
  /** Lifecycle: cheap-ticket preview nights before the official opening. */
  PREVIEW_DAYS: 3,
  PREVIEW_PRICE_MULT: 0.5,
  /** Forced closing: fill below this for FORCED_CLOSE_NIGHTS straight nights. */
  FORCED_CLOSE_FILL: 0.1,
  FORCED_CLOSE_NIGHTS: 5,
  /** A run this long earns a farewell-crowd send-off when it closes. */
  FAREWELL_RUN_DAYS: 28,
  /** Daily chance of a street/theatre event. */
  EVENT_CHANCE: 0.22,
  /** Quality formula weights (sum with base; clamped 0–100). */
  QUALITY_BASE: 22,
  QUALITY_SCRIPT_WEIGHT: 0.32,
  QUALITY_CAST_WEIGHT: 0.38,
  /** Reference ticket prices by theatre tier (elasticity anchors, S6). */
  REF_TICKET: { theatre_playhouse: 35, theatre_midhouse: 45, theatre_grand: 60 } as Record<string, number>,
} as const;

// ---------------------------------------------------------------------------
// THEATRE UPGRADES — the old 15 room types as purchasable bonuses (audit §5),
// plus the spec's Fly System. Effects feed real formulas via upgradeEffects().
// ---------------------------------------------------------------------------
export interface UpgradeDef {
  label: string;
  cost: number;
  desc: string;
}

export const UPGRADES = {
  grand_lobby:      { label: 'Grand Lobby', cost: 9_000, desc: 'A gathering place worth arriving early for. Theatre radiates more buzz.' },
  modern_box_office:{ label: 'Modern Box Office', cost: 5_000, desc: 'Faster lines, fuller houses. Small attendance boost.' },
  house_expansion:  { label: 'House Expansion', cost: 14_000, desc: 'More seats in the same bones. +15% capacity.' },
  stage_renovation: { label: 'Stage Renovation', cost: 12_000, desc: 'A stage worthy of ambition. Raises show quality.' },
  backstage_complex:{ label: 'Backstage Complex', cost: 8_000, desc: 'Quick changes, calm crew. The building ages slower.' },
  star_dressing:    { label: 'Star Dressing Rooms', cost: 6_000, desc: 'Stars say yes to comfort. Better casting candidates.' },
  orchestra_pit:    { label: 'Orchestra Pit', cost: 9_000, desc: 'Live music under the stage. Big bonus for musicals.' },
  rehearsal_hall:   { label: 'Rehearsal Hall', cost: 10_000, desc: 'Dedicated space. Rehearsals progress 50% faster.' },
  vip_lounge:       { label: 'VIP Lounge', cost: 12_000, desc: 'Champagne before curtain. Premium on every ticket.' },
  house_bar:        { label: 'House Bar & Concessions', cost: 7_000, desc: 'Intermission pours. A cut of every night adds up.' },
  scenic_storage:   { label: 'Scenic Storage', cost: 4_000, desc: 'Sets live to fight again. Cheaper future productions.' },
  production_office:{ label: 'Production Office', cost: 5_000, desc: 'Paperwork tamed. Commissioning costs halved.' },
  tech_booth:       { label: 'Lighting & Sound Booth', cost: 8_000, desc: 'Cues land crisp. Raises show quality.' },
  green_room:       { label: 'Green Room', cost: 6_000, desc: 'A calm cast is a consistent cast. Momentum decays slower.' },
  restrooms:        { label: 'Renovated Restrooms', cost: 4_000, desc: 'Civilization. Removes the quiet drag on word of mouth.' },
  fly_system:       { label: 'Fly System', cost: 15_000, desc: 'Scenery that soars. Unlocks true spectacle staging.' },
} as const satisfies Record<string, UpgradeDef>;

export type UpgradeId = keyof typeof UPGRADES;

// ---------------------------------------------------------------------------
// ECONOMY  [LOCKED anchors; exact curve numbers are tunable]
// ---------------------------------------------------------------------------
export const ECONOMY = {
  STARTING_CASH: 50_000,
  /** The inherited derelict playhouse. */
  DERELICT_RESTORE_COST: 15_000,
  /** First production all-in target range (show systems draw from this). */
  FIRST_PRODUCTION_BUDGET: 22_500,
  /** No bankruptcy: at $0 the street enters Dark Week instead (Session 7). */
  DARK_WEEK_THRESHOLD: 0,
} as const;

// ---------------------------------------------------------------------------
// SAVES
// ---------------------------------------------------------------------------
export const SAVES = {
  /** [LOCKED] Autosave at day rollover + 3 manual slots. */
  MANUAL_SLOTS: 3,
} as const;

// ---------------------------------------------------------------------------
// CAMERA
// ---------------------------------------------------------------------------
export const CAMERA = {
  MIN_ZOOM: 0.5,
  MAX_ZOOM: 2.5,
  ZOOM_WHEEL_SPEED: 0.0015,
  PAN_KEY_SPEED: 10,
  /** Extra world-space padding around the street the camera may show. */
  BOUNDS_PADDING: 320,
} as const;

// ---------------------------------------------------------------------------
// ISO PROJECTION
// 2:1 diamond tiles. Big enough that a 64-column street stays crisp zoomed in.
// ---------------------------------------------------------------------------
export const ISO = {
  TILE_WIDTH: 128,
  TILE_HEIGHT: 64,
} as const;
