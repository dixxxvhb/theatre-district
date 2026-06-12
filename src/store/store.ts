// Theatre District store — the single Zustand store of the running game.
//
// Only serializable game state lives here (architecture rule #4). The sim
// drives it through small actions; UI reads it through coarse selectors.
// The legacy Broadway Tycoon store (./gameStore.ts) is quarantined — nothing
// in the new shell imports it; its show-production slices fold in at Session 5.

import { create } from 'zustand';
import type { Speed } from '../game/sim/clock';
import { ECONOMY, TIME } from '../game/config/balance';
import type { TDState } from '../types/td';

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
    settings: { buzzOverlay: false },
  };
}

export const useTDStore = create<TDState & TDActions>((set, get) => ({
  ...initialTDState(),

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

  skipDays: (days) =>
    set((s) => ({ time: { ...s.time, day: s.time.day + Math.max(1, Math.floor(days)), tickOfDay: 0 } })),

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

/** The serializable slice of the store (drops actions). */
export function snapshotTDState(): TDState {
  const s = useTDStore.getState();
  return {
    initialized: s.initialized,
    districtName: s.districtName,
    time: s.time,
    economy: s.economy,
    street: s.street,
    settings: s.settings,
  };
}
