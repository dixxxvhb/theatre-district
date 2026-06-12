// Street topology — pure functions describing the strip's shape.
//
// The street is a horizontal isometric strip. Rows, north (top) to south:
//   rows 0..2   north lots (3 deep, building fronts face row 2)
//   row  3      north sidewalk
//   rows 4..5   road
//   row  6      south sidewalk
//   rows 7..9   south lots (building fronts face row 7)
//
// Columns grow with era: 20 → 28 → 40 → 52 → 64. Tiles themselves carry no
// state — the store persists only placements, and everything else (kind,
// facing, bounds) derives from these functions.

import { STREET } from '../config/balance';

export type TileKind =
  | 'lot_north'
  | 'sidewalk_north'
  | 'road'
  | 'sidewalk_south'
  | 'lot_south';

export interface GridPos {
  x: number; // column, 0-based, grows east with the street
  y: number; // row, 0-based, 0 = north edge
}

const N_LOT_END = STREET.LOT_DEPTH; // exclusive
const N_SIDEWALK_END = N_LOT_END + STREET.SIDEWALK_ROWS;
const ROAD_END = N_SIDEWALK_END + STREET.ROAD_ROWS;
const S_SIDEWALK_END = ROAD_END + STREET.SIDEWALK_ROWS;

export function columnsForEra(eraIndex: number): number {
  const clamped = Math.min(Math.max(eraIndex, 0), STREET.COLUMNS_BY_ERA.length - 1);
  return STREET.COLUMNS_BY_ERA[clamped];
}

export function tileKind(y: number): TileKind {
  if (y < N_LOT_END) return 'lot_north';
  if (y < N_SIDEWALK_END) return 'sidewalk_north';
  if (y < ROAD_END) return 'road';
  if (y < S_SIDEWALK_END) return 'sidewalk_south';
  return 'lot_south';
}

export function isLot(y: number): boolean {
  const k = tileKind(y);
  return k === 'lot_north' || k === 'lot_south';
}

export function isSidewalk(y: number): boolean {
  const k = tileKind(y);
  return k === 'sidewalk_north' || k === 'sidewalk_south';
}

export function inBounds(pos: GridPos, eraIndex: number): boolean {
  return (
    pos.x >= 0 &&
    pos.x < columnsForEra(eraIndex) &&
    pos.y >= 0 &&
    pos.y < STREET.TOTAL_ROWS
  );
}

/**
 * The lot rows a building footprint occupies, anchored so its front row
 * touches the sidewalk (buildings auto-face the road — no player rotation).
 * `side` is derived from which half the anchor row falls in.
 */
export function lotSide(y: number): 'north' | 'south' | null {
  const k = tileKind(y);
  if (k === 'lot_north') return 'north';
  if (k === 'lot_south') return 'south';
  return null;
}

/**
 * Given a footprint depth and a lot side, the rows it occupies. North-lot
 * buildings press south against their sidewalk; south-lot buildings press
 * north against theirs. Depth never exceeds LOT_DEPTH (validated by caller).
 */
export function footprintRows(side: 'north' | 'south', depth: number): number[] {
  if (side === 'north') {
    const start = N_LOT_END - depth; // hug the sidewalk
    return Array.from({ length: depth }, (_, i) => start + i);
  }
  const start = S_SIDEWALK_END; // first south-lot row, hugging the sidewalk
  return Array.from({ length: depth }, (_, i) => start + i);
}

/** Row index of the sidewalk a lot side fronts onto. */
export function sidewalkRowFor(side: 'north' | 'south'): number {
  return side === 'north' ? N_LOT_END : ROAD_END;
}
