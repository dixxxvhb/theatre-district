// Theatre District store — the single Zustand store of the running game.
//
// Only serializable game state lives here (architecture rule #4). The sim
// drives it through small actions; UI reads it through coarse selectors.
// The legacy Broadway Tycoon store (./gameStore.ts) is quarantined — nothing
// in the new shell imports it; its show-production slices fold in at Session 5.

import { create } from 'zustand';
import type { Speed } from '../game/sim/clock';
import { DECORATIONS, DEMOLISH_REFUND, ECONOMY, TIME, UPKEEP } from '../game/config/balance';
import { canPlaceBuilding, canPlaceDecoration, canPlaceStringLights, catalogEntry } from '../game/street/placement';
import type { BuildingKind, DecorationKind, TDState } from '../types/td';

/** Transient UI state — lives in the single store but is never saved
 *  (snapshotTDState picks game fields explicitly). */
export type Tool =
  | { type: 'building'; kind: BuildingKind }
  | { type: 'decoration'; kind: DecorationKind }
  | { type: 'demolish' }
  | null;

export interface UISlice {
  ui: {
    tool: Tool;
    selectedId: string | null;
    /** First anchor while placing string lights. */
    stringAnchor: { x: number; y: number } | null;
    paletteOpen: boolean;
  };
  setTool: (tool: Tool) => void;
  select: (id: string | null) => void;
  setStringAnchor: (a: { x: number; y: number } | null) => void;
  togglePalette: () => void;
}

export interface TDActions {
  newGame: (districtName: string) => void;
  /** Replace the whole state from a loaded save. */
  hydrate: (state: TDState) => void;

  /** One fixed sim tick. Returns true when the day rolled over. */
  advanceTick: () => boolean;
  /** Jump whole days forward (dev panel). Resets to start of day. */
  skipDays: (days: number) => void;

  setSpeed: (speed: Exclude<Speed, 'paused'>) => void;
  togglePause: () => void;

  addCash: (amount: number) => void;
  spendCash: (amount: number) => boolean;

  /** Placement. Validation + cash; returns false (with no change) on failure. */
  placeBuilding: (kind: BuildingKind, x: number, side: 'north' | 'south') => boolean;
  placeDecoration: (kind: DecorationKind, x: number, y: number, spanToX?: number) => boolean;
  demolish: (id: string) => void;
  /** Bring a blighted building back to life. */
  restoreBuilding: (id: string) => boolean;
  toggleSweeper: () => void;
  /** Crowd sim batches dropped litter through this. */
  addLitter: (tiles: Array<{ x: number; y: number }>) => void;

  /** Day-rollover upkeep: construction, aging, litter, sweeper payroll. */
  endOfDay: () => void;

  /** Dev: jump to an era (street length follows; Session 8 adds the real gate). */
  setEra: (era: number) => void;
  /** Dev: jump to a time of day (0..1) — lighting/pulse playtesting. */
  setTimeOfDay: (t: number) => void;
  toggleBuzzOverlay: () => void;
}

export function initialTDState(): TDState {
  return {
    initialized: false,
    districtName: '',
    time: { day: 1, tickOfDay: 0, speed: 'normal', prePauseSpeed: 'normal' },
    economy: { cash: ECONOMY.STARTING_CASH },
    street: { era: 0, buildings: [], decorations: [] },
    upkeep: { litter: {}, sweeperHired: false },
    settings: { buzzOverlay: false },
  };
}

export const useTDStore = create<TDState & TDActions & UISlice>((set, get) => ({
  ...initialTDState(),

  ui: { tool: null, selectedId: null, stringAnchor: null, paletteOpen: false },
  setTool: (tool) =>
    set((s) => ({ ui: { ...s.ui, tool, stringAnchor: null, selectedId: tool ? null : s.ui.selectedId } })),
  select: (id) => set((s) => ({ ui: { ...s.ui, selectedId: id, tool: null, stringAnchor: null } })),
  setStringAnchor: (a) => set((s) => ({ ui: { ...s.ui, stringAnchor: a } })),
  togglePalette: () => set((s) => ({ ui: { ...s.ui, paletteOpen: !s.ui.paletteOpen } })),

  newGame: (districtName) =>
    set({
      ...initialTDState(),
      initialized: true,
      districtName: districtName.trim() || 'Theatre District',
      street: {
        era: 0,
        // The inheritance: one derelict playhouse mid-block on the north row.
        buildings: [
          {
            id: 'inherited-playhouse',
            kind: 'theatre_playhouse',
            x: 8,
            side: 'north',
            constructionDaysLeft: 0,
            condition: 0.2,
          },
        ],
        decorations: [],
      },
    }),

  hydrate: (state) => set({ ...state }),

  advanceTick: () => {
    const { time } = get();
    const nextTick = time.tickOfDay + 1;
    if (nextTick >= TIME.TICKS_PER_DAY) {
      set({ time: { ...time, day: time.day + 1, tickOfDay: 0 } });
      return true;
    }
    set({ time: { ...time, tickOfDay: nextTick } });
    return false;
  },

  skipDays: (days) => {
    const n = Math.max(1, Math.floor(days));
    // Each skipped day runs its end-of-day upkeep — construction must
    // advance, litter must decay, the sweeper must get paid.
    for (let i = 0; i < n; i++) {
      set((s) => ({ time: { ...s.time, day: s.time.day + 1, tickOfDay: 0 } }));
      get().endOfDay();
    }
  },

  setSpeed: (speed) =>
    set((s) => ({ time: { ...s.time, speed, prePauseSpeed: speed } })),

  togglePause: () =>
    set((s) =>
      s.time.speed === 'paused'
        ? { time: { ...s.time, speed: s.time.prePauseSpeed } }
        : { time: { ...s.time, speed: 'paused' } },
    ),

  addCash: (amount) =>
    set((s) => ({ economy: { ...s.economy, cash: s.economy.cash + amount } })),

  spendCash: (amount) => {
    const { economy } = get();
    if (economy.cash < amount) return false;
    set({ economy: { ...economy, cash: economy.cash - amount } });
    return true;
  },

  placeBuilding: (kind, x, side) => {
    const s = get();
    if (!canPlaceBuilding(s.street, kind, x, side).ok) return false;
    const entry = catalogEntry(kind);
    if (!s.spendCash(entry.cost)) return false;
    set((st) => ({
      street: {
        ...st.street,
        buildings: [
          ...st.street.buildings,
          {
            id: crypto.randomUUID(),
            kind,
            x,
            side,
            constructionDaysLeft: entry.buildDays,
            condition: 1,
          },
        ],
      },
    }));
    return true;
  },

  placeDecoration: (kind, x, y, spanToX) => {
    const s = get();
    const valid =
      kind === 'string_lights' && spanToX !== undefined
        ? canPlaceStringLights(s.street, x, spanToX, y)
        : canPlaceDecoration(s.street, kind, x, y);
    if (!valid.ok) return false;
    if (!s.spendCash(DECORATIONS[kind].cost)) return false;
    set((st) => ({
      street: {
        ...st.street,
        decorations: [
          ...st.street.decorations,
          { id: crypto.randomUUID(), kind, x, y, ...(spanToX !== undefined ? { spanToX } : {}) },
        ],
      },
    }));
    return true;
  },

  demolish: (id) => {
    const s = get();
    const b = s.street.buildings.find((bb) => bb.id === id);
    if (b) {
      s.addCash(Math.round(catalogEntry(b.kind).cost * DEMOLISH_REFUND));
      set((st) => ({
        street: { ...st.street, buildings: st.street.buildings.filter((bb) => bb.id !== id) },
      }));
      return;
    }
    set((st) => ({
      street: { ...st.street, decorations: st.street.decorations.filter((d) => d.id !== id) },
    }));
  },

  restoreBuilding: (id) => {
    const s = get();
    const b = s.street.buildings.find((bb) => bb.id === id);
    if (!b || b.condition >= 1) return false;
    if (!s.spendCash(ECONOMY.DERELICT_RESTORE_COST)) return false;
    set((st) => ({
      street: {
        ...st.street,
        buildings: st.street.buildings.map((bb) => (bb.id === id ? { ...bb, condition: 1 } : bb)),
      },
    }));
    return true;
  },

  toggleSweeper: () =>
    set((s) => ({ upkeep: { ...s.upkeep, sweeperHired: !s.upkeep.sweeperHired } })),

  addLitter: (tiles) =>
    set((s) => {
      const litter = { ...s.upkeep.litter };
      for (const t of tiles) {
        const key = `${t.x},${t.y}`;
        litter[key] = (litter[key] ?? 0) + 1;
      }
      return { upkeep: { ...s.upkeep, litter } };
    }),

  endOfDay: () => {
    const s = get();
    // Construction advances; operational buildings age.
    const buildings = s.street.buildings.map((b) =>
      b.constructionDaysLeft > 0
        ? { ...b, constructionDaysLeft: b.constructionDaysLeft - 1 }
        : { ...b, condition: Math.max(0, b.condition - UPKEEP.CONDITION_DECAY_PER_DAY) },
    );
    // Litter decays; the sweeper clears much more, for a daily fee.
    const clearedPerTile = s.upkeep.sweeperHired
      ? UPKEEP.LITTER_DECAY_PER_DAY + UPKEEP.SWEEPER_LITTER_PER_DAY
      : UPKEEP.LITTER_DECAY_PER_DAY;
    const litter: Record<string, number> = {};
    for (const [key, units] of Object.entries(s.upkeep.litter)) {
      const next = units - clearedPerTile;
      if (next > 0.01) litter[key] = next;
    }
    const sweeperCost = s.upkeep.sweeperHired ? UPKEEP.SWEEPER_COST_PER_DAY : 0;
    set({
      street: { ...s.street, buildings },
      upkeep: { ...s.upkeep, litter },
      economy: { ...s.economy, cash: s.economy.cash - sweeperCost },
    });
  },

  setEra: (era) =>
    set((s) => ({ street: { ...s.street, era: Math.min(Math.max(era, 0), 4) } })),

  setTimeOfDay: (t) =>
    set((s) => ({
      time: {
        ...s.time,
        tickOfDay: Math.min(Math.max(Math.round(t * TIME.TICKS_PER_DAY), 0), TIME.TICKS_PER_DAY - 1),
      },
    })),

  toggleBuzzOverlay: () =>
    set((s) => ({ settings: { ...s.settings, buzzOverlay: !s.settings.buzzOverlay } })),
}));

// Dev-server-only handle for driving the store from the console / QA scripts.
// (typeof guard: this module also loads in Node for unit tests.)
if (import.meta.env.DEV && typeof window !== 'undefined') {
  (window as unknown as { __td?: typeof useTDStore }).__td = useTDStore;
}

/** The serializable slice of the store (drops actions). */
export function snapshotTDState(): TDState {
  const s = useTDStore.getState();
  return {
    initialized: s.initialized,
    districtName: s.districtName,
    time: s.time,
    economy: s.economy,
    street: s.street,
    upkeep: s.upkeep,
    settings: s.settings,
  };
}
