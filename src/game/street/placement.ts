// Placement validation — pure functions, unit-testable, shared by the ghost
// preview (live tint) and the store actions (authoritative check).

import { AMENITIES, THEATRES } from '../config/balance';
import type { BuildingKind, DecorationKind, StreetState } from '../../types/td';
import { columnsForEra, tileKind } from './topology';

export interface PlacementResult {
  ok: boolean;
  reason?: string;
}

const ok: PlacementResult = { ok: true };
const fail = (reason: string): PlacementResult => ({ ok: false, reason });

export function catalogEntry(kind: BuildingKind) {
  return kind in THEATRES ? THEATRES[kind as keyof typeof THEATRES] : AMENITIES[kind as keyof typeof AMENITIES];
}

/** Rows decorations may occupy: sidewalks and lot-front rows. */
export function isDecorationRow(y: number): boolean {
  return y === 2 || y === 3 || y === 6 || y === 7;
}

export function canPlaceBuilding(
  street: StreetState,
  kind: BuildingKind,
  x: number,
  side: 'north' | 'south',
): PlacementResult {
  const cols = columnsForEra(street.era);
  const width = catalogEntry(kind).width;
  if (x < 0 || x + width > cols) return fail('Outside the street');

  for (const b of street.buildings) {
    if (b.side !== side) continue;
    const bw = catalogEntry(b.kind).width;
    if (x < b.x + bw && b.x < x + width) return fail('Lot occupied');
  }
  // Decorations on the lot-front rows block the footprint too.
  const frontRow = side === 'north' ? 2 : 7;
  for (const d of street.decorations) {
    const anchors = d.spanToX !== undefined ? [d.x, d.spanToX] : [d.x];
    if (d.y === frontRow && anchors.some((ax) => ax >= x && ax < x + width)) {
      return fail('Decoration in the way');
    }
  }
  return ok;
}

export function canPlaceDecoration(street: StreetState, _kind: DecorationKind, x: number, y: number): PlacementResult {
  const cols = columnsForEra(street.era);
  if (x < 0 || x >= cols) return fail('Outside the street');
  if (!isDecorationRow(y)) return fail('Sidewalk and lot-front tiles only');

  // One decoration per tile (string-light anchors included).
  for (const d of street.decorations) {
    const anchors = d.spanToX !== undefined ? [d.x, d.spanToX] : [d.x];
    if (d.y === y && anchors.includes(x)) return fail('Tile occupied');
  }
  // Lot-front tiles under a building are taken.
  if (tileKind(y).startsWith('lot')) {
    const side = y === 2 ? 'north' : 'south';
    for (const b of street.buildings) {
      if (b.side !== side) continue;
      const bw = catalogEntry(b.kind).width;
      if (x >= b.x && x < b.x + bw) return fail('Building in the way');
    }
  }
  return ok;
}

/** What occupies a tile, if anything — buildings win over decorations. */
export function findObjectAt(
  street: StreetState,
  x: number,
  y: number,
): { type: 'building' | 'decoration'; id: string } | null {
  const kind = tileKind(y);
  if (kind.startsWith('lot')) {
    const side = kind === 'lot_north' ? 'north' : 'south';
    for (const b of street.buildings) {
      if (b.side !== side) continue;
      const bw = catalogEntry(b.kind).width;
      if (x >= b.x && x < b.x + bw) return { type: 'building', id: b.id };
    }
  }
  for (const d of street.decorations) {
    if (d.y !== y) continue;
    if (d.spanToX !== undefined) {
      const [a, b] = [Math.min(d.x, d.spanToX), Math.max(d.x, d.spanToX)];
      if (x >= a && x <= b) return { type: 'decoration', id: d.id };
    } else if (d.x === x) {
      return { type: 'decoration', id: d.id };
    }
  }
  return null;
}

/** String lights span 2–6 tiles between two anchors on the same row. */
export function canPlaceStringLights(
  street: StreetState,
  x1: number,
  x2: number,
  y: number,
): PlacementResult {
  const span = Math.abs(x2 - x1);
  if (span < 2) return fail('Anchors too close');
  if (span > 6) return fail('Anchors too far apart');
  const a = canPlaceDecoration(street, 'string_lights', x1, y);
  if (!a.ok) return a;
  return canPlaceDecoration(street, 'string_lights', x2, y);
}
