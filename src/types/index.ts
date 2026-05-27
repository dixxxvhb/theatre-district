// Core game types for Broadway Tycoon

export type GamePhase =
  | 'menu'
  | 'property_select'
  | 'building'
  | 'production'
  | 'audition'
  | 'rehearsal'
  | 'running'
  | 'summary';

export type ViewMode = 'isometric' | 'floorplan';

export type RoomType =
  | 'stage'
  | 'seating'
  | 'lobby'
  | 'backstage'
  | 'box_office'
  | 'rehearsal_hall'
  | 'dressing_room'
  | 'orchestra_pit'
  | 'storage'
  | 'office'
  | 'vip_lounge'
  | 'concession'
  | 'tech_booth'
  | 'green_room'
  | 'restrooms';

export type PropertyCondition = 'poor' | 'fair' | 'good' | 'excellent' | 'pristine';

export interface LocationBonus {
  attendance: number;   // percentage bonus, e.g. 0.05 = +5%
  ticketPrice: number;  // percentage bonus, e.g. 0.10 = +10%
}

export interface RoomDefinition {
  type: RoomType;
  name: string;
  description: string;
  minSize: Size;        // absolute minimum (smallest the player can drag)
  defaultSize: Size;    // default size when click-to-place (no drag)
  baseCost: number;
  buildDays: number;
  required: boolean;
  color: string;        // hex color for floor plan rendering
}

export type ShowGenre =
  | 'musical'
  | 'play'
  | 'revival'
  | 'experimental'
  | 'one_person_show';

export type ShowArchetypeName =
  | 'crowd_pleaser'
  | 'critics_darling'
  | 'big_spectacle'
  | 'intimate_chamber'
  | 'dark_horse'
  | 'safe_bet';

export interface ShowArchetype {
  name: ShowArchetypeName;
  label: string;
  scriptQualityRange: [number, number];
  appealRange: [number, number];
  complexityRange: [number, number];
  castSizeRange: [number, number];
  budgetRange: [number, number];
}

export type CrewRole =
  | 'director'
  | 'stage_manager'
  | 'music_director'
  | 'choreographer'
  | 'tech_director'
  | 'costume_designer'
  | 'lighting_designer'
  | 'sound_designer'
  | 'set_designer'
  | 'publicist'
  | 'house_manager';

export type MarketingOption =
  | 'poster'
  | 'radio_ad'
  | 'newspaper_ad'
  | 'social_media'
  | 'tv_ad'
  | 'billboard';

export type EventSeverity = 'minor' | 'moderate' | 'major';

export type SpeedSetting = 'paused' | 'normal' | 'fast' | 'ultra';

// ---- Data Models ----

export interface Position {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface Room {
  id: string;
  type: RoomType;
  position: Position;
  size: Size;
  level: number;          // upgrade level 1-3
  condition: number;      // 0-100
  isConstructing: boolean;
  constructionDaysLeft: number;
  presetId: string | null;
}

export interface Property {
  id: string;
  name: string;
  address: string;
  lot: 'small' | 'medium' | 'large';
  cost: number;
  gridSize: Size;
  locationBonus: LocationBonus;
  condition: PropertyCondition;
  constructionCostModifier: number; // e.g. 1.5 for poor, 0.8 for pristine
  maxSeats: number;
  unlockReputation: number;         // min reputation to purchase
  rooms: Room[];
  purchased: boolean;
}

export interface CastMember {
  id: string;
  name: string;
  talent: number;         // 0-100
  starPower: number;      // 0-100
  salary: number;         // weekly
  morale: number;         // 0-100
  chemistry: number;      // 0-100, with current cast
  roleId: string;
  personality: string;    // brief descriptor
}

export interface ShowRole {
  id: string;
  name: string;
  type: 'lead' | 'supporting' | 'ensemble';
  castMemberId: string | null;
}

export interface Show {
  id: string;
  title: string;
  genre: ShowGenre;
  archetype: ShowArchetypeName;
  scriptQuality: number;    // 0-100
  audienceAppeal: number;   // 0-100
  complexity: number;       // 1-5
  idealCastSize: number;
  idealBudget: number;
  commissioned: boolean;
  commissionDeliveryDay: number | null;
  roles: ShowRole[];
  quality: number;          // 0-100
  rehearsalProgress: number; // 0-100
  rehearsalDaysTotal: number;
  rehearsalDaysCompleted: number;
  isRehearsing: boolean;
  isRunning: boolean;
  openingNight: number | null; // day number
  closingNight: number | null;
  totalRevenue: number;
  totalPerformances: number;
  averageAttendance: number;
  criticScore: number | null;
  buzzScore: number;
}

export interface CrewMember {
  id: string;
  name: string;
  role: CrewRole;
  skill: number;          // 0-100
  salary: number;         // weekly
  morale: number;         // 0-100
  hired: boolean;
  personality: string;    // brief descriptor
}

export interface GameEvent {
  id: string;
  title: string;
  description: string;
  severity: EventSeverity;
  day: number;
  choices: EventChoice[];
  resolved: boolean;
}

export interface EventChoice {
  id: string;
  text: string;
  effects: EventEffect[];
}

export interface EventEffect {
  type: 'cash' | 'reputation' | 'buzz' | 'morale' | 'quality';
  value: number;
}

export interface PerformanceResult {
  day: number;
  attendance: number;
  capacity: number;
  revenue: number;
  expenses: number;
  profit: number;
}

export interface SaveSlot {
  id: string;
  name: string;
  timestamp: number;
  day: number;
  cash: number;
  reputation: number;
  theaterName: string;
}

// ---- Grid ----

export type CellType = 'empty' | 'room' | 'wall' | 'door';

export interface GridCell {
  type: CellType;
  roomId: string | null;
  roomType: RoomType | null;
  walkable: boolean;
}

export interface GridState {
  width: number;
  height: number;
  cells: GridCell[];
}

// ---- Store State ----

export interface TimeState {
  day: number;
  week: number;
  speed: SpeedSetting;
  isPaused: boolean;
  tickAccumulator: number;
}

export interface EconomyState {
  cash: number;
  income: number;         // weekly
  expenses: number;       // weekly
  loanBalance: number;
  loanInterestRate: number;
  transactionHistory: Transaction[];
}

export interface Transaction {
  id: string;
  day: number;
  amount: number;
  category: string;
  description: string;
}

export interface ReputationState {
  score: number;
  level: string;
  milestones: string[];
}

/** Street-layer placement tool selection. Flat union — disjoint kinds. */
export type StreetTool = BuildingKind | DecorationKind | 'acquire';

export interface UIState {
  currentPhase: GamePhase;
  viewMode: ViewMode;
  selectedRoomType: RoomType | null;
  selectedTile: Position | null;
  isPanelOpen: boolean;
  activePanel: string | null;
  notifications: Notification[];
  isRenovating: boolean;
  /** Theatre District: which tool the player has selected for street placement. */
  streetTool: StreetTool | null;
  /** Theatre District: currently selected placed building/decoration id. */
  streetSelectedId: string | null;
  /** Theatre District: show the buzz heat-map overlay. */
  showBuzzOverlay: boolean;
  /** Theatre District: TheatreModal is open for the currently selected theatre. */
  theatreModalOpen: boolean;
}

export interface Notification {
  id: string;
  message: string;
  type: NotificationType;
  day: number;
  read: boolean;
}

export interface MarketingCampaignState {
  id: string;
  type: MarketingOption;
  label: string;
  cost: number;
  buzzGain: number;
  duration: number;
  daysRemaining: number;
  startDay: number;
}

export interface RehearsalLogEntry {
  id: string;
  day: number;
  message: string;
  type: 'progress' | 'breakthrough' | 'conflict' | 'injury';
}

export interface RunSummary {
  showId: string;
  showTitle: string;
  totalPerformances: number;
  totalRevenue: number;
  totalExpenses: number;
  profit: number;
  averageAttendancePercent: number;
  bestNight: PerformanceResult | null;
  worstNight: PerformanceResult | null;
  reputationChange: number;
  runDays: number;
}

// ---- Campaign & Rivals (v2.0) ----

export type RivalPersonality = 'upstart' | 'corporate' | 'legacy';

export interface RivalShow {
  title: string;
  genre: ShowGenre;
  quality: number;
  openDay: number;
  closingDay: number | null;
  attendance: number;
}

export interface RivalTheater {
  id: string;
  name: string;
  personality: RivalPersonality;
  reputation: number;
  cash: number;
  currentShow: RivalShow | null;
  buzz: number;
  showHistory: RivalShow[];
  appearsAtAct: number;
  active: boolean;
}

export interface Trend {
  id: string;
  name: string;
  description: string;
  effects: TrendEffect[];
  durationRange: [number, number];
}

export interface TrendEffect {
  type: 'attendance' | 'cost' | 'buzz' | 'critic';
  genre?: ShowGenre;
  archetype?: ShowArchetypeName;
  multiplier: number;
}

export interface ActiveTrend {
  trend: Trend;
  showsRemaining: number;
}

export interface RoomPreset {
  id: string;
  roomType: RoomType;
  name: string;
  description: string;
  visualTheme: {
    primaryColor: number;
    secondaryColor: number;
    accentColor: number;
    pattern: 'checker' | 'geometric' | 'brick' | 'plain' | 'wood';
    decorations: string[];
  };
  modifiers: PresetModifiers;
}

export interface PresetModifiers {
  ticketPriceBonus: number;
  buildCostMultiplier: number;
  maintenanceCostMultiplier: number;
  capacityMultiplier: number;
  qualityBonus: number;
  reputationGainMultiplier: number;
  crewCapacity?: number;
  genreBonus?: { genre: ShowGenre; bonus: number }[];
}

export interface DirectorDecision {
  id: string;
  title: string;
  description: string;
  optionA: DirectorOption;
  optionB: DirectorOption;
}

export interface DirectorOption {
  label: string;
  description: string;
  effects: DirectorEffect[];
}

export interface DirectorEffect {
  type: 'quality' | 'readiness' | 'morale' | 'cash' | 'days';
  value: number;
  chance?: number;
}

export interface CampaignState {
  act: number;
  showCount: number;
  condemnedShowCount: number;
  lowAttendanceWeeks: number;
  currentTrend: ActiveTrend | null;
  nextTrend: ActiveTrend | null;
  tonyNominations: string[];
  tonyWins: string[];
  gameOver: boolean;
  gameOverReason: string | null;
}

export type NotificationType = 'info' | 'money' | 'rival' | 'trend' | 'danger' | 'achievement' | 'warning' | 'success' | 'error';

// ============================================================
// Street layer (Theatre District — outdoor city-builder)
// ============================================================

export type BuildingKind = 'theatre' | 'restaurant' | 'cart';

export type DecorationKind = 'lamp' | 'tree' | 'fountain' | 'bench' | 'poster' | 'string_lights';

export type DailyPhase = 'quiet' | 'preshow' | 'curtain' | 'postshow' | 'winddown';

export interface StreetBounds {
  minX: number;
  maxX: number; // inclusive
  minY: number;
  maxY: number; // inclusive
}

export interface StreetPlot {
  x: number;
  y: number;
  acquiredDay: number;
}

export interface PerformanceSummary {
  day: number;
  showName: string;
  capacity: number;
  attendance: number;
  fillFactor: number;     // 0..1
  revenue: number;        // dollars
  quality: number;        // 0..100, derived from hit roll
  popularityDelta: number; // change applied to building.popularity
}

export interface PlacedBuilding {
  id: string;
  kind: BuildingKind;
  position: Position;
  footprint: Size;
  constructedDay: number;
  constructionDaysLeft: number;
  theatreId?: string;          // for kind='theatre', links to the Theatre layer entity
  /** Theatre-only: buzz emission multiplier driven by recent performance hits.
   * 1.0 = baseline, >1 = hit theatre crowds, <1 = flop dampens crowd. Range 0.4..1.8. */
  popularity?: number;
  /** Last performance result, shown in TheatreModal. */
  lastPerformance?: PerformanceSummary;
}

export interface PlacedDecoration {
  id: string;
  kind: DecorationKind;
  position: Position; // single-tile
  placedDay: number;
}

export interface StreetLitter {
  x: number;
  y: number;
  amount: number;
}

/**
 * StreetState — single source of truth for the outdoor street layer.
 * buzzField is a flat Float32Array sized buzzFieldWidth * buzzFieldHeight,
 * indexed (gx - bounds.minX) + (gy - bounds.minY) * buzzFieldWidth.
 * Resized on plot acquisition. Round-tripped as base64 in saves.
 */
export interface StreetState {
  bounds: StreetBounds;
  plots: StreetPlot[];
  placedBuildings: PlacedBuilding[];
  decoration: PlacedDecoration[];
  litter: StreetLitter[];
  buzzField: Float32Array;
  buzzFieldWidth: number;
  buzzFieldHeight: number;
  dailyPhase: DailyPhase;
  /** Fractional progress through current day, 0..1. Drives dailyPhase transitions. */
  timeOfDay: number;
}

export interface GameState {
  // Meta
  initialized: boolean;
  theaterName: string;

  // Systems
  time: TimeState;
  economy: EconomyState;
  reputation: ReputationState;
  ui: UIState;

  // Entities
  properties: Property[];
  activePropertyId: string | null;
  shows: Show[];
  activeShowId: string | null;
  showOptions: Show[];
  castMembers: CastMember[];
  crew: CrewMember[];
  events: GameEvent[];
  performanceHistory: PerformanceResult[];

  // Grid
  grid: GridState;

  // Camera
  camera: {
    x: number;
    y: number;
    zoom: number;
  };

  // Campaign & Rivals (v2.0)
  campaign: CampaignState;
  rivals: RivalTheater[];

  // Performance / Run
  ticketPrice: number;
  activeMarketingCampaigns: MarketingCampaignState[];
  runDay: number;
  rehearsalLog: RehearsalLogEntry[];
  lowAttendanceStreak: number;  // consecutive performance days below 30%
  runSummary: RunSummary | null;
  showOpeningNightModal: boolean;
  pendingTonyShowId: string | null;

  // Director-decision persistence (per-rehearsal)
  lastDirectorDecisionDay: number;
  usedDirectorDecisionIds: string[];

  // Street layer (Theatre District v2)
  street: StreetState;
}
