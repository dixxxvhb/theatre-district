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

export interface UIState {
  currentPhase: GamePhase;
  viewMode: ViewMode;
  selectedRoomType: RoomType | null;
  selectedTile: Position | null;
  isPanelOpen: boolean;
  activePanel: string | null;
  notifications: Notification[];
}

export interface Notification {
  id: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
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

  // Performance / Run
  ticketPrice: number;
  activeMarketingCampaigns: MarketingCampaignState[];
  runDay: number;
  rehearsalLog: RehearsalLogEntry[];
  lowAttendanceStreak: number;  // consecutive performance days below 30%
  runSummary: RunSummary | null;
  showOpeningNightModal: boolean;
}
