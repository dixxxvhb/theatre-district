// Theatre District store — the single Zustand store of the running game.
//
// Only serializable game state lives here (architecture rule #4). The sim
// drives it through small actions; UI reads it through coarse selectors.
// The legacy Broadway Tycoon store (./gameStore.ts) is quarantined — nothing
// in the new shell imports it; its show-production slices fold in at Session 5.

import { create } from 'zustand';
import type { Speed } from '../game/sim/clock';
import { DECORATIONS, DEMOLISH_REFUND, ECONOMY, PRODUCTION, TIME, UPKEEP, type UpgradeId } from '../game/config/balance';
import { canPlaceBuilding, canPlaceDecoration, canPlaceStringLights, catalogEntry } from '../game/street/placement';
import {
  dailyWages,
  draftOptions,
  emptyProduction,
  generateCandidates,
  openingQuality,
  upgradeCost,
  upgradeEffects,
} from '../game/production/logic';
import { DIRECTOR_DECISIONS, pickDecision } from '../game/data/decisions';

function pickById(id: string) {
  return DIRECTOR_DECISIONS.find((d) => d.id === id) ?? null;
}
import type { BuildingKind, CastMember, DecorationKind, RoleSlot, TDState } from '../types/td';

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
    /** Theatre whose Production Desk is open (full-screen overlay). */
    deskTheatreId: string | null;
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

  /** Production Desk pipeline (Session 5). */
  openDesk: (theatreId: string | null) => void;
  commission: (theatreId: string) => boolean;
  chooseShow: (theatreId: string, optionIndex: number) => boolean;
  refreshCandidates: (theatreId: string, slot: RoleSlot) => void;
  castRole: (theatreId: string, slot: RoleSlot, candidate: CastMember) => boolean;
  startRehearsals: (theatreId: string) => boolean;
  openShow: (theatreId: string) => boolean;
  closeShow: (theatreId: string) => void;
  setTicketPrice: (theatreId: string, price: number) => void;
  buyUpgrade: (theatreId: string, upgrade: UpgradeId) => boolean;
  resolveDecision: (option: 'A' | 'B') => void;

  /** Nightly bookkeeping (called by the showtime director). */
  recordNightly: (theatreId: string, attendance: number) => void;
  updateMomentum: (theatreId: string, momentum: number) => void;

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
    productions: {},
    pendingDecision: null,
    settings: { buzzOverlay: false },
  };
}

export const useTDStore = create<TDState & TDActions & UISlice>((set, get) => ({
  ...initialTDState(),

  ui: { tool: null, selectedId: null, stringAnchor: null, paletteOpen: false, deskTheatreId: null },
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
      set((st) => {
        const productions = { ...st.productions };
        delete productions[id];
        return {
          street: { ...st.street, buildings: st.street.buildings.filter((bb) => bb.id !== id) },
          productions,
        };
      });
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

  openDesk: (theatreId) =>
    set((s) => ({ ui: { ...s.ui, deskTheatreId: theatreId, selectedId: null, tool: null } })),

  commission: (theatreId) => {
    const s = get();
    const theatre = s.street.buildings.find((b) => b.id === theatreId);
    if (!theatre) return false;
    const fx = upgradeEffects(theatre.upgrades);
    const cost = Math.round(PRODUCTION.COMMISSION_COST * fx.commissionMult);
    if (!s.spendCash(cost)) return false;
    set((st) => ({
      productions: {
        ...st.productions,
        [theatreId]: { ...emptyProduction(), options: draftOptions() },
      },
    }));
    return true;
  },

  chooseShow: (theatreId, optionIndex) => {
    const s = get();
    const p = s.productions[theatreId];
    const theatre = s.street.buildings.find((b) => b.id === theatreId);
    const show = p?.options?.[optionIndex];
    if (!p || !show || !theatre) return false;
    const fx = upgradeEffects(theatre.upgrades);
    const rights = Math.round(show.rightsCost * (1 - fx.rightsDiscount));
    if (!s.spendCash(rights)) return false;
    set((st) => ({
      productions: {
        ...st.productions,
        [theatreId]: {
          ...p,
          stage: 'casting',
          show,
          options: undefined,
          ticketPrice: PRODUCTION.REF_TICKET[theatre.kind] ?? 35,
        },
      },
    }));
    return true;
  },

  refreshCandidates: (theatreId, slot) => {
    const s = get();
    const p = s.productions[theatreId];
    const theatre = s.street.buildings.find((b) => b.id === theatreId);
    if (!p || !theatre) return;
    const fx = upgradeEffects(theatre.upgrades);
    set((st) => ({
      productions: {
        ...st.productions,
        [theatreId]: {
          ...p,
          candidates: { ...p.candidates, [slot]: generateCandidates(slot, fx.betterCandidates) },
        },
      },
    }));
  },

  castRole: (theatreId, slot, candidate) => {
    const s = get();
    const p = s.productions[theatreId];
    if (!p || p.stage !== 'casting') return false;
    if (!s.spendCash(candidate.signingFee)) return false;
    set((st) => ({
      productions: {
        ...st.productions,
        [theatreId]: {
          ...p,
          cast: { ...p.cast, [slot]: candidate },
          candidates: { ...p.candidates, [slot]: undefined },
        },
      },
    }));
    return true;
  },

  startRehearsals: (theatreId) => {
    const s = get();
    const p = s.productions[theatreId];
    if (!p || p.stage !== 'casting' || !p.cast.lead) return false; // a show needs its lead
    set((st) => ({
      productions: { ...st.productions, [theatreId]: { ...p, stage: 'rehearsing', candidates: undefined } },
    }));
    return true;
  },

  openShow: (theatreId) => {
    const s = get();
    const p = s.productions[theatreId];
    const theatre = s.street.buildings.find((b) => b.id === theatreId);
    if (!p || !theatre || p.stage !== 'rehearsing' || p.readiness < PRODUCTION.OPEN_THRESHOLD) return false;
    if (!s.spendCash(PRODUCTION.OPENING_COST)) return false;
    const fx = upgradeEffects(theatre.upgrades);
    set((st) => ({
      productions: {
        ...st.productions,
        [theatreId]: { ...p, stage: 'running', quality: openingQuality(p, fx), runDays: 0, gross: 0, momentum: 1 },
      },
    }));
    return true;
  },

  closeShow: (theatreId) =>
    set((s) => {
      const productions = { ...s.productions };
      delete productions[theatreId];
      return { productions };
    }),

  setTicketPrice: (theatreId, price) =>
    set((s) => {
      const p = s.productions[theatreId];
      if (!p) return s;
      const clamped = Math.round(Math.min(Math.max(price, 10), 150));
      return { productions: { ...s.productions, [theatreId]: { ...p, ticketPrice: clamped } } };
    }),

  buyUpgrade: (theatreId, upgrade) => {
    const s = get();
    const theatre = s.street.buildings.find((b) => b.id === theatreId);
    if (!theatre || theatre.upgrades?.includes(upgrade)) return false;
    if (!s.spendCash(upgradeCost(upgrade))) return false;
    set((st) => ({
      street: {
        ...st.street,
        buildings: st.street.buildings.map((b) =>
          b.id === theatreId ? { ...b, upgrades: [...(b.upgrades ?? []), upgrade] } : b,
        ),
      },
    }));
    return true;
  },

  resolveDecision: (option) => {
    const s = get();
    const pending = s.pendingDecision;
    if (!pending) return;
    const p = s.productions[pending.theatreId];
    const decision = pickById(pending.decisionId);
    if (p && decision) {
      const effects = option === 'A' ? decision.optionA.effects : decision.optionB.effects;
      let readiness = p.readiness;
      let qualityNudge = p.qualityNudge;
      for (const e of effects) {
        if (e.chance !== undefined && Math.random() > e.chance) continue;
        if (e.type === 'quality') qualityNudge += e.value;
        else if (e.type === 'morale') qualityNudge += e.value * 0.6;
        else if (e.type === 'readiness') readiness += e.value;
        else if (e.type === 'days') readiness -= e.value * PRODUCTION.REHEARSAL_PER_DAY;
        else if (e.type === 'cash') s.addCash(e.value);
      }
      set((st) => ({
        productions: {
          ...st.productions,
          [pending.theatreId]: {
            ...p,
            readiness: Math.min(100, Math.max(0, readiness)),
            qualityNudge,
            usedDecisionIds: [...p.usedDecisionIds, pending.decisionId],
          },
        },
      }));
    }
    // Un-pause: restore the speed the player was at before the modal.
    set((st) => ({
      pendingDecision: null,
      time: st.time.speed === 'paused' ? { ...st.time, speed: st.time.prePauseSpeed } : st.time,
    }));
  },

  recordNightly: (theatreId, attendance) =>
    set((s) => {
      const p = s.productions[theatreId];
      if (!p) return s;
      return { productions: { ...s.productions, [theatreId]: { ...p, lastAttendance: attendance } } };
    }),

  updateMomentum: (theatreId, momentum) =>
    set((s) => {
      const p = s.productions[theatreId];
      if (!p) return s;
      return {
        productions: {
          ...s.productions,
          [theatreId]: {
            ...p,
            momentum,
            runDays: p.runDays + 1,
            gross: p.gross + p.lastAttendance * p.ticketPrice,
          },
        },
      };
    }),

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
    // Construction advances; operational buildings age (Backstage Complex slows it).
    const buildings = s.street.buildings.map((b) => {
      if (b.constructionDaysLeft > 0) return { ...b, constructionDaysLeft: b.constructionDaysLeft - 1 };
      const fx = upgradeEffects(b.upgrades);
      return { ...b, condition: Math.max(0, b.condition - UPKEEP.CONDITION_DECAY_PER_DAY * fx.decayMult) };
    });

    // Productions: rehearsals progress, casts get paid, decisions land.
    const productions = { ...s.productions };
    let wagesTotal = 0;
    let newDecision = s.pendingDecision;
    for (const [tid, p] of Object.entries(productions)) {
      if (p.stage === 'rehearsing') {
        const theatre = buildings.find((b) => b.id === tid);
        const fx = upgradeEffects(theatre?.upgrades);
        const rehearsalDays = p.rehearsalDays + 1;
        const readiness = Math.min(100, p.readiness + PRODUCTION.REHEARSAL_PER_DAY * fx.rehearsalMult);
        let next = { ...p, readiness, rehearsalDays };
        if (!newDecision && rehearsalDays % PRODUCTION.DECISION_EVERY_DAYS === 0) {
          const d = pickDecision(p.usedDecisionIds);
          if (d) newDecision = { theatreId: tid, decisionId: d.id };
        }
        productions[tid] = next;
        wagesTotal += dailyWages(p);
      } else if (p.stage === 'running') {
        wagesTotal += dailyWages(p);
      }
    }
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
    // A landed decision pauses the game until answered (spec: auto-pause).
    const pauseForDecision = newDecision && !s.pendingDecision;
    set((st) => ({
      street: { ...st.street, buildings },
      upkeep: { ...st.upkeep, litter },
      productions,
      pendingDecision: newDecision,
      economy: { ...st.economy, cash: st.economy.cash - sweeperCost - wagesTotal },
      time: pauseForDecision && st.time.speed !== 'paused' ? { ...st.time, speed: 'paused' } : st.time,
    }));
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
    productions: s.productions,
    pendingDecision: s.pendingDecision,
    settings: s.settings,
  };
}
