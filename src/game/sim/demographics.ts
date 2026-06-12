// Audience demographics — weighting tables, not separate AI (spec). Four
// groups with genre preferences, price tolerance, and amenity spend. The mix
// shifts with weekday/weekend (and seasons from Session 7); show genre +
// ticket price + street quality decide who actually comes.

import { isWeekend, seasonOf, type Season } from './calendar';

export type Demographic = 'tourists' | 'locals' | 'theatre_kids' | 'society';

export interface DemoWeights {
  /** Genre preference multipliers (missing genre = 1). */
  genres: Record<string, number>;
  /** Tolerance around the reference ticket price (higher shrugs at gouging). */
  priceTolerance: number;
  /** Amenity spend multiplier. */
  spendMult: number;
}

export const DEMOGRAPHICS: Record<Demographic, DemoWeights> = {
  tourists: {
    genres: { musical: 1.3, revival: 1.1, experimental: 0.6 },
    priceTolerance: 1.15,
    spendMult: 1.35,
  },
  locals: {
    genres: { play: 1.15, revival: 1.1, one_person_show: 1.1 },
    priceTolerance: 0.9,
    spendMult: 1.0,
  },
  theatre_kids: {
    genres: { musical: 1.4, experimental: 1.25, one_person_show: 1.1 },
    priceTolerance: 0.7,
    spendMult: 0.7,
  },
  society: {
    genres: { play: 1.2, musical: 1.05, experimental: 0.9 },
    priceTolerance: 1.5,
    spendMult: 1.6,
  },
};

/** Who's on the street today (fractions sum to 1). Weekends bring tourists;
 *  weekday matinee crowds are older and pickier. Seasons shift it further. */
export function audienceMix(day: number): Record<Demographic, number> {
  const weekend = isWeekend(day);
  const season: Season = seasonOf(day);
  let mix: Record<Demographic, number> = weekend
    ? { tourists: 0.38, locals: 0.3, theatre_kids: 0.17, society: 0.15 }
    : { tourists: 0.2, locals: 0.42, theatre_kids: 0.15, society: 0.23 };
  if (season === 'summer') mix = shift(mix, 'tourists', 0.16);
  if (season === 'spring') mix = shift(mix, 'society', 0.08);
  if (season === 'winter') mix = shift(mix, 'locals', 0.1);
  return mix;
}

function shift(mix: Record<Demographic, number>, toward: Demographic, amount: number): Record<Demographic, number> {
  const out = { ...mix };
  const others = (Object.keys(out) as Demographic[]).filter((k) => k !== toward);
  for (const k of others) out[k] -= amount / others.length;
  out[toward] += amount;
  return out;
}

/** Genre appetite of today's mix for a given show genre (≈0.7–1.3). */
export function genreAppetite(day: number, genre: string): number {
  const mix = audienceMix(day);
  let total = 0;
  for (const [demo, frac] of Object.entries(mix) as Array<[Demographic, number]>) {
    total += frac * (DEMOGRAPHICS[demo].genres[genre] ?? 1);
  }
  return total;
}

/** Price tolerance of today's mix (weights the elasticity reference). */
export function mixPriceTolerance(day: number): number {
  const mix = audienceMix(day);
  let total = 0;
  for (const [demo, frac] of Object.entries(mix) as Array<[Demographic, number]>) {
    total += frac * DEMOGRAPHICS[demo].priceTolerance;
  }
  return total;
}

/** Amenity spend multiplier of today's mix. */
export function mixSpendMult(day: number): number {
  const mix = audienceMix(day);
  let total = 0;
  for (const [demo, frac] of Object.entries(mix) as Array<[Demographic, number]>) {
    total += frac * DEMOGRAPHICS[demo].spendMult;
  }
  return total;
}

/** Demand elasticity: how price vs. (tolerance-adjusted) reference scales
 *  walk-ins. Gentle near the reference, punishing at 2×. */
export function priceDemand(price: number, refPrice: number, tolerance: number): number {
  const ref = refPrice * tolerance;
  return Math.min(1.5, Math.max(0.25, Math.pow(ref / Math.max(price, 1), 1.35)));
}

/** Gouging threshold: above this, momentum takes nightly damage. */
export function isGouging(price: number, refPrice: number, tolerance: number): boolean {
  return price > refPrice * tolerance * 1.4;
}
