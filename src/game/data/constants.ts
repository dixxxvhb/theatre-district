export const BALANCE = {
  // ─── Economy ───────────────────────────────────────────────────────────────
  STARTING_CASH: 500_000,
  BASE_TICKET_PRICE: 45,
  MIN_TICKET_PRICE: 20,
  MAX_TICKET_PRICE: 150,
  VIP_BASE_PRICE: 75,
  VIP_MIN_PRICE: 50,
  VIP_MAX_PRICE: 250,
  CONCESSION_PER_ATTENDEE: 2.00,
  CONCESSION_UPGRADED: 3.50,
  FACILITY_DAILY_BASE: 100,
  FACILITY_DAILY_PER_ROOM: 25,
  ROOM_DEMOLISH_REFUND: 0.40,
  PROPERTY_SELL_RATIO: 0.60,
  PROPERTY_SELL_DAYS: 7,
  SHOW_COMMISSION_COST: 25_000,
  SHOW_COMMISSION_QUALITY_BONUS: 15,
  SHOW_COMMISSION_DELAY_DAYS: 5,
  SHOW_EXTENSION_COST: 25_000,
  SHOW_EXTENSION_PERFORMANCES: 90,

  // ─── Time ──────────────────────────────────────────────────────────────────
  SPEEDS: { PAUSED: 0, NORMAL: 1, FAST: 2, ULTRA: 4 } as const,
  AUTO_SAVE_INTERVAL_MS: 300_000,

  // ─── Attendance ────────────────────────────────────────────────────────────
  DAY_OF_WEEK_MODIFIERS: {
    0: 0.85,  // Sunday
    1: 0.70,  // Monday
    2: 0.75,  // Tuesday
    3: 0.80,  // Wednesday
    4: 0.85,  // Thursday
    5: 0.90,  // Friday
    6: 1.00,  // Saturday
  } as Record<number, number>,
  MATINEE_DAYS: [3, 0] as number[], // Wednesday (3), Sunday (0) — JS Date.getDay()
  MATINEE_ATTENDANCE_RATIO: 0.70,
  RUN_LENGTH_DECAY_RATE: 1 / 200,
  RUN_LENGTH_DECAY_FLOOR: 0.50,
  PRICE_SENSITIVITY_FACTOR: 0.5,
  LOW_ATTENDANCE_THRESHOLD: 0.30,
  LOW_ATTENDANCE_CLOSE_DAYS: 5,
  MAX_RUN_PERFORMANCES: 180,

  // ─── Show Quality ──────────────────────────────────────────────────────────
  QUALITY_WEIGHTS: {
    SCRIPT: 0.30,
    CAST: 0.25,
    DIRECTOR: 0.15,
    REHEARSAL: 0.15,
    BUDGET: 0.10,
    FACILITY: 0.05,
  } as const,
  QUALITY_VARIANCE: 5,

  // ─── Casting ───────────────────────────────────────────────────────────────
  CANDIDATES_PER_ROLE_MIN: 3,
  CANDIDATES_PER_ROLE_MAX: 5,
  SALARY_SKILL_MULTIPLIER: 50,
  SALARY_STAR_MULTIPLIER: 200,
  SALARY_ACCEPT_THRESHOLD: 0.80,
  STAR_ATTENDANCE_BONUS: 2,

  // ─── Crew ──────────────────────────────────────────────────────────────────
  MAX_CREW_NO_OFFICE: 3,
  MAX_CREW_BASIC_OFFICE: 5,
  MAX_CREW_UPGRADED_OFFICE: 7,
  MAX_CREW_HARD_CAP: 10,
  CREW_FIRE_SEVERANCE_WEEKS: 1,
  CREW_REPLACEMENT_PENALTY_DAYS: 7,
  CREW_REPLACEMENT_EFFECTIVENESS: 0.80,

  // ─── Rehearsal ─────────────────────────────────────────────────────────────
  BASE_READINESS_PER_DAY: 3,
  REHEARSAL_HALL_BONUS: 0.20,
  REHEARSAL_HALL_UPGRADED_BONUS: 0.35,
  MIN_READINESS_TO_OPEN: 60,

  // ─── Marketing ─────────────────────────────────────────────────────────────
  MARKETING_OPTIONS: {
    POSTERS:        { cost: 5_000,  buzzGain: 10 },
    SOCIAL_MEDIA:   { cost: 10_000, buzzGain: 20 },
    PRESS_PREVIEW:  { cost: 20_000, buzzGain: 35 },
    RADIO_ADS:      { cost: 15_000, buzzGain: 25 },
    BILLBOARD:      { cost: 30_000, buzzGain: 40 },
    TV_SPOT:        { cost: 50_000, buzzGain: 55 },
  } as const,
  BUZZ_DECAY_PER_DAY: 0.5,

  // ─── Reputation ────────────────────────────────────────────────────────────
  REP_SHOW_30_PERF:    3,
  REP_SHOW_90_PERF:    5,
  REP_SHOW_180_PERF:   8,
  REP_QUALITY_80:      2,
  REP_QUALITY_90:      5,
  REP_CRITIC_POSITIVE: 2,
  REP_CRITIC_GLOWING:  5,
  REP_CRITIC_NEGATIVE: -2,
  REP_CRITIC_DEVASTATING: -5,
  REP_SHOW_FLOP:      -3,
  REP_BANKRUPTCY:     -20,
  REP_LOAN_DEFAULT:   -10,
  REP_AWARD_WIN:       10,
  REP_AWARD_NOM:        5,
  REP_FULL_HOUSE:       3,

  // ─── Loans ─────────────────────────────────────────────────────────────────
  LOANS: {
    SMALL:  { amount: 100_000, rate: 0.08, termDays: 90 },
    MEDIUM: { amount: 300_000, rate: 0.10, termDays: 180 },
    LARGE:  { amount: 750_000, rate: 0.12, termDays: 360 },
  } as const,
  MAX_ACTIVE_LOANS: 2,
  LOAN_DEFAULT_PENALTY_DAYS: 90,

  // ─── Events ────────────────────────────────────────────────────────────────
  EVENT_CHANCES: {
    CRITIC_VISIT:        0.05,
    SECOND_CRITIC:       0.02,
    ACTOR_FEUD:          0.03,
    STAR_DEMANDS:        0.04,
    ACTOR_ILLNESS:       0.02,
    PLUMBING_ISSUE:      0.02,
    POWER_OUTAGE:        0.01,
    ROOF_LEAK:           0.01,
    STANDING_OVATION:    0.03,
    WALKOUTS:            0.03,
    CELEBRITY_SIGHTING:  0.02,
    PROTEST:             0.01,
    CORPORATE_SPONSOR:   0.001,
    TAX_AUDIT:           0.00033,
    INVESTOR_INTEREST:   0.00066,
  } as const,
  CRITIC_THRESHOLDS: {
    DEVASTATING: 30,
    NEGATIVE:    50,
    MIXED:       70,
    POSITIVE:    85,
  } as const,

  // ─── Bankruptcy ────────────────────────────────────────────────────────────
  BANKRUPTCY_GRACE_DAYS: 30,

  // ─── Construction ──────────────────────────────────────────────────────────
  CONDITION_COST_MODIFIERS: {
    POOR:      1.50,
    FAIR:      1.25,
    GOOD:      1.00,
    EXCELLENT: 0.90,
    PRISTINE:  0.80,
  } as const,
  RENOVATION_COSTS: {
    POOR_TO_FAIR: { cost: 50_000, days: 10 },
    FAIR_TO_GOOD: { cost: 75_000, days: 7 },
  } as const,

  // ─── Room Effects ──────────────────────────────────────────────────────────
  BACKSTAGE_MISSING_PENALTY: 0.15,
  RESTROOM_MISSING_PENALTY: 0.10,
  STAGE_QUALITY_CAPS: { BARE: 70, EQUIPPED: 85, FULL: 100 } as const,
  SEATS_PER_CELL: 10,

  // ─── Morale ────────────────────────────────────────────────────────────────
  MORALE_SHOW_OPEN:    5,
  MORALE_HIT_SHOW:    10,
  MORALE_FLOP:       -10,
  MORALE_MISSED_PAY: -15,
  MORALE_RAISE:       10,
  MORALE_QUIT_THRESHOLD: 30,

  // ─── Tile / Rendering ──────────────────────────────────────────────────────
  TILE_WIDTH:  64,
  TILE_HEIGHT: 32,
  CELL_SIZE:   32,  // floor plan px per cell
} as const
