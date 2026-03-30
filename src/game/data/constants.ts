// All game balance constants live here. Never hardcode numbers in system logic.
// Reference GDD Appendix B for design rationale.

// Room type → hex color for floor plan rendering
export const ROOM_COLORS: Record<string, number> = {
  empty:          0x1a1a2e,
  stage:          0x6b3fa0,
  seating:        0x8b2252,
  lobby:          0xb8860b,
  backstage:      0x4a5568,
  box_office:     0xd97706,
  rehearsal_hall: 0x0d9488,
  dressing_room:  0xe11d48,
  orchestra_pit:  0x1e40af,
  storage:        0x6b7280,
  office:         0x65a30d,
  vip_lounge:     0xca8a04,
  concession:     0xea580c,
  tech_booth:     0x4f46e5,
  green_room:     0x166534,
  restrooms:      0x0284c7,
};

export const CAMERA = {
  MIN_ZOOM: 0.4,
  MAX_ZOOM: 2.5,
  ZOOM_SPEED: 0.06,         // per scroll event — lower = smoother on trackpad
  ZOOM_SPEED_TRACKPAD: 0.004, // trackpad sends deltaMode=0 with tiny deltas
  PAN_SPEED: 8,             // pixels per frame for WASD
  DRAG_BUTTON: 0,           // left mouse
} as const;

export const TILE = {
  ISO_WIDTH: 64,
  ISO_HEIGHT: 32,
  FLOOR_SIZE: 32,           // floor plan cell size in pixels
  GRID_LINE_COLOR: 0x2a2a4e,
  GRID_LINE_WIDTH: 1,
  HOVER_ALPHA: 0.3,
  HOVER_COLOR: 0xffffff,
  SELECTED_COLOR: 0xd4a574,
  SELECTED_ALPHA: 0.5,
} as const;

export const GAME_CONSTANTS = {
  // Time
  TIME: {
    TICKS_PER_DAY_NORMAL: 60,   // ticks per game day at normal speed
    TICKS_PER_DAY_FAST: 30,     // ticks per game day at fast speed
    TICKS_PER_DAY_ULTRA: 15,    // ticks per game day at ultra speed
    DAYS_PER_WEEK: 7,
    DAYS_PER_YEAR: 365,
    STARTING_DAY: 1,
    DARK_DAY: 'Mon',            // Broadway dark day (no performances)
  },

  // Property condition cost modifiers
  CONDITION_MODIFIERS: {
    POOR: 1.5,
    FAIR: 1.25,
    GOOD: 1.0,
    EXCELLENT: 0.9,
    PRISTINE: 0.8,
  },

  // Renovation costs
  RENOVATION: {
    POOR_TO_FAIR_COST: 50_000,
    POOR_TO_FAIR_DAYS: 10,
    FAIR_TO_GOOD_COST: 75_000,
    FAIR_TO_GOOD_DAYS: 7,
  },
  
  // Economy
  ECONOMY: {
    STARTING_CASH: 500_000,    // dollars
    LOAN_INTEREST_RATE: 0.08,  // 8% annual
    BANKRUPTCY_THRESHOLD: -100_000,
    MIN_TICKET_PRICE: 25,
    MAX_TICKET_PRICE: 500,
    DEFAULT_TICKET_PRICE: 75,
  },

  // Properties
  PROPERTIES: {
    SMALL_LOT_COST: 200_000,
    MEDIUM_LOT_COST: 400_000,
    LARGE_LOT_COST: 750_000,
    SMALL_LOT_TILES: { width: 8, height: 6 },
    MEDIUM_LOT_TILES: { width: 12, height: 8 },
    LARGE_LOT_TILES: { width: 16, height: 12 },
  },

  // Building
  BUILDING: {
    TILE_SIZE: 64,             // pixels per tile
    CONSTRUCTION_COST_PER_TILE: 500,
    CONSTRUCTION_DAYS_PER_TILE: 1,
  },

  // Rooms
  ROOMS: {
    STAGE: { minWidth: 4, minHeight: 3, cost: 50_000, buildDays: 14 },
    SEATING: { minWidth: 3, minHeight: 3, cost: 30_000, buildDays: 10, seatsPerTile: 8 },
    LOBBY: { minWidth: 2, minHeight: 2, cost: 15_000, buildDays: 5 },
    BACKSTAGE: { minWidth: 2, minHeight: 2, cost: 20_000, buildDays: 7 },
    BOX_OFFICE: { minWidth: 1, minHeight: 1, cost: 10_000, buildDays: 3 },
    REHEARSAL_HALL: { minWidth: 3, minHeight: 3, cost: 25_000, buildDays: 7 },
    DRESSING_ROOM: { minWidth: 2, minHeight: 1, cost: 12_000, buildDays: 4 },
    ORCHESTRA_PIT: { minWidth: 3, minHeight: 1, cost: 35_000, buildDays: 10 },
    STORAGE: { minWidth: 1, minHeight: 1, cost: 5_000, buildDays: 2 },
    OFFICE: { minWidth: 1, minHeight: 1, cost: 8_000, buildDays: 3 },
  },

  // Shows
  SHOWS: {
    MIN_CAST_SIZE: 3,
    MAX_CAST_SIZE: 30,
    REHEARSAL_DAYS_MIN: 14,
    REHEARSAL_DAYS_MAX: 42,
    BASE_QUALITY: 50,          // out of 100
    CHEMISTRY_BONUS_MAX: 15,
    STAR_POWER_BONUS_MAX: 20,
  },

  // Crew
  CREW: {
    DIRECTOR_SALARY_WEEKLY: 1_500,
    STAGE_MANAGER_SALARY_WEEKLY: 800,
    MUSIC_DIRECTOR_SALARY_WEEKLY: 1_000,
    CHOREOGRAPHER_SALARY_WEEKLY: 900,
    TECH_DIRECTOR_SALARY_WEEKLY: 1_000,
    COSTUME_DESIGNER_SALARY_WEEKLY: 600,
    LIGHTING_DESIGNER_SALARY_WEEKLY: 700,
    SOUND_DESIGNER_SALARY_WEEKLY: 700,
    SET_DESIGNER_SALARY_WEEKLY: 800,
    PUBLICIST_SALARY_WEEKLY: 600,
    HOUSE_MANAGER_SALARY_WEEKLY: 500,
    SEVERANCE_WEEKS: 2,
    NO_OFFICE_MAX_CREW: 3,
    BASIC_OFFICE_MAX_CREW: 5,
    UPGRADED_OFFICE_MAX_CREW: 7,
  },

  // Commission
  COMMISSION: {
    COST: 25_000,
    SCRIPT_QUALITY_BONUS: 15,
    DELIVERY_DELAY_DAYS: 5,
  },

  // Marketing
  MARKETING: {
    POSTER_COST: 2_000,
    RADIO_AD_COST: 5_000,
    NEWSPAPER_AD_COST: 3_000,
    SOCIAL_MEDIA_COST: 1_000,
    TV_AD_COST: 15_000,
    BILLBOARD_COST: 10_000,
    MAX_BUZZ: 100,
  },

  // Performance
  PERFORMANCE: {
    SHOWS_PER_WEEK: 8,        // standard Broadway schedule
    MATINEE_ATTENDANCE_MOD: 0.85,
    SATURDAY_ATTENDANCE_MOD: 1.15,
    OPENING_NIGHT_BUZZ_BONUS: 20,
    CRITIC_REVIEW_WEIGHT: 0.3,
    WORD_OF_MOUTH_WEIGHT: 0.2,
    CLOSING_THRESHOLD_WEEKS: 3, // close if attendance < 30% for this many weeks
    CLOSING_ATTENDANCE_MIN: 0.3,
  },

  // Reputation
  REPUTATION: {
    STARTING_REP: 0,
    MAX_REP: 100,
    HIT_SHOW_REP_GAIN: 10,
    FLOP_REP_LOSS: 5,
    TONY_NOMINATION_REP: 15,
    TONY_WIN_REP: 25,
  },

  // Events
  EVENTS: {
    CHECK_INTERVAL_DAYS: 7,    // check for random events weekly
    EVENT_CHANCE: 0.3,         // 30% chance per check
  },
} as const;

export type GameConstants = typeof GAME_CONSTANTS;
