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
} from '../../types';

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
  };
}

/** Slice surface: state + actions the street layer contributes to the root store. */
export interface StreetSlice {
  street: StreetState;
  /** Add a single plot tile. Expands bounds if needed; preserves existing buzz values. */
  acquirePlot: (x: number, y: number, currentDay: number) => boolean;
  /** Reset to the starting street (used on new game). */
  resetStreet: () => void;
}

/** State keys this slice owns. Concatenated into the root persist-keys array. */
export const STREET_PERSIST_KEYS = ['street'] as const satisfies ReadonlyArray<keyof GameState>;

type RootStateForSlice = StreetSlice & { street: StreetState };

export const createStreetSlice: StateCreator<RootStateForSlice, [], [], StreetSlice> = (set, get) => ({
  street: createEmptyStreet(),

  acquirePlot: (x, y, currentDay) => {
    const s = get();
    const exists = s.street.plots.some((p) => p.x === x && p.y === y);
    if (exists) return false;
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
      // Resize buzz field — preserve existing values in the new index space
      const newBuzz = new Float32Array(newWidth * newHeight);
      const oldB = state.street.bounds;
      const oldW = state.street.buzzFieldWidth;
      for (let oy = oldB.minY; oy <= oldB.maxY; oy++) {
        for (let ox = oldB.minX; ox <= oldB.maxX; ox++) {
          const oldIdx = (ox - oldB.minX) + (oy - oldB.minY) * oldW;
          const newIdx = (ox - newBounds.minX) + (oy - newBounds.minY) * newWidth;
          newBuzz[newIdx] = state.street.buzzField[oldIdx] ?? 0;
        }
      }
      return {
        street: {
          ...state.street,
          plots: newPlots,
          bounds: newBounds,
          buzzField: newBuzz,
          buzzFieldWidth: newWidth,
          buzzFieldHeight: newHeight,
        },
      };
    });
    return true;
  },

  resetStreet: () => set({ street: createEmptyStreet() }),
});
