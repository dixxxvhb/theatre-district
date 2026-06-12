// The three recurring critics — distinct tastes, in-world voices. Verdicts
// land as Daily Playbill headlines and move momentum hard (spec).

import type { Production } from '../../types/td';
import type { UpgradeEffects } from '../production/logic';

export interface Review {
  critic: string;
  stars: number; // 1–5
  line: string;
}

interface Critic {
  name: string;
  /** Raw 0–100 score from their particular obsession. */
  score: (p: Production, fx: UpgradeEffects) => number;
  lines: Record<number, string[]>; // by star band
}

const CRITICS: Critic[] = [
  {
    // The drama purist — text first, spectacle suspect.
    name: 'Vivienne Marsh',
    score: (p) => {
      const script = p.show?.scriptQuality ?? 50;
      let s = p.quality * 0.55 + script * 0.45;
      if (p.show?.archetype === 'big_spectacle') s -= 8; // "noise"
      if (p.show?.archetype === 'intimate_chamber' || p.show?.archetype === 'critics_darling') s += 8;
      return s;
    },
    lines: {
      5: ['“A text honored, an evening earned.”', '“I wept, and I do not weep.”'],
      4: ['“Serious work, seriously done.”', '“The script breathes. Rare.”'],
      3: ['“Competent. The word is doing some lifting.”'],
      2: ['“The play deserved braver hands.”'],
      1: ['“An insult delivered in two acts.”', '“The interval was the highlight.”'],
    },
  },
  {
    // The spectacle lover — dazzle him and be forgiven anything.
    name: 'Bernard Quill',
    score: (p, fx) => {
      const appeal = p.show?.appeal ?? 50;
      let s = p.quality * 0.5 + appeal * 0.5;
      if (p.show?.genre === 'musical') s += 6;
      if (p.show?.archetype === 'big_spectacle') s += fx.spectacleUnlocked ? 14 : 2;
      if (p.show?.archetype === 'intimate_chamber') s -= 6;
      return s;
    },
    lines: {
      5: ['“My retinas are GRATEFUL.”', '“A spectacle! A SPECTACLE!”'],
      4: ['“Big, bold, and bright — as theatre should be.”'],
      3: ['“Fun enough, but where was the WOW?”'],
      2: ['“I checked my watch. Twice. During a chase scene.”'],
      1: ['“I have seen livelier fire drills.”'],
    },
  },
  {
    // The wildcard — nobody knows, least of all Jo.
    name: 'Jo Okafor',
    score: (p) => p.quality + (Math.random() * 44 - 22),
    lines: {
      5: ['“Perfect. No notes. Suspicious of myself.”'],
      4: ['“It got me. Annoyingly, it got me.”'],
      3: ['“Three stars: one for each idea it almost had.”'],
      2: ['“It happened, and now it is over.”'],
      1: ['“I would rather review the lobby carpet.”', '“No.”'],
    },
  },
];

function toStars(score: number): number {
  if (score >= 84) return 5;
  if (score >= 70) return 4;
  if (score >= 55) return 3;
  if (score >= 40) return 2;
  return 1;
}

export function reviewShow(p: Production, fx: UpgradeEffects): Review[] {
  return CRITICS.map((c) => {
    const stars = toStars(Math.min(100, Math.max(0, c.score(p, fx))));
    const pool = c.lines[stars];
    return { critic: c.name, stars, line: pool[Math.floor(Math.random() * pool.length)] };
  });
}

/** Opening verdict → momentum. Raves launch a show; pans bury it. */
export function verdictMomentum(reviews: Review[]): number {
  const avg = reviews.reduce((n, r) => n + r.stars, 0) / reviews.length;
  return Math.min(1.6, Math.max(0.55, 0.55 + avg * 0.21));
}

export function starString(stars: number): string {
  return '★'.repeat(stars) + '☆'.repeat(5 - stars);
}
