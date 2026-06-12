// Five eras of one street — gameplay scope grows with each.
//
// Each era has a name, an opening title-card line, a milestone checklist
// (2–3 concrete conditions; advance unlocks at all-checked), and a short
// turnover beat played by the App shell.

import type { TDState } from '../../types/td';

export interface EraDef {
  /** 0-indexed era number. */
  index: number;
  name: string;
  /** A short evocative subtitle for the title card. */
  subtitle: string;
  /** 2–3 concrete unlock conditions. */
  milestones: Array<{
    label: string;
    check: (s: TDState) => boolean;
  }>;
  /** One-line announcement when this era begins. */
  arrivalLine: string;
}

function operationalTheatres(s: TDState): number {
  return s.street.buildings.filter((b) => b.kind.startsWith('theatre_') && b.constructionDaysLeft === 0 && b.condition >= 0.4).length;
}

function totalGross(s: TDState): number {
  return Object.values(s.productions).reduce((n, p) => n + p.gross, 0);
}

function uniqueOpened(s: TDState): number {
  return Object.values(s.productions).filter((p) => p.stage === 'running' || (p.runDays ?? 0) > 0).length;
}

function amenityCount(s: TDState): number {
  return s.street.buildings.filter((b) => !b.kind.startsWith('theatre_') && b.constructionDaysLeft === 0).length;
}

function decorationCount(s: TDState): number {
  return s.street.decorations.length;
}

export const ERAS: EraDef[] = [
  {
    index: 0,
    name: 'The Dark Block',
    subtitle: 'One derelict theatre. A flickering lamp. Promise.',
    arrivalLine: 'The Dark Block — your inheritance.',
    milestones: [
      { label: 'Restore the inherited playhouse', check: (s) => s.street.buildings.some((b) => b.kind === 'theatre_playhouse' && b.condition >= 0.95) },
      { label: 'Open your first show (begin previews)', check: (s) => Object.values(s.productions).some((p) => p.stage === 'previews' || p.stage === 'running') },
      { label: 'Place at least 2 amenities or decorations', check: (s) => amenityCount(s) + decorationCount(s) >= 2 },
    ],
  },
  {
    index: 1,
    name: 'First Light',
    subtitle: 'A second house. The street wakes up.',
    arrivalLine: 'First Light — the street extends.',
    milestones: [
      { label: 'Open a second theatre with its own show', check: (s) => operationalTheatres(s) >= 2 && Object.values(s.productions).filter((p) => p.stage === 'running').length >= 2 },
      { label: 'Stash $40,000 cash', check: (s) => s.economy.cash >= 40_000 },
      { label: 'Place 4+ amenities', check: (s) => amenityCount(s) >= 4 },
    ],
  },
  {
    index: 2,
    name: 'The Strip',
    subtitle: 'Critics circle. The block becomes a destination.',
    arrivalLine: 'The Strip — the critics are paying attention.',
    milestones: [
      { label: 'Lifetime gross past $100,000', check: (s) => totalGross(s) >= 100_000 },
      { label: 'Three operational theatres', check: (s) => operationalTheatres(s) >= 3 },
      { label: 'Buy at least 3 Theatre Upgrades', check: (s) => s.street.buildings.reduce((n, b) => n + (b.upgrades?.length ?? 0), 0) >= 3 },
    ],
  },
  {
    index: 3,
    name: 'The Destination',
    subtitle: 'Tourists arrive in coachloads. Rival districts notice.',
    arrivalLine: 'The Destination — the rival district notices.',
    milestones: [
      { label: 'Lifetime gross past $250,000', check: (s) => totalGross(s) >= 250_000 },
      { label: 'Four operational theatres', check: (s) => operationalTheatres(s) >= 4 },
      { label: 'Open at least 6 shows in total', check: (s) => uniqueOpened(s) >= 6 },
    ],
  },
  {
    index: 4,
    name: 'The District',
    subtitle: 'A name that travels. The full street, lit.',
    arrivalLine: 'The District — the city knows your street by name.',
    milestones: [
      { label: 'Lifetime gross past $500,000', check: (s) => totalGross(s) >= 500_000 },
      { label: 'A Grand Theatre operational', check: (s) => s.street.buildings.some((b) => b.kind === 'theatre_grand' && b.constructionDaysLeft === 0) },
      { label: 'Hold a Gala finale (end of era 5)', check: () => false }, // satisfied by reaching era 4 itself; finale isn't a gate
    ],
  },
];

/** All conditions met for the given era? */
export function eraComplete(s: TDState, era: number): boolean {
  const def = ERAS[era];
  if (!def) return false;
  // Era 4 is the terminal era — never "complete" for advancement purposes.
  if (era >= 4) return false;
  return def.milestones.every((m) => m.check(s));
}

/** Progress fractions per milestone (0 or 1 for now — content is binary). */
export function eraStatus(s: TDState, era: number): Array<{ label: string; done: boolean }> {
  const def = ERAS[era] ?? ERAS[0];
  return def.milestones.map((m) => ({ label: m.label, done: m.check(s) }));
}
