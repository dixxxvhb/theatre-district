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
import { reviewShow, starString, verdictMomentum } from '../game/data/critics';
import { eventById, rollDailyEvent } from '../game/sim/events';
import { THEATRES } from '../game/config/balance';
import type { PlaybillEntry } from '../types/td';

function pickById(id: string) {
  return DIRECTOR_DECISIONS.find((d) => d.id === id) ?? null;
}

const THEATRES_LABEL: Record<string, string> = Object.fromEntries(
  Object.entries(THEATRES).map(([k, v]) => [k, v.label]),
);

function addPlaybillEntry(
  current: PlaybillEntry[],
  day: number,
  entry: { headline: string; lines: string[] },
): PlaybillEntry[] {
  const next = [{ day, headline: entry.headline, lines: entry.lines }, ...current];
  return next.slice(0, 20); // keep last 20
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

  /** Lifecycle (Session 6). */
  resolveEvent: (choiceIndex: number) => void;
  publishPlaybill: (entry: { headline: string; lines: string[] }) => void;

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
    pendingEvent: null,
    dayMods: null,
    playbill: [],
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
    if (!p || !theatre) return false;
    if (p.stage === 'rehearsing') {
      // Going into previews — discounted tickets, no critics, no opening cost.
      if (p.readiness < PRODUCTION.OPEN_THRESHOLD) return false;
      const fx = upgradeEffects(theatre.upgrades);
      const previewPrice = Math.max(10, Math.round(p.ticketPrice * PRODUCTION.PREVIEW_PRICE_MULT));
      const quality = openingQuality(p, fx);
      set((st) => ({
        productions: {
          ...st.productions,
          [theatreId]: {
            ...p,
            stage: 'previews',
            quality,
            ticketPrice: previewPrice,
            runDays: 0,
            previewDays: 0,
            gross: 0,
            momentum: 0.85,
            belowParNights: 0,
          },
        },
        playbill: addPlaybillEntry(st.playbill, st.time.day, {
          headline: `${p.show?.title ?? 'A new show'} begins previews at ${theatre ? (THEATRES_LABEL[theatre.kind] ?? 'the house') : 'the house'}`,
          lines: ['Cheap seats, sharp pencils. Final touches go live.'],
        }),
      }));
      return true;
    }
    if (p.stage === 'previews') {
      // Officially opening — full price, critics weigh in, momentum from verdict.
      if (!s.spendCash(PRODUCTION.OPENING_COST)) return false;
      const fx = upgradeEffects(theatre.upgrades);
      const refPrice = PRODUCTION.REF_TICKET[theatre.kind] ?? 35;
      const reviews = reviewShow(p, fx);
      const verdict = verdictMomentum(reviews);
      set((st) => ({
        productions: {
          ...st.productions,
          [theatreId]: {
            ...p,
            stage: 'running',
            ticketPrice: refPrice,
            momentum: verdict,
            reviews,
            runDays: 0,
            belowParNights: 0,
          },
        },
        playbill: addPlaybillEntry(st.playbill, st.time.day, {
          headline: `OPENING NIGHT — ${p.show?.title ?? 'A new show'} ${reviews.every((r) => r.stars >= 4) ? 'opens to raves' : reviews.every((r) => r.stars <= 2) ? 'pummeled by the critics' : 'opens'}`,
          lines: reviews.map((r) => `${r.critic} ${starString(r.stars)} — ${r.line}`),
        }),
      }));
      return true;
    }
    return false;
  },

  closeShow: (theatreId) =>
    set((s) => {
      const p = s.productions[theatreId];
      const theatre = s.street.buildings.find((b) => b.id === theatreId);
      const productions = { ...s.productions };
      delete productions[theatreId];
      const farewell = p && (p.runDays >= PRODUCTION.FAREWELL_RUN_DAYS || p.gross > 80_000);
      const headline = farewell
        ? `Final curtain — ${p?.show?.title} takes its bow after ${p?.runDays} nights ($${(p?.gross ?? 0).toLocaleString()})`
        : `${p?.show?.title ?? 'Show'} closes at ${theatre ? THEATRES_LABEL[theatre.kind] ?? 'the house' : 'the house'}`;
      const lines = farewell ? ['Standing room only at the stage door. A run remembered.'] : [];
      return {
        productions,
        playbill: p ? addPlaybillEntry(s.playbill, s.time.day, { headline, lines }) : s.playbill,
      };
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

  resolveEvent: (choiceIndex) => {
    const s = get();
    const pending = s.pendingEvent;
    if (!pending) return;
    const event = eventById(pending.eventId);
    if (!event) {
      set({ pendingEvent: null });
      return;
    }
    const choice = event.choices[choiceIndex] ?? event.choices[0];
    let dayMods = s.dayMods;
    for (const fx of choice.effects) {
      switch (fx.type) {
        case 'cash':
          set((st) => ({ economy: { ...st.economy, cash: st.economy.cash + fx.value } }));
          break;
        case 'momentum':
          if (pending.theatreId) {
            const p = get().productions[pending.theatreId];
            if (p) {
              const next = Math.min(1.6, Math.max(0.55, p.momentum + fx.value));
              set((st) => ({
                productions: { ...st.productions, [pending.theatreId!]: { ...p, momentum: next } },
              }));
            }
          }
          break;
        case 'qualityNudge':
          if (pending.theatreId) {
            const p = get().productions[pending.theatreId];
            if (p) {
              set((st) => ({
                productions: { ...st.productions, [pending.theatreId!]: { ...p, qualityNudge: p.qualityNudge + fx.value } },
              }));
            }
          }
          break;
        case 'litterBurst': {
          const tiles: Array<{ x: number; y: number }> = [];
          for (let i = 0; i < fx.value; i++) tiles.push({ x: Math.floor(Math.random() * Math.max(1, get().street.era * 8 + 16)), y: Math.random() < 0.5 ? 3 : 6 });
          get().addLitter(tiles);
          break;
        }
        case 'spawnMult':
          dayMods = { spawnMult: fx.value, untilDay: s.time.day + (fx.days ?? 1) };
          break;
        case 'condition':
          break; // reserved for later sessions
      }
    }
    set((st) => ({
      pendingEvent: null,
      dayMods,
      time: st.time.speed === 'paused' ? { ...st.time, speed: st.time.prePauseSpeed } : st.time,
      playbill: addPlaybillEntry(st.playbill, st.time.day, { headline: event.title, lines: [event.description] }),
    }));
  },

  publishPlaybill: (entry) =>
    set((s) => ({ playbill: addPlaybillEntry(s.playbill, s.time.day, entry) })),

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

    // Productions: rehearsals progress, casts get paid, decisions land,
    // previews auto-roll into the official opening after PREVIEW_DAYS.
    const productions = { ...s.productions };
    let wagesTotal = 0;
    let newDecision = s.pendingDecision;
    const closeIds: string[] = [];
    const extraPlaybill: PlaybillEntry[] = [];
    for (const [tid, p] of Object.entries(productions)) {
      if (p.stage === 'rehearsing') {
        const theatre = buildings.find((b) => b.id === tid);
        const fx = upgradeEffects(theatre?.upgrades);
        const rehearsalDays = p.rehearsalDays + 1;
        const readiness = Math.min(100, p.readiness + PRODUCTION.REHEARSAL_PER_DAY * fx.rehearsalMult);
        const next = { ...p, readiness, rehearsalDays };
        if (!newDecision && rehearsalDays % PRODUCTION.DECISION_EVERY_DAYS === 0) {
          const d = pickDecision(p.usedDecisionIds);
          if (d) newDecision = { theatreId: tid, decisionId: d.id };
        }
        productions[tid] = next;
        wagesTotal += dailyWages(p);
      } else if (p.stage === 'previews') {
        const previewDays = p.previewDays + 1;
        wagesTotal += dailyWages(p);
        if (previewDays >= PRODUCTION.PREVIEW_DAYS) {
          // Auto-open: critics arrive tonight.
          const theatre = buildings.find((b) => b.id === tid);
          if (theatre) {
            const fx = upgradeEffects(theatre.upgrades);
            const refPrice = PRODUCTION.REF_TICKET[theatre.kind] ?? 35;
            const reviews = reviewShow(p, fx);
            const verdict = verdictMomentum(reviews);
            productions[tid] = {
              ...p,
              stage: 'running',
              previewDays,
              ticketPrice: refPrice,
              momentum: verdict,
              reviews,
              runDays: 0,
              belowParNights: 0,
            };
            extraPlaybill.push({
              day: s.time.day + 1,
              headline: `OPENING NIGHT — ${p.show?.title ?? 'A new show'} ${reviews.every((r) => r.stars >= 4) ? 'opens to raves' : reviews.every((r) => r.stars <= 2) ? 'pummeled by the critics' : 'opens'}`,
              lines: reviews.map((r) => `${r.critic} ${starString(r.stars)} — ${r.line}`),
            });
          }
        } else {
          productions[tid] = { ...p, previewDays };
        }
      } else if (p.stage === 'running') {
        wagesTotal += dailyWages(p);
        // Forced closing: too many bad nights in a row and the lights go down.
        const theatre = buildings.find((b) => b.id === tid);
        const cap = theatre ? THEATRES[theatre.kind as keyof typeof THEATRES].capacity : 1;
        const fill = p.lastAttendance / Math.max(1, cap);
        const belowParNights = fill < PRODUCTION.FORCED_CLOSE_FILL ? p.belowParNights + 1 : 0;
        productions[tid] = { ...p, belowParNights };
        if (belowParNights >= PRODUCTION.FORCED_CLOSE_NIGHTS) closeIds.push(tid);
      }
    }
    for (const tid of closeIds) {
      const p = productions[tid];
      delete productions[tid];
      extraPlaybill.push({
        day: s.time.day + 1,
        headline: `${p?.show?.title ?? 'Show'} forced to close`,
        lines: ['Houses too thin to sustain. The notice goes up.'],
      });
    }

    // Daily event roll.
    const runningIds = Object.entries(productions)
      .filter(([, p]) => p.stage === 'running' || p.stage === 'previews')
      .map(([id]) => id);
    let pendingEvent = s.pendingEvent;
    let dayMods = s.dayMods && s.dayMods.untilDay > s.time.day ? s.dayMods : null;
    if (!pendingEvent && !newDecision) {
      const roll = rollDailyEvent({ ...s, productions } as TDState, runningIds, PRODUCTION.EVENT_CHANCE);
      if (roll) {
        if (roll.event.choices.length === 1) {
          const fx = roll.event.choices[0].effects;
          for (const e of fx) {
            if (e.type === 'cash') {
              set((st) => ({ economy: { ...st.economy, cash: st.economy.cash + e.value } }));
            } else if (e.type === 'spawnMult') {
              dayMods = { spawnMult: e.value, untilDay: s.time.day + (e.days ?? 1) };
            } else if (e.type === 'momentum' && roll.theatreId) {
              const target = productions[roll.theatreId];
              if (target) {
                productions[roll.theatreId] = {
                  ...target,
                  momentum: Math.min(1.6, Math.max(0.55, target.momentum + e.value)),
                };
              }
            }
          }
          extraPlaybill.push({ day: s.time.day + 1, headline: roll.event.title, lines: [roll.event.description] });
        } else {
          pendingEvent = { eventId: roll.event.id, theatreId: roll.theatreId };
        }
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
    // A landed decision OR a choice-event pauses the game (spec: auto-pause).
    const pauseFor = (newDecision && !s.pendingDecision) || (pendingEvent && !s.pendingEvent);
    set((st) => {
      let playbill = st.playbill;
      for (const entry of extraPlaybill) playbill = addPlaybillEntry(playbill, entry.day, entry);
      return {
        street: { ...st.street, buildings },
        upkeep: { ...st.upkeep, litter },
        productions,
        pendingDecision: newDecision,
        pendingEvent,
        dayMods,
        playbill,
        economy: { ...st.economy, cash: st.economy.cash - sweeperCost - wagesTotal },
        time: pauseFor && st.time.speed !== 'paused' ? { ...st.time, speed: 'paused' } : st.time,
      };
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
    productions: s.productions,
    pendingDecision: s.pendingDecision,
    pendingEvent: s.pendingEvent,
    dayMods: s.dayMods,
    playbill: s.playbill,
    settings: s.settings,
  };
}
