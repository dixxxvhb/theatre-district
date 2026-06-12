// Memoized buzz field. Buzz recomputes ONLY when placements/litter change
// (architecture rule #6) — overlay rendering and crowd steering read this,
// the pure math lives in street/buzz.ts.

import { computeBuzzField } from '../street/buzz';
import { columnsForEra } from '../street/topology';
import type { StreetState, UpkeepState } from '../../types/td';

let cachedStreet: StreetState | null = null;
let cachedLitter: UpkeepState['litter'] | null = null;
let cachedField: Float32Array = new Float32Array(0);
let cachedCols = 0;

export interface BuzzFieldView {
  field: Float32Array;
  cols: number;
}

export function getBuzzField(street: StreetState, upkeep: UpkeepState): BuzzFieldView {
  if (street !== cachedStreet || upkeep.litter !== cachedLitter) {
    cachedStreet = street;
    cachedLitter = upkeep.litter;
    cachedField = computeBuzzField(street, upkeep.litter);
    cachedCols = columnsForEra(street.era);
  }
  return { field: cachedField, cols: cachedCols };
}
