// Street slice — owns the outdoor city-builder layer.
//
// This is the first slice to use the slice-composition pattern in this store.
// Future slices (theatres, shows, cast, etc.) follow the same shape:
//   1. Define `interface XSlice` with state fields + actions.
//   2. Export `createXSlice: StateCreator<...>` returning state + actions.
//   3. Export `X_PERSIST_KEYS` listing the slice's serializable state keys.
//   4. In gameStore.ts: spread `createXSlice(set, get)` into the root create
//      call, and concat `X_PERSIST_KEYS` into the root persist-keys array.
//
// The big win over the legacy `getSerializableState` destructure-everything-out
// pattern: adding a new state field is a one-line PERSIST_KEYS update, not
// a 70-action destructure edit.

import type { StateCreator } from 'zustand';
import type {
  GameState,
  StreetState,
  StreetBounds,
  StreetPlot,
  BuildingKind,
  DecorationKind,
  Position,
  StreetTool,
} from '../../types';
import type { GameActions } from '../gameStore';
import {
  BUILDING_DEFINITIONS,
  DECORATION_DEFINITIONS,
  plotAcquisitionCost,
} from '../../game/data/street';
import { withRecomputedBuzz } from '../../game/systems/BuzzSystem';
import { computeTheatreStats } from '../../game/systems/TheatreStats';
import { runPerformance } from '../../game/systems/TheatrePerformance';
import { generateShow } from '../../game/data/shows';
import { generateCastCandidate } from '../../game/data/staff';
import { advanceRehearsal } from '../../game/systems/RehearsalSystem';
import type { PerformanceSummary, Show, CastMember } from '../../types';

const STARTING_BOUNDS: StreetBounds = { minX: 0, maxX: 7, minY: 0, maxY: 2 };

/** Build the initial empty street — 8x3 starting block, all owned, no buildings yet. */
export function createEmptyStreet(): StreetState {
  const width = STARTING_BOUNDS.maxX - STARTING_BOUNDS.minX + 1;
  const height = STARTING_BOUNDS.maxY - STARTING_BOUNDS.minY + 1;
  const plots: StreetPlot[] = [];
  for (let y = STARTING_BOUNDS.minY; y <= STARTING_BOUNDS.maxY; y++) {
    for (let x = STARTING_BOUNDS.minX; x <= STARTING_BOUNDS.maxX; x++) {
      plots.push({ x, y, acquiredDay: 0 });
    }
  }
  return {
    bounds: { ...STARTING_BOUNDS },
    plots,
    placedBuildings: [],
    decoration: [],
    litter: [],
    buzzField: new Float32Array(width * height),
    buzzFieldWidth: width,
    buzzFieldHeight: height,
    dailyPhase: 'quiet',
    timeOfDay: 0,
  };
}

/** Uniform result type for placement / acquisition actions. */
export type PlacementResult =
  | { ok: true }
  | { ok: false; reason: string };

/** Slice surface: state + actions the street layer contributes to the root store. */
export interface StreetSlice {
  street: StreetState;

  /** Acquire a single plot tile. Must be adjacent to an existing owned plot. Deducts plot cost. */
  acquirePlot: (x: number, y: number, currentDay: number) => PlacementResult;

  /** Place a building (footprint check, ownership check, no overlap, cost). */
  placeBuilding: (kind: BuildingKind, position: Position, currentDay: number) => PlacementResult;

  /** Place a decoration item (single tile, ownership check, no overlap, cost). */
  placeDecoration: (kind: DecorationKind, position: Position, currentDay: number) => PlacementResult;

  /** Remove a placed building by id. No refund. */
  removeBuilding: (id: string) => void;

  /** Remove a placed decoration item by id. No refund. */
  removeDecoration: (id: string) => void;

  /** Reset to the starting street (used on new game). */
  resetStreet: () => void;

  /** Select a placement tool (building, decoration, or acquire-plot mode). */
  setStreetTool: (tool: StreetTool | null) => void;

  /** Select a placed building or decoration by id. Null to deselect. */
  selectStreetEntity: (id: string | null) => void;

  /** Toggle the buzz heat-map overlay. */
  toggleBuzzOverlay: () => void;

  /** Run a performance on a specific theatre. Credits revenue + updates popularity. */
  runTheatrePerformance: (buildingId: string) => PerformanceSummary | null;

  /** Open / close the theatre modal for the currently selected theatre. */
  openTheatreModal: () => void;
  closeTheatreModal: () => void;

  /** Upgrade a building from tier 1 → tier 2. Deducts cost. */
  upgradeBuilding: (id: string) => PlacementResult;

  /** Toggle the street sweeper hire. Daily cost ticked by TimeSystem. */
  toggleSweeper: () => void;

  // ============================================================
  // Theatre show production pipeline (legacy reuse)
  // ============================================================

  /** Generate 3 show options for the player to pick from. */
  commissionShowOptions: () => Show[];
  /** Commit one of the show options. Sets activeShowId. */
  commitShow: (showId: string) => void;
  /** Generate 3 cast candidates for a given role. */
  auditionForRole: (showId: string, roleId: string) => CastMember[];
  /** Advance the rehearsal by one day (wraps RehearsalSystem.advanceRehearsal). */
  advanceTheatreRehearsal: (showId: string) => { progress: number; eventMessage: string | null };
  /** Close the show; final popularity update for the host theatre. */
  closeTheatreShow: (showId: string, theatreId: string) => void;
}

/** State keys this slice owns. Concatenated into the root persist-keys array. */
export const STREET_PERSIST_KEYS = ['street'] as const satisfies ReadonlyArray<keyof GameState>;

type RootForStreet = GameState & GameActions & StreetSlice;

// ============================================================
// Internal helpers — pure functions on street state
// ============================================================

const tileKey = (x: number, y: number) => `${x},${y}`;

function inBounds(b: StreetBounds, x: number, y: number): boolean {
  return x >= b.minX && x <= b.maxX && y >= b.minY && y <= b.maxY;
}

function ownedTileSet(plots: StreetPlot[]): Set<string> {
  return new Set(plots.map((p) => tileKey(p.x, p.y)));
}

/** All tiles currently occupied by any placed building or decoration. */
function occupiedTileSet(street: StreetState): Set<string> {
  const out = new Set<string>();
  for (const b of street.placedBuildings) {
    const def = BUILDING_DEFINITIONS[b.kind];
    for (let dy = 0; dy < def.footprint.height; dy++) {
      for (let dx = 0; dx < def.footprint.width; dx++) {
        out.add(tileKey(b.position.x + dx, b.position.y + dy));
      }
    }
  }
  for (const d of street.decoration) {
    out.add(tileKey(d.position.x, d.position.y));
  }
  return out;
}

/** Footprint cells of a building anchored at position. */
function footprintCells(position: Position, w: number, h: number): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  for (let dy = 0; dy < h; dy++) {
    for (let dx = 0; dx < w; dx++) {
      out.push([position.x + dx, position.y + dy]);
    }
  }
  return out;
}

function isAdjacentToOwned(plots: StreetPlot[], x: number, y: number): boolean {
  const set = ownedTileSet(plots);
  return (
    set.has(tileKey(x - 1, y)) ||
    set.has(tileKey(x + 1, y)) ||
    set.has(tileKey(x, y - 1)) ||
    set.has(tileKey(x, y + 1))
  );
}

function newId(prefix: string): string {
  // crypto.randomUUID is standard in modern browsers + Node 19+.
  return `${prefix}-${crypto.randomUUID()}`;
}

// withRecomputedBuzz is imported from BuzzSystem so it can be shared with
// TimeSystem (which needs to recompute when construction completes). The
// locked-spec recompute trigger is still strictly event-driven, never per-frame.

// ============================================================
// Slice
// ============================================================

export const createStreetSlice: StateCreator<RootForStreet, [], [], StreetSlice> = (set, get) => ({
  street: createEmptyStreet(),

  acquirePlot: (x, y, currentDay) => {
    const s = get();
    if (s.street.plots.some((p) => p.x === x && p.y === y)) {
      return { ok: false, reason: 'Already owned' };
    }
    if (!isAdjacentToOwned(s.street.plots, x, y)) {
      return { ok: false, reason: 'Plot must touch your street' };
    }
    const cost = plotAcquisitionCost(s.street.plots.length);
    if (s.economy.cash < cost) {
      return { ok: false, reason: 'Not enough cash' };
    }
    s.removeCash(cost, 'plot', `Acquired plot (${x}, ${y})`);
    set((state) => {
      const newPlots = [...state.street.plots, { x, y, acquiredDay: currentDay }];
      const newBounds: StreetBounds = {
        minX: Math.min(state.street.bounds.minX, x),
        maxX: Math.max(state.street.bounds.maxX, x),
        minY: Math.min(state.street.bounds.minY, y),
        maxY: Math.max(state.street.bounds.maxY, y),
      };
      const newWidth = newBounds.maxX - newBounds.minX + 1;
      const newHeight = newBounds.maxY - newBounds.minY + 1;
      // Buzz field is recomputed from sources below — sizing it correctly is
      // all withRecomputedBuzz needs. No need to preserve old values.
      const resized: StreetState = {
        ...state.street,
        plots: newPlots,
        bounds: newBounds,
        buzzField: new Float32Array(newWidth * newHeight),
        buzzFieldWidth: newWidth,
        buzzFieldHeight: newHeight,
      };
      return { street: withRecomputedBuzz(resized) };
    });
    return { ok: true };
  },

  placeBuilding: (kind, position, currentDay) => {
    const def = BUILDING_DEFINITIONS[kind];
    if (!def) return { ok: false, reason: 'Unknown building kind' };
    const s = get();
    const cells = footprintCells(position, def.footprint.width, def.footprint.height);

    for (const [cx, cy] of cells) {
      if (!inBounds(s.street.bounds, cx, cy)) {
        return { ok: false, reason: 'Out of bounds' };
      }
    }
    const owned = ownedTileSet(s.street.plots);
    for (const [cx, cy] of cells) {
      if (!owned.has(tileKey(cx, cy))) {
        return { ok: false, reason: 'Not all tiles owned' };
      }
    }
    const occupied = occupiedTileSet(s.street);
    for (const [cx, cy] of cells) {
      if (occupied.has(tileKey(cx, cy))) {
        return { ok: false, reason: 'Tile occupied' };
      }
    }
    if (s.economy.cash < def.cost) {
      return { ok: false, reason: 'Not enough cash' };
    }
    s.removeCash(def.cost, 'construction', `Built ${def.label}`);
    set((state) => ({
      street: withRecomputedBuzz({
        ...state.street,
        placedBuildings: [
          ...state.street.placedBuildings,
          {
            id: newId('bld'),
            kind,
            position,
            footprint: def.footprint,
            constructedDay: currentDay,
            constructionDaysLeft: def.buildDays,
          },
        ],
      }),
    }));
    return { ok: true };
  },

  placeDecoration: (kind, position, currentDay) => {
    const def = DECORATION_DEFINITIONS[kind];
    if (!def) return { ok: false, reason: 'Unknown decoration kind' };
    const s = get();
    if (!inBounds(s.street.bounds, position.x, position.y)) {
      return { ok: false, reason: 'Out of bounds' };
    }
    const owned = ownedTileSet(s.street.plots);
    if (!owned.has(tileKey(position.x, position.y))) {
      return { ok: false, reason: 'Tile not owned' };
    }
    const occupied = occupiedTileSet(s.street);
    if (occupied.has(tileKey(position.x, position.y))) {
      return { ok: false, reason: 'Tile occupied' };
    }
    if (s.economy.cash < def.cost) {
      return { ok: false, reason: 'Not enough cash' };
    }
    s.removeCash(def.cost, 'decoration', `Placed ${def.label}`);
    set((state) => ({
      street: withRecomputedBuzz({
        ...state.street,
        decoration: [
          ...state.street.decoration,
          {
            id: newId('dec'),
            kind,
            position,
            placedDay: currentDay,
          },
        ],
      }),
    }));
    return { ok: true };
  },

  removeBuilding: (id) => {
    set((state) => ({
      street: withRecomputedBuzz({
        ...state.street,
        placedBuildings: state.street.placedBuildings.filter((b) => b.id !== id),
      }),
    }));
  },

  removeDecoration: (id) => {
    set((state) => ({
      street: withRecomputedBuzz({
        ...state.street,
        decoration: state.street.decoration.filter((d) => d.id !== id),
      }),
    }));
  },

  resetStreet: () => set({ street: createEmptyStreet() }),

  setStreetTool: (tool) => set((state) => ({
    ui: { ...state.ui, streetTool: tool, streetSelectedId: null },
  })),

  selectStreetEntity: (id) => set((state) => ({
    ui: { ...state.ui, streetSelectedId: id, streetTool: null },
  })),

  toggleBuzzOverlay: () => set((state) => ({
    ui: { ...state.ui, showBuzzOverlay: !state.ui.showBuzzOverlay },
  })),

  runTheatrePerformance: (buildingId) => {
    const s = get();
    const building = s.street.placedBuildings.find((b) => b.id === buildingId);
    if (!building || building.kind !== 'theatre' || building.constructionDaysLeft > 0) return null;
    const stats = computeTheatreStats(building, s.street);
    const { summary, newPopularity } = runPerformance(building, stats, s.time.day);

    // Credit revenue to economy
    if (summary.revenue > 0) {
      s.addCash(summary.revenue, 'box-office', `${building.kind} performance: ${summary.showName}`);
    }

    // Persist popularity + lastPerformance on the building; recompute buzz
    // (popularity feeds the theatre emission multiplier).
    set((state) => ({
      street: withRecomputedBuzz({
        ...state.street,
        placedBuildings: state.street.placedBuildings.map((b) =>
          b.id === buildingId
            ? { ...b, popularity: newPopularity, lastPerformance: summary }
            : b,
        ),
      }),
    }));
    return summary;
  },

  openTheatreModal: () => set((state) => ({
    ui: { ...state.ui, theatreModalOpen: true },
  })),

  closeTheatreModal: () => set((state) => ({
    ui: { ...state.ui, theatreModalOpen: false },
  })),

  upgradeBuilding: (id) => {
    const s = get();
    const building = s.street.placedBuildings.find((b) => b.id === id);
    if (!building) return { ok: false, reason: 'Not found' };
    if ((building.tier ?? 1) >= 2) return { ok: false, reason: 'Already upgraded' };
    if (building.constructionDaysLeft > 0) return { ok: false, reason: 'Finish construction first' };
    const cost = upgradeCost(building.kind);
    if (s.economy.cash < cost) return { ok: false, reason: 'Not enough cash' };
    s.removeCash(cost, 'upgrade', `Upgraded ${building.kind}`);
    set((state) => ({
      street: withRecomputedBuzz({
        ...state.street,
        placedBuildings: state.street.placedBuildings.map((b) =>
          b.id === id
            ? { ...b, tier: 2 as const, popularity: Math.max(b.popularity ?? 1.0, 1.2) }
            : b,
        ),
      }),
    }));
    return { ok: true };
  },

  toggleSweeper: () => set((state) => ({
    ui: { ...state.ui, sweeperHired: !state.ui.sweeperHired },
  })),

  commissionShowOptions: () => {
    const options = [generateShow(), generateShow(), generateShow()];
    get().setShowOptions(options);
    return options;
  },

  commitShow: (showId) => {
    // selectShow already exists; it sets activeShowId and copies the chosen
    // option into shows[] for downstream tracking.
    get().selectShow(showId);
  },

  auditionForRole: (_showId, _roleId) => {
    return [generateCastCandidate(), generateCastCandidate(), generateCastCandidate()];
  },

  advanceTheatreRehearsal: (showId) => {
    const s = get();
    const show = s.shows.find((sh) => sh.id === showId);
    if (!show) return { progress: 0, eventMessage: null };
    // For Theatre District we treat the theatre itself as the rehearsal space —
    // no per-room rehearsal hall lookup. Pass false/false (slowest baseline).
    // When per-theatre tier=2 buildings exist, treat as upgraded hall.
    const hostTheatre = s.street.placedBuildings.find((b) => b.kind === 'theatre' && b.constructionDaysLeft === 0);
    const isUpgraded = (hostTheatre?.tier ?? 1) === 2;
    const { updatedShow, event } = advanceRehearsal(show, true, isUpgraded, s.time.day);
    s.updateShow(showId, updatedShow);
    if (event) {
      s.addRehearsalLog?.({
        id: event.id,
        day: event.day,
        type: event.type,
        message: event.message,
      });
    }
    return { progress: updatedShow.rehearsalProgress, eventMessage: event?.message ?? null };
  },

  closeTheatreShow: (showId, theatreId) => {
    const s = get();
    const show = s.shows.find((sh) => sh.id === showId);
    if (!show) return;
    // Derive a final popularity bump from average attendance + critic score
    const attendanceFactor = show.averageAttendance ? show.averageAttendance / 100 : 0;
    const criticFactor = show.criticScore ? show.criticScore / 100 : 0.5;
    const finalDelta = (attendanceFactor + criticFactor - 1.0) * 0.3; // -0.3 .. +0.3
    set((state) => ({
      street: withRecomputedBuzz({
        ...state.street,
        placedBuildings: state.street.placedBuildings.map((b) =>
          b.id === theatreId
            ? { ...b, popularity: Math.max(0.4, Math.min(1.8, (b.popularity ?? 1.0) + finalDelta)) }
            : b,
        ),
      }),
    }));
    // Mark show closed
    s.updateShow(showId, {
      isRunning: false,
      closingNight: s.time.day,
    });
  },
});

/** Upgrade cost per building kind. */
function upgradeCost(kind: string): number {
  switch (kind) {
    case 'theatre': return 40_000;
    case 'restaurant': return 12_000;
    case 'cart': return 2_500;
    default: return 5_000;
  }
}
