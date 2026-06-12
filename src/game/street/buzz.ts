// Buzz — the street's desirability field. LOCKED SPEC (CLAUDE.md):
//   · sources spread 3 tiles (Chebyshev rings), linear falloff 1/.75/.5/.25→0
//   · a tile's buzz = SUM of all sources reaching it
//   · empty lots emit zero; derelict/neglected buildings emit negative
//   · decoration has diminishing returns per overlapping pool; buildings don't
//   · litter is a local negative (it doesn't spread)
//   · recomputed on placement/removal/state change — NEVER per frame
//
// Pure functions over store state. The field is a Float32Array indexed
// [y * cols + x]; a memoized wrapper lives in sim/buzzCache.ts.

import { AMENITIES, BUZZ, DECORATIONS, STREET, THEATRES } from '../config/balance';
import type { PlacedBuilding, PlacedDecoration, StreetState } from '../../types/td';
import { columnsForEra, footprintRows } from './topology';

export interface BuzzSource {
  x: number;
  y: number;
  strength: number;
  decoration: boolean;
}

function catalogFor(kind: PlacedBuilding['kind']) {
  return kind in THEATRES
    ? THEATRES[kind as keyof typeof THEATRES]
    : AMENITIES[kind as keyof typeof AMENITIES];
}

export function buildingWidth(kind: PlacedBuilding['kind']): number {
  return catalogFor(kind).width;
}

export function isTheatre(kind: PlacedBuilding['kind']): boolean {
  return kind in THEATRES;
}

/** Whether a building currently radiates blight instead of buzz. */
export function isBlighted(b: PlacedBuilding): boolean {
  return b.condition < BUZZ.NEGLECT_THRESHOLD;
}

export function buildingEmission(b: PlacedBuilding): number {
  if (b.constructionDaysLeft > 0) return 0; // construction sites are neutral
  if (isBlighted(b)) return b.condition <= 0.25 ? BUZZ.DERELICT_EMISSION : BUZZ.NEGLECT_EMISSION;
  return catalogFor(b.kind).buzz;
}

/** Every tile a building footprint covers emits at full strength (the spec's
 *  "full strength on source tile" for multi-tile sources). */
export function buildingSources(b: PlacedBuilding): BuzzSource[] {
  const strength = buildingEmission(b);
  if (strength === 0) return [];
  const rows = footprintRows(b.side, 3);
  const width = buildingWidth(b.kind);
  const out: BuzzSource[] = [];
  for (const y of rows) {
    for (let x = b.x; x < b.x + width; x++) {
      out.push({ x, y, strength, decoration: false });
    }
  }
  return out;
}

export function decorationSources(d: PlacedDecoration): BuzzSource[] {
  const strength = DECORATIONS[d.kind].buzz;
  const out: BuzzSource[] = [{ x: d.x, y: d.y, strength, decoration: true }];
  // String lights emit from both anchors.
  if (d.kind === 'string_lights' && d.spanToX !== undefined) {
    out.push({ x: d.spanToX, y: d.y, strength, decoration: true });
  }
  return out;
}

/** Linear falloff by Chebyshev ring distance; 0 beyond SPREAD. */
export function falloff(ring: number): number {
  return ring <= BUZZ.SPREAD ? BUZZ.FALLOFF[ring] : 0;
}

/**
 * Compute the full buzz field for the street.
 * Building contributions sum plainly. Decoration contributions are collected
 * per tile, sorted strongest-first, and weighted 1, D, D², … (D = DIMINISH).
 */
export function computeBuzzField(street: StreetState, litter: Record<string, number>): Float32Array {
  const cols = columnsForEra(street.era);
  const rows = STREET.TOTAL_ROWS;
  const field = new Float32Array(cols * rows);
  const decoPools: Array<number[]> = Array.from({ length: cols * rows }, () => []);

  const sources: BuzzSource[] = [
    ...street.buildings.flatMap(buildingSources),
    ...street.decorations.flatMap(decorationSources),
  ];

  for (const s of sources) {
    for (let dy = -BUZZ.SPREAD; dy <= BUZZ.SPREAD; dy++) {
      const y = s.y + dy;
      if (y < 0 || y >= rows) continue;
      for (let dx = -BUZZ.SPREAD; dx <= BUZZ.SPREAD; dx++) {
        const x = s.x + dx;
        if (x < 0 || x >= cols) continue;
        const ring = Math.max(Math.abs(dx), Math.abs(dy));
        const value = s.strength * falloff(ring);
        if (value === 0) continue;
        const i = y * cols + x;
        if (s.decoration) decoPools[i].push(value);
        else field[i] += value;
      }
    }
  }

  // Diminishing returns per overlapping decoration pool.
  for (let i = 0; i < decoPools.length; i++) {
    const pool = decoPools[i];
    if (pool.length === 0) continue;
    pool.sort((a, b) => b - a);
    let weight = 1;
    for (const v of pool) {
      field[i] += v * weight;
      weight *= BUZZ.DIMINISH;
    }
  }

  // Litter: local negative, clamped, no spread.
  for (const [key, units] of Object.entries(litter)) {
    const [xs, ys] = key.split(',');
    const x = Number(xs);
    const y = Number(ys);
    if (x < 0 || x >= cols || y < 0 || y >= rows) continue;
    field[y * cols + x] += BUZZ.LITTER_PER_UNIT * Math.min(units, BUZZ.LITTER_MAX_UNITS);
  }

  return field;
}

export function buzzAt(field: Float32Array, cols: number, x: number, y: number): number {
  return field[y * cols + x] ?? 0;
}

export const litterKey = (x: number, y: number): string => `${x},${y}`;
