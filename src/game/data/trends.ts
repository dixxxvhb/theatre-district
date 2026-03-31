import type { Trend } from '../../types';

export const TRENDS: Trend[] = [
  {
    id: 'musical_renaissance',
    name: 'Musical Renaissance',
    description: 'Audiences are craving musicals this season',
    durationRange: [2, 3],
    effects: [
      { type: 'attendance', genre: 'musical', multiplier: 1.20 },
      { type: 'attendance', genre: 'play', multiplier: 0.90 },
    ],
  },
  {
    id: 'gritty_realism',
    name: 'Gritty Realism',
    description: 'Raw, real, unflinching — audiences want truth',
    durationRange: [2, 3],
    effects: [
      { type: 'attendance', genre: 'play', multiplier: 1.15 },
      { type: 'attendance', genre: 'experimental', multiplier: 1.15 },
    ],
  },
  {
    id: 'star_power_era',
    name: 'Star Power Era',
    description: 'Big names sell tickets — star-studded casts draw crowds',
    durationRange: [2, 3],
    effects: [
      { type: 'buzz', multiplier: 1.25 },
    ],
  },
  {
    id: 'budget_crunch',
    name: 'Budget Crunch',
    description: 'Costs are rising across the industry',
    durationRange: [2, 3],
    effects: [
      { type: 'cost', multiplier: 1.20 },
    ],
  },
  {
    id: 'revival_fever',
    name: 'Revival Fever',
    description: 'Nostalgia reigns — classic revivals pack houses',
    durationRange: [2, 3],
    effects: [
      { type: 'attendance', genre: 'revival', multiplier: 1.20 },
      { type: 'attendance', genre: 'experimental', multiplier: 0.90 },
    ],
  },
  {
    id: 'critics_season',
    name: "Critics' Season",
    description: 'The critics hold all the power this season',
    durationRange: [2, 3],
    effects: [
      { type: 'critic', multiplier: 2.0 },
      { type: 'buzz', multiplier: 0.50 },
    ],
  },
];

export function pickRandomTrend(excludeId?: string): Trend {
  const pool = excludeId ? TRENDS.filter((t) => t.id !== excludeId) : TRENDS;
  return pool[Math.floor(Math.random() * pool.length)];
}

export function rollTrendDuration(trend: Trend): number {
  const [min, max] = trend.durationRange;
  return min + Math.floor(Math.random() * (max - min + 1));
}
