import { create } from 'zustand';
import type { GameState, GamePhase, ViewMode, RoomType, Position, Size, SpeedSetting, GridCell, Show, CrewMember, CastMember, MarketingCampaignState, PerformanceResult, RehearsalLogEntry, RunSummary, EventEffect } from '../types';
import { GAME_CONSTANTS } from '../game/data/constants';
import { ROOM_DEFINITIONS } from '../game/data/rooms';
import { canPlaceRoom, placeRoomOnGrid, removeRoomFromGrid } from '../game/systems/BuildingSystem';

const initialState: GameState = {
  initialized: false,
  theaterName: '',

  time: {
    day: GAME_CONSTANTS.TIME.STARTING_DAY,
    week: 1,
    speed: 'normal',
    isPaused: true,
    tickAccumulator: 0,
  },

  economy: {
    cash: GAME_CONSTANTS.ECONOMY.STARTING_CASH,
    income: 0,
    expenses: 0,
    loanBalance: 0,
    loanInterestRate: GAME_CONSTANTS.ECONOMY.LOAN_INTEREST_RATE,
    transactionHistory: [],
  },

  reputation: {
    score: GAME_CONSTANTS.REPUTATION.STARTING_REP,
    level: 'Unknown',
    milestones: [],
  },

  ui: {
    currentPhase: 'menu',
    viewMode: 'floorplan',
    selectedRoomType: null,
    selectedTile: null,
    isPanelOpen: false,
    activePanel: null,
    notifications: [],
  },

  properties: [],
  activePropertyId: null,
  shows: [],
  activeShowId: null,
  showOptions: [],
  castMembers: [],
  crew: [],
  events: [],
  performanceHistory: [],

  grid: {
    width: 0,
    height: 0,
    cells: [],
  },

  camera: {
    x: 0,
    y: 0,
    zoom: 1,
  },

  ticketPrice: GAME_CONSTANTS.ECONOMY.DEFAULT_TICKET_PRICE,
  activeMarketingCampaigns: [],
  runDay: 0,
  rehearsalLog: [],
  lowAttendanceStreak: 0,
  runSummary: null,
  showOpeningNightModal: false,
};

interface GameActions {
  // Game lifecycle
  initGame: (theaterName: string) => void;
  resetGame: () => void;

  // Time
  setSpeed: (speed: SpeedSetting) => void;
  togglePause: () => void;
  advanceDay: () => void;

  // UI
  setPhase: (phase: GamePhase) => void;
  setViewMode: (mode: ViewMode) => void;
  selectRoomType: (type: RoomType | null) => void;
  selectTile: (pos: Position | null) => void;
  openPanel: (panel: string) => void;
  closePanel: () => void;

  // Economy
  addCash: (amount: number, category: string, description: string) => void;
  removeCash: (amount: number, category: string, description: string) => void;

  // Camera
  setCamera: (x: number, y: number, zoom: number) => void;

  // Grid
  initGrid: (width: number, height: number) => void;
  setCell: (x: number, y: number, cell: Partial<GridCell>) => void;
  getCell: (x: number, y: number) => GridCell | null;

  // Properties
  purchaseProperty: (propertyId: string) => void;
  setActiveProperty: (propertyId: string) => void;

  // Room placement
  placeRoom: (type: RoomType, position: Position, size: Size) => boolean;
  demolishRoom: (roomId: string) => void;

  // Shows
  setShowOptions: (shows: Show[]) => void;
  selectShow: (showId: string) => void;
  clearShowOptions: () => void;

  // Crew
  hireCrew: (crewMember: CrewMember) => void;
  fireCrew: (crewMemberId: string) => void;

  // Cast
  castRole: (showId: string, roleId: string, castMember: CastMember) => void;

  // Rehearsal
  startRehearsals: (showId: string) => void;
  addRehearsalLog: (entry: RehearsalLogEntry) => void;
  updateShow: (showId: string, updates: Partial<Show>) => void;

  // Marketing
  addMarketingCampaign: (campaign: MarketingCampaignState) => void;
  setMarketingCampaigns: (campaigns: MarketingCampaignState[]) => void;

  // Performance / Run
  setTicketPrice: (price: number) => void;
  processPerformance: (result: PerformanceResult) => void;
  setRunDay: (day: number) => void;
  setLowAttendanceStreak: (count: number) => void;

  // Events
  addEvent: (event: import('../types').GameEvent) => void;
  resolveEvent: (eventId: string, choiceId: string) => void;
  applyEventEffects: (effects: EventEffect[]) => void;

  // Opening night
  setShowOpeningNightModal: (show: boolean) => void;
  dismissOpeningNight: () => void;

  // Show closing
  closeShow: (showId: string, summary: RunSummary) => void;
  clearRunSummary: () => void;

  // Serialization
  getSerializableState: () => GameState;
  loadState: (state: GameState) => void;
}

export const useGameStore = create<GameState & GameActions>((set, get) => ({
  ...initialState,

  initGame: (theaterName: string) => set({
    initialized: true,
    theaterName,
    ui: { ...initialState.ui, currentPhase: 'property_select' },
  }),

  resetGame: () => set(initialState),

  setSpeed: (speed) => set((s) => ({
    time: { ...s.time, speed, isPaused: speed === 'paused' },
  })),

  togglePause: () => set((s) => ({
    time: { ...s.time, isPaused: !s.time.isPaused },
  })),

  advanceDay: () => set((s) => ({
    time: {
      ...s.time,
      day: s.time.day + 1,
      week: Math.ceil((s.time.day + 1) / 7),
    },
  })),

  setPhase: (phase) => set((s) => ({
    ui: { ...s.ui, currentPhase: phase },
  })),

  setViewMode: (mode) => set((s) => ({
    ui: { ...s.ui, viewMode: mode },
  })),

  selectRoomType: (type) => set((s) => ({
    ui: { ...s.ui, selectedRoomType: type },
  })),

  selectTile: (pos) => set((s) => ({
    ui: { ...s.ui, selectedTile: pos },
  })),

  openPanel: (panel) => set((s) => ({
    ui: { ...s.ui, isPanelOpen: true, activePanel: panel },
  })),

  closePanel: () => set((s) => ({
    ui: { ...s.ui, isPanelOpen: false, activePanel: null },
  })),

  addCash: (amount, category, description) => set((s) => ({
    economy: {
      ...s.economy,
      cash: s.economy.cash + amount,
      transactionHistory: [
        ...s.economy.transactionHistory,
        { id: crypto.randomUUID(), day: s.time.day, amount, category, description },
      ],
    },
  })),

  removeCash: (amount, category, description) => set((s) => ({
    economy: {
      ...s.economy,
      cash: s.economy.cash - amount,
      transactionHistory: [
        ...s.economy.transactionHistory,
        { id: crypto.randomUUID(), day: s.time.day, amount: -amount, category, description },
      ],
    },
  })),

  setCamera: (x, y, zoom) => set({ camera: { x, y, zoom } }),

  initGrid: (width, height) => {
    const cells: GridCell[] = Array.from({ length: width * height }, () => ({
      type: 'empty',
      roomId: null,
      roomType: null,
      walkable: true,
    }));
    set({ grid: { width, height, cells } });
  },

  setCell: (x, y, cell) => set((s) => {
    const { width, height, cells } = s.grid;
    if (x < 0 || x >= width || y < 0 || y >= height) return s;
    const idx = y * width + x;
    const newCells = [...cells];
    newCells[idx] = { ...newCells[idx], ...cell };
    return { grid: { ...s.grid, cells: newCells } };
  }),

  getCell: (x, y) => {
    const { width, height, cells } = get().grid;
    if (x < 0 || x >= width || y < 0 || y >= height) return null;
    return cells[y * width + x];
  },

  purchaseProperty: (propertyId) => set((s) => ({
    properties: s.properties.map((p) =>
      p.id === propertyId ? { ...p, purchased: true } : p
    ),
    activePropertyId: propertyId,
  })),

  setActiveProperty: (propertyId) => set({ activePropertyId: propertyId }),

  placeRoom: (type: RoomType, position: Position, size: Size) => {
    const state = get();
    const activeProperty = state.properties.find((p) => p.id === state.activePropertyId);
    if (!activeProperty) return false;

    const roomDef = ROOM_DEFINITIONS[type];
    if (!roomDef) return false;

    // Size must meet minimum
    if (size.width < roomDef.minSize.width || size.height < roomDef.minSize.height) return false;

    // Validate placement
    if (!canPlaceRoom(state.grid, position, size, activeProperty.rooms)) return false;

    // Calculate cost — scales with area relative to default size
    const defaultArea = roomDef.defaultSize.width * roomDef.defaultSize.height;
    const actualArea = size.width * size.height;
    const areaScale = actualArea / defaultArea;
    const adjustedCost = Math.round(roomDef.baseCost * areaScale * activeProperty.constructionCostModifier);
    if (state.economy.cash < adjustedCost) return false;

    // Create room
    const roomId = crypto.randomUUID();
    const newRoom = {
      id: roomId,
      type,
      position,
      size,
      level: 1,
      condition: 100,
      isConstructing: true,
      constructionDaysLeft: Math.round(roomDef.buildDays * Math.sqrt(areaScale)),
    };

    // Update grid
    const newGrid = placeRoomOnGrid(state.grid, roomId, type, position, size);

    // Update state
    set({
      grid: newGrid,
      properties: state.properties.map((p) =>
        p.id === activeProperty.id
          ? { ...p, rooms: [...p.rooms, newRoom] }
          : p
      ),
      economy: {
        ...state.economy,
        cash: state.economy.cash - adjustedCost,
        transactionHistory: [
          ...state.economy.transactionHistory,
          {
            id: crypto.randomUUID(),
            day: state.time.day,
            amount: -adjustedCost,
            category: 'construction',
            description: `Built ${roomDef.name}`,
          },
        ],
      },
      ui: { ...state.ui, selectedRoomType: null },
    });

    return true;
  },

  demolishRoom: (roomId: string) => {
    const state = get();
    const activeProperty = state.properties.find((p) => p.id === state.activePropertyId);
    if (!activeProperty) return;

    const room = activeProperty.rooms.find((r) => r.id === roomId);
    if (!room) return;

    const roomDef = ROOM_DEFINITIONS[room.type];
    const originalCost = Math.round(roomDef.baseCost * activeProperty.constructionCostModifier);
    const refund = Math.round(originalCost * 0.4);

    // Remove from grid
    const newGrid = removeRoomFromGrid(state.grid, roomId);

    set({
      grid: newGrid,
      properties: state.properties.map((p) =>
        p.id === activeProperty.id
          ? { ...p, rooms: p.rooms.filter((r) => r.id !== roomId) }
          : p
      ),
      economy: {
        ...state.economy,
        cash: state.economy.cash + refund,
        transactionHistory: [
          ...state.economy.transactionHistory,
          {
            id: crypto.randomUUID(),
            day: state.time.day,
            amount: refund,
            category: 'demolition',
            description: `Demolished ${roomDef.name} (40% refund)`,
          },
        ],
      },
    });
  },

  // ---- Shows ----
  setShowOptions: (shows: Show[]) => set({ showOptions: shows }),

  selectShow: (showId: string) => set((s) => {
    const show = s.showOptions.find((sh) => sh.id === showId);
    if (!show) return s;
    return {
      shows: [...s.shows, show],
      activeShowId: showId,
      showOptions: [],
    };
  }),

  clearShowOptions: () => set({ showOptions: [] }),

  // ---- Crew ----
  hireCrew: (crewMember: CrewMember) => set((s) => ({
    crew: [...s.crew, { ...crewMember, hired: true }],
  })),

  fireCrew: (crewMemberId: string) => set((s) => {
    const member = s.crew.find((c) => c.id === crewMemberId);
    if (!member) return s;
    const severancePay = member.salary * GAME_CONSTANTS.CREW.SEVERANCE_WEEKS;
    return {
      crew: s.crew.filter((c) => c.id !== crewMemberId),
      economy: {
        ...s.economy,
        cash: s.economy.cash - severancePay,
        transactionHistory: [
          ...s.economy.transactionHistory,
          {
            id: crypto.randomUUID(),
            day: s.time.day,
            amount: -severancePay,
            category: 'severance',
            description: `Severance for ${member.name}`,
          },
        ],
      },
    };
  }),

  // ---- Cast ----
  castRole: (showId: string, roleId: string, castMember: CastMember) => set((s) => {
    const castWithRole = { ...castMember, roleId };
    return {
      castMembers: [...s.castMembers, castWithRole],
      shows: s.shows.map((show) =>
        show.id === showId
          ? {
              ...show,
              roles: show.roles.map((r) =>
                r.id === roleId ? { ...r, castMemberId: castMember.id } : r,
              ),
            }
          : show,
      ),
    };
  }),

  // ---- Rehearsal ----
  startRehearsals: (showId: string) => set((s) => ({
    shows: s.shows.map((show) =>
      show.id === showId
        ? { ...show, isRehearsing: true }
        : show,
    ),
    ui: { ...s.ui, currentPhase: 'rehearsal' as GamePhase },
    time: { ...s.time, isPaused: false, speed: 'normal' as SpeedSetting },
    rehearsalLog: [],
  })),

  addRehearsalLog: (entry: RehearsalLogEntry) => set((s) => ({
    rehearsalLog: [...s.rehearsalLog, entry],
  })),

  updateShow: (showId: string, updates: Partial<Show>) => set((s) => ({
    shows: s.shows.map((show) =>
      show.id === showId ? { ...show, ...updates } : show,
    ),
  })),

  // ---- Marketing ----
  addMarketingCampaign: (campaign: MarketingCampaignState) => set((s) => ({
    activeMarketingCampaigns: [...s.activeMarketingCampaigns, campaign],
  })),

  setMarketingCampaigns: (campaigns: MarketingCampaignState[]) => set({
    activeMarketingCampaigns: campaigns,
  }),

  // ---- Performance / Run ----
  setTicketPrice: (price: number) => set({
    ticketPrice: Math.max(
      GAME_CONSTANTS.ECONOMY.MIN_TICKET_PRICE,
      Math.min(GAME_CONSTANTS.ECONOMY.MAX_TICKET_PRICE, price),
    ),
  }),

  processPerformance: (result: PerformanceResult) => set((s) => {
    const activeShow = s.shows.find((sh) => sh.id === s.activeShowId);
    if (!activeShow) return s;

    const newHistory = [...s.performanceHistory, result];
    const showPerfs = newHistory.filter((p) => p.day >= (activeShow.openingNight ?? 0));
    const totalPerfs = showPerfs.length;
    const totalRevenue = activeShow.totalRevenue + result.revenue;
    const avgAttendance = totalPerfs > 0
      ? showPerfs.reduce((sum, p) => sum + p.attendance, 0) / totalPerfs
      : 0;

    return {
      performanceHistory: newHistory,
      shows: s.shows.map((show) =>
        show.id === s.activeShowId
          ? {
              ...show,
              totalPerformances: totalPerfs,
              totalRevenue,
              averageAttendance: Math.round(avgAttendance),
            }
          : show,
      ),
      economy: {
        ...s.economy,
        cash: s.economy.cash + result.profit,
        transactionHistory: [
          ...s.economy.transactionHistory,
          {
            id: crypto.randomUUID(),
            day: s.time.day,
            amount: result.profit,
            category: 'performance',
            description: `Night ${totalPerfs}: ${result.attendance} attended ($${result.revenue} rev, $${result.expenses} exp)`,
          },
        ],
      },
    };
  }),

  setRunDay: (day: number) => set({ runDay: day }),

  setLowAttendanceStreak: (count: number) => set({ lowAttendanceStreak: count }),

  // ---- Events ----
  addEvent: (event) => set((s) => ({
    events: [...s.events, event],
  })),

  resolveEvent: (eventId: string, choiceId: string) => {
    const state = get();
    const event = state.events.find((e) => e.id === eventId);
    if (!event) return;

    const choice = event.choices.find((c) => c.id === choiceId);
    if (!choice) return;

    // Apply effects
    let cashDelta = 0;
    let repDelta = 0;
    let buzzDelta = 0;
    let qualityDelta = 0;

    for (const effect of choice.effects) {
      switch (effect.type) {
        case 'cash': cashDelta += effect.value; break;
        case 'reputation': repDelta += effect.value; break;
        case 'buzz': buzzDelta += effect.value; break;
        case 'quality': qualityDelta += effect.value; break;
      }
    }

    set((s) => {
      return {
        events: s.events.map((e) =>
          e.id === eventId ? { ...e, resolved: true } : e,
        ),
        economy: {
          ...s.economy,
          cash: s.economy.cash + cashDelta,
          ...(cashDelta !== 0 ? {
            transactionHistory: [
              ...s.economy.transactionHistory,
              {
                id: crypto.randomUUID(),
                day: s.time.day,
                amount: cashDelta,
                category: 'event',
                description: event.title,
              },
            ],
          } : {}),
        },
        reputation: {
          ...s.reputation,
          score: Math.max(0, Math.min(100, s.reputation.score + repDelta)),
        },
        shows: s.shows.map((show) =>
          show.id === s.activeShowId
            ? {
                ...show,
                buzzScore: Math.max(0, Math.min(100, show.buzzScore + buzzDelta)),
                quality: Math.max(0, Math.min(100, show.quality + qualityDelta)),
              }
            : show,
        ),
      };
    });
  },

  applyEventEffects: (effects: EventEffect[]) => {
    let cashDelta = 0;
    let repDelta = 0;
    let buzzDelta = 0;
    let qualityDelta = 0;

    for (const effect of effects) {
      switch (effect.type) {
        case 'cash': cashDelta += effect.value; break;
        case 'reputation': repDelta += effect.value; break;
        case 'buzz': buzzDelta += effect.value; break;
        case 'quality': qualityDelta += effect.value; break;
      }
    }

    set((s) => ({
      economy: {
        ...s.economy,
        cash: s.economy.cash + cashDelta,
      },
      reputation: {
        ...s.reputation,
        score: Math.max(0, Math.min(100, s.reputation.score + repDelta)),
      },
      shows: s.shows.map((show) =>
        show.id === s.activeShowId
          ? {
              ...show,
              buzzScore: Math.max(0, Math.min(100, show.buzzScore + buzzDelta)),
              quality: Math.max(0, Math.min(100, show.quality + qualityDelta)),
            }
          : show,
      ),
    }));
  },

  // ---- Opening Night ----
  setShowOpeningNightModal: (show: boolean) => set({ showOpeningNightModal: show }),

  dismissOpeningNight: () => set((s) => ({
    showOpeningNightModal: false,
    ui: { ...s.ui, currentPhase: 'running' as GamePhase },
    time: { ...s.time, isPaused: false, speed: 'normal' as SpeedSetting },
  })),

  // ---- Show Closing ----
  closeShow: (showId: string, summary: RunSummary) => set((s) => ({
    shows: s.shows.map((show) =>
      show.id === showId
        ? { ...show, isRunning: false, closingNight: s.time.day }
        : show,
    ),
    activeShowId: null,
    castMembers: [],
    runDay: 0,
    lowAttendanceStreak: 0,
    activeMarketingCampaigns: [],
    performanceHistory: [],
    rehearsalLog: [],
    runSummary: summary,
    ui: { ...s.ui, currentPhase: 'summary' as GamePhase },
  })),

  clearRunSummary: () => set((s) => ({
    runSummary: null,
    ui: { ...s.ui, currentPhase: 'building' as GamePhase },
    time: { ...s.time, isPaused: true, speed: 'normal' as SpeedSetting },
  })),

  getSerializableState: () => {
    const state = get();
    // Strip action functions, return only data
    const { initGame, resetGame, setSpeed, togglePause, advanceDay, setPhase, setViewMode, selectRoomType, selectTile, openPanel, closePanel, addCash, removeCash, setCamera, initGrid, setCell, getCell, purchaseProperty, setActiveProperty, placeRoom, demolishRoom, setShowOptions, selectShow, clearShowOptions, hireCrew, fireCrew, castRole, startRehearsals, addRehearsalLog, updateShow, addMarketingCampaign, setMarketingCampaigns, setTicketPrice, processPerformance, setRunDay, setLowAttendanceStreak, addEvent, resolveEvent, applyEventEffects, closeShow, clearRunSummary, setShowOpeningNightModal, dismissOpeningNight, getSerializableState, loadState, ...data } = state;
    return data as GameState;
  },

  loadState: (state) => set(state),
}));
