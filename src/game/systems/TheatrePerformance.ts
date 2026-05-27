// TheatrePerformance — runs a single performance simulation for a placed
// theatre on the street. Bridges the show-name generator (reused from
// legacy data/shows.ts) with TheatreStats (street-derived).
//
// Returns a result + a popularity delta applied to the building.
// Real reintegration of the full cast/rehearsal/Tony flow lands later;
// this is the minimum viable "click theatre, run a show, see street react."

import type { PlacedBuilding, PerformanceSummary } from '../../types';
import { generateShowTitle } from '../data/shows';
import type { TheatreStats } from './TheatreStats';

const POP_GAIN_HIT = 0.18;
const POP_LOSS_FLOP = 0.12;
const POP_DRIFT_TO_MEAN = 0.04;
const POP_MIN = 0.4;
const POP_MAX = 1.8;
const POP_MEAN = 1.0;

export interface RunPerformanceOptions {
  /** Override the random hit roll for testing. */
  forceRoll?: number;
}

/**
 * Simulate one performance for a theatre.
 * - Roll a "show quality" 0..1 (uniform random unless forced).
 * - Fill = quality * ambianceScore * sqrt(facilityScore), clamped to 1.0.
 * - Revenue = capacity * fill * ticketPrice + vipCapacity * fill * vipScore * ticketPrice * 1.6
 * - Popularity moves toward hit (>0.65 quality) / flop (<0.35) bands.
 */
export function runPerformance(
  building: PlacedBuilding,
  stats: TheatreStats,
  currentDay: number,
  opts: RunPerformanceOptions = {},
): { summary: PerformanceSummary; newPopularity: number } {
  const roll = opts.forceRoll !== undefined
    ? Math.max(0, Math.min(1, opts.forceRoll))
    : Math.random();
  const quality = Math.round(roll * 100); // 0..100

  const ambiance = stats.ambianceScore;
  const facility = Math.sqrt(stats.facilityScore);
  let fill = roll * ambiance * facility;
  fill = Math.max(0.05, Math.min(1.0, fill));

  const attendance = Math.round(stats.capacity * fill);
  const generalRev = attendance * stats.ticketPrice;
  const vipFill = fill * stats.vipScore;
  const vipRev = stats.vipCapacity * vipFill * stats.ticketPrice * 1.6;
  const grossRevenue = Math.round(generalRev + vipRev);
  const revenue = Math.max(0, grossRevenue - stats.dailyOverhead);

  // Popularity update
  const currentPop = building.popularity ?? POP_MEAN;
  let popularityDelta: number;
  if (roll >= 0.65) {
    popularityDelta = POP_GAIN_HIT * (roll - 0.65) / 0.35; // 0..POP_GAIN_HIT
  } else if (roll <= 0.35) {
    popularityDelta = -POP_LOSS_FLOP * (0.35 - roll) / 0.35;
  } else {
    popularityDelta = (POP_MEAN - currentPop) * POP_DRIFT_TO_MEAN;
  }
  const newPopularity = Math.max(POP_MIN, Math.min(POP_MAX, currentPop + popularityDelta));

  const summary: PerformanceSummary = {
    day: currentDay,
    showName: generateShowTitle(),
    capacity: stats.capacity,
    attendance,
    fillFactor: fill,
    revenue,
    quality,
    popularityDelta,
  };
  return { summary, newPopularity };
}
