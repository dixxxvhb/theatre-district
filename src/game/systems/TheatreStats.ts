// TheatreStats — derives performance-relevant numbers from a placed theatre.
//
// In Session 0 audit, PerformanceSystem's coupling to rooms[] (counting seating
// tiles, vip tiles, concession presence) was flagged as the one show-logic
// touch point requiring a refactor. This module is the input adapter:
// PlacedBuilding + nearby street context → TheatreStats blob.
//
// Used by the Theatre District performance helper and (when reintegrated)
// by the legacy PerformanceSystem refactor.

import type { PlacedBuilding, StreetState } from '../../types';
import { BUILDING_DEFINITIONS } from '../data/street';

const BASE_TICKET_PRICE = 28; // dollars — mid-market Broadway ticket
const SEATS_PER_FOOTPRINT_TILE = 60; // theatre 2x2 = 240 seats; cart 1x1 = 60 (small venues)
const VIP_PREMIUM_FRACTION = 0.10; // 10% of seats are VIP

export interface TheatreStats {
  /** Display label */
  label: string;
  /** Total seats */
  capacity: number;
  /** Of those, premium seats */
  vipCapacity: number;
  /** Base ticket price ($) */
  ticketPrice: number;
  /** Bonus multipliers from facility + decoration neighbors. 1.0 = baseline. */
  facilityScore: number;     // affects quality
  ambianceScore: number;     // affects fill factor
  vipScore: number;          // affects vip yield
  /** Daily overhead cost (not yet wired into balance) */
  dailyOverhead: number;
  /** Convenience: does this theatre have a concession-adjacent amenity? */
  hasConcessionNearby: boolean;
  hasVipFlair: boolean;
}

/**
 * Derive stats from a theatre + its surrounding street context.
 * Footprint determines capacity; nearby decoration boosts ambiance;
 * nearby restaurant/cart counts as a concession-adjacent amenity.
 */
export function computeTheatreStats(
  building: PlacedBuilding,
  street: StreetState,
): TheatreStats {
  const def = BUILDING_DEFINITIONS[building.kind];
  const tiles = def.footprint.width * def.footprint.height;
  const capacity = tiles * SEATS_PER_FOOTPRINT_TILE;
  const vipCapacity = Math.round(capacity * VIP_PREMIUM_FRACTION);

  // Count decoration neighbors within 3 tiles for ambiance + amenity nearby checks
  let ambiance = 1.0;
  let hasFountain = false;
  let posterCount = 0;
  for (const d of street.decoration) {
    const dx = Math.abs(d.position.x - building.position.x);
    const dy = Math.abs(d.position.y - building.position.y);
    const dist = Math.max(dx, dy);
    if (dist > 3) continue;
    switch (d.kind) {
      case 'fountain':
        ambiance += 0.18;
        hasFountain = true;
        break;
      case 'poster':
        posterCount += 1;
        ambiance += 0.05;
        break;
      case 'string_lights':
        ambiance += 0.06;
        break;
      case 'tree':
        ambiance += 0.04;
        break;
      case 'lamp':
        ambiance += 0.02;
        break;
      case 'bench':
        ambiance += 0.01;
        break;
    }
  }
  ambiance = Math.min(1.6, ambiance);

  // Adjacent amenities (within 4 tiles): restaurant/cart count as concession-adjacent
  let amenityCount = 0;
  for (const b of street.placedBuildings) {
    if (b.id === building.id) continue;
    if (b.constructionDaysLeft > 0) continue;
    if (b.kind === 'theatre') continue;
    const dx = Math.abs(b.position.x - building.position.x);
    const dy = Math.abs(b.position.y - building.position.y);
    if (Math.max(dx, dy) <= 4) amenityCount += 1;
  }

  const facilityScore = 1.0 + amenityCount * 0.08;
  const vipScore = hasFountain ? 1.25 : 1.0;
  const dailyOverhead = 200 + tiles * 100;

  return {
    label: `${def.label} on (${building.position.x},${building.position.y})`,
    capacity,
    vipCapacity,
    ticketPrice: BASE_TICKET_PRICE + posterCount * 2,
    facilityScore: Math.min(1.6, facilityScore),
    ambianceScore: ambiance,
    vipScore,
    dailyOverhead,
    hasConcessionNearby: amenityCount > 0,
    hasVipFlair: hasFountain,
  };
}

