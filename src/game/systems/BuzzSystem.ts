// BuzzSystem — locked-spec buzz field computation.
//
// Per the Theatre District prompt (LOCKED SPEC, DO NOT REDESIGN):
//   - Buzz spreads 3 tiles from each source, linear falloff
//   - Full strength on source tile, fading to zero at 4th ring out
//   - Each tile's buzz = sum of all sources reaching it
//   - Empty lots emit zero; litter / neglected = negative
//   - Decoration has DIMINISHING RETURNS per-tile (mandatory)
//   - Buildings (theatre/restaurant/cart) do NOT diminish — full-strength anchors
//   - Recompute only when street changes — NEVER per-frame
//
// Distance metric: Chebyshev (max(|dx|, |dy|)) — gives "rings" semantics.
// Falloff: max(0, 1 - d/4) → d=0→1.0, 1→0.75, 2→0.5, 3→0.25, 4+→0
//
// Diminishing returns formula (decoration only, per-tile):
//   contributions sorted high→low; i-th contributes base / (1 + k*(i-1))
//   k = 0.6 (tunable; playtest after Session 4)

import type { StreetState } from '../../types';

// Base buzz strength per source (provisional — tuned at playtest)
export const BUILDING_BUZZ: Record<string, number> = {
  theatre: 8,
  restaurant: 4,
  cart: 2,
};

export const DECORATION_BUZZ: Record<string, number> = {
  lamp: 0.6,
  tree: 0.9,
  fountain: 3,
  bench: 0.3,
  poster: 1.4,
  string_lights: 1.0,
};

/** Negative emission per litter amount unit. */
export const LITTER_PENALTY = 1.5;

/** Decoration diminishing-returns coefficient. Larger k = harsher diminishment. */
const DECORATION_DIM_K = 0.6;

/** Chebyshev falloff radius — buzz reaches up to ring 3 inclusive. */
export const BUZZ_RADIUS = 3;

/** Distance ring → falloff multiplier. Precomputed for hot loop. */
const FALLOFF: ReadonlyArray<number> = [1.0, 0.75, 0.5, 0.25];

/**
 * Recompute the buzz field for the current street state.
 * Pure function — returns a NEW Float32Array sized to bounds; does not mutate input.
 */
export function computeBuzz(street: StreetState): Float32Array {
  const W = street.buzzFieldWidth;
  const H = street.buzzFieldHeight;
  const field = new Float32Array(W * H);
  const minX = street.bounds.minX;
  const minY = street.bounds.minY;

  const tileIndex = (x: number, y: number): number => {
    if (x < street.bounds.minX || x > street.bounds.maxX) return -1;
    if (y < street.bounds.minY || y > street.bounds.maxY) return -1;
    return (x - minX) + (y - minY) * W;
  };

  // --- 1. Buildings: full strength, no diminishing ---
  for (const b of street.placedBuildings) {
    if (b.constructionDaysLeft > 0) continue; // unfinished doesn't emit yet
    const base = BUILDING_BUZZ[b.kind];
    if (!base) continue;
    spreadFrom(field, tileIndex, b.position.x, b.position.y, base, 1);
  }

  // --- 2. Decoration: per-tile diminishing-returns pool ---
  // Collect all contributions per tile first, then apply diminishing sort.
  const decorContribsByTile = new Map<number, number[]>();
  for (const d of street.decoration) {
    const base = DECORATION_BUZZ[d.kind];
    if (!base) continue;
    for (let dy = -BUZZ_RADIUS; dy <= BUZZ_RADIUS; dy++) {
      for (let dx = -BUZZ_RADIUS; dx <= BUZZ_RADIUS; dx++) {
        const dist = Math.max(Math.abs(dx), Math.abs(dy));
        if (dist > BUZZ_RADIUS) continue;
        const fall = FALLOFF[dist];
        if (!fall) continue;
        const idx = tileIndex(d.position.x + dx, d.position.y + dy);
        if (idx < 0) continue;
        const arr = decorContribsByTile.get(idx);
        if (arr) arr.push(base * fall);
        else decorContribsByTile.set(idx, [base * fall]);
      }
    }
  }
  for (const [idx, contribs] of decorContribsByTile) {
    contribs.sort((a, b) => b - a); // strongest first
    let total = 0;
    for (let i = 0; i < contribs.length; i++) {
      total += contribs[i] / (1 + DECORATION_DIM_K * i);
    }
    field[idx] += total;
  }

  // --- 3. Litter: negative emission, no diminishing ---
  for (const l of street.litter) {
    spreadFrom(field, tileIndex, l.x, l.y, -LITTER_PENALTY * l.amount, 1);
  }

  return field;
}

/** Add a falloff-spread contribution to the field from one source point. */
function spreadFrom(
  field: Float32Array,
  tileIndex: (x: number, y: number) => number,
  sx: number,
  sy: number,
  base: number,
  weight: number,
): void {
  for (let dy = -BUZZ_RADIUS; dy <= BUZZ_RADIUS; dy++) {
    for (let dx = -BUZZ_RADIUS; dx <= BUZZ_RADIUS; dx++) {
      const dist = Math.max(Math.abs(dx), Math.abs(dy));
      if (dist > BUZZ_RADIUS) continue;
      const fall = FALLOFF[dist];
      if (!fall) continue;
      const idx = tileIndex(sx + dx, sy + dy);
      if (idx < 0) continue;
      field[idx] += base * fall * weight;
    }
  }
}

// ============================================================
// Convenience queries (used by UI + crowd in later sessions)
// ============================================================

/** Read buzz at a specific tile from a field. Returns 0 if out of bounds. */
export function buzzAt(street: StreetState, x: number, y: number): number {
  if (x < street.bounds.minX || x > street.bounds.maxX) return 0;
  if (y < street.bounds.minY || y > street.bounds.maxY) return 0;
  const idx = (x - street.bounds.minX) + (y - street.bounds.minY) * street.buzzFieldWidth;
  return street.buzzField[idx] ?? 0;
}

/**
 * Wrap a street update with a fresh buzz recompute.
 * Shared by streetSlice (mutations) + TimeSystem (construction-complete transitions).
 */
export function withRecomputedBuzz(next: StreetState): StreetState {
  return { ...next, buzzField: computeBuzz(next) };
}

/** Min and max values in the field — used to normalize the heat-map gradient. */
export function buzzExtent(field: Float32Array): { min: number; max: number } {
  if (field.length === 0) return { min: 0, max: 0 };
  let min = field[0];
  let max = field[0];
  for (let i = 1; i < field.length; i++) {
    const v = field[i];
    if (v < min) min = v;
    if (v > max) max = v;
  }
  return { min, max };
}

