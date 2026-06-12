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
