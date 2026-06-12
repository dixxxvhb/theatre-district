// Calendar math for Theatre District. All pure functions of (day, tickOfDay)
// so every derivation is unit-testable and the store only persists two numbers.
//
// Day numbering is 1-based (day 1 = first day of a new game).

import { CALENDAR, DAY_PHASES, TIME } from '../config/balance';

export type Season = (typeof CALENDAR.SEASONS)[number];
export type DayPhase = keyof typeof DAY_PHASES;

const DAYS_PER_SEASON = CALENDAR.DAYS_PER_WEEK * CALENDAR.WEEKS_PER_SEASON;
const DAYS_PER_YEAR = DAYS_PER_SEASON * CALENDAR.SEASONS_PER_YEAR;

/** 0-based weekday index (0 = Mon … 6 = Sun). */
export function weekdayIndex(day: number): number {
  return (day - 1 + CALENDAR.STARTING_WEEKDAY) % CALENDAR.DAYS_PER_WEEK;
}

export function weekdayName(day: number): string {
  return CALENDAR.WEEKDAY_NAMES[weekdayIndex(day)];
}

/** Saturday and Sunday. Weekend crowds are larger and looser-spending. */
export function isWeekend(day: number): boolean {
  return weekdayIndex(day) >= 5;
}

/** 1-based week number since game start. */
export function weekOf(day: number): number {
  return Math.floor((day - 1) / CALENDAR.DAYS_PER_WEEK) + 1;
}

export function seasonOf(day: number): Season {
  const idx = Math.floor(((day - 1) % DAYS_PER_YEAR) / DAYS_PER_SEASON);
  return CALENDAR.SEASONS[idx];
}

/** 1-based year number. */
export function yearOf(day: number): number {
  return Math.floor((day - 1) / DAYS_PER_YEAR) + 1;
}

/** 1-based day within the current season (1..28). */
export function dayOfSeason(day: number): number {
  return ((day - 1) % DAYS_PER_SEASON) + 1;
}

/** Fraction of the day elapsed, 0 ≤ t < 1. */
export function timeOfDay(tickOfDay: number): number {
  return Math.min(Math.max(tickOfDay / TIME.TICKS_PER_DAY, 0), 1 - 1e-9);
}

/** Which showtime-pulse phase the street is in. */
export function dayPhase(tickOfDay: number): DayPhase {
  const t = timeOfDay(tickOfDay);
  for (const [name, range] of Object.entries(DAY_PHASES)) {
    if (t >= range.start && t < range.end) return name as DayPhase;
  }
  return 'winddown'; // t ≈ 1 edge
}

/** Display string, e.g. "Tue · Week 3 · Spring, Year 1". */
export function calendarLabel(day: number): string {
  const season = seasonOf(day);
  const cap = season.charAt(0).toUpperCase() + season.slice(1);
  return `${weekdayName(day)} · Week ${weekOf(day)} · ${cap}, Year ${yearOf(day)}`;
}
