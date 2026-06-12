import { describe, expect, it } from 'vitest';
import {
  calendarLabel,
  dayOfSeason,
  dayPhase,
  isWeekend,
  seasonOf,
  timeOfDay,
  weekdayName,
  weekOf,
  yearOf,
} from './calendar';
import { TIME } from '../config/balance';

describe('calendar — weekdays', () => {
  it('day 1 is Monday, day 7 is Sunday, day 8 wraps to Monday', () => {
    expect(weekdayName(1)).toBe('Mon');
    expect(weekdayName(7)).toBe('Sun');
    expect(weekdayName(8)).toBe('Mon');
  });

  it('weekend is Saturday and Sunday only', () => {
    expect(isWeekend(5)).toBe(false); // Fri
    expect(isWeekend(6)).toBe(true); // Sat
    expect(isWeekend(7)).toBe(true); // Sun
    expect(isWeekend(8)).toBe(false); // Mon
  });

  it('weeks are 1-based and roll at day 8', () => {
    expect(weekOf(1)).toBe(1);
    expect(weekOf(7)).toBe(1);
    expect(weekOf(8)).toBe(2);
  });
});

describe('calendar — seasons and years', () => {
  // Season = 28 days, year = 112 days.
  it('season boundaries land on day 28/29', () => {
    expect(seasonOf(1)).toBe('spring');
    expect(seasonOf(28)).toBe('spring');
    expect(seasonOf(29)).toBe('summer');
    expect(seasonOf(57)).toBe('fall');
    expect(seasonOf(85)).toBe('winter');
    expect(seasonOf(112)).toBe('winter');
  });

  it('year rolls at day 113 back into spring', () => {
    expect(yearOf(112)).toBe(1);
    expect(yearOf(113)).toBe(2);
    expect(seasonOf(113)).toBe('spring');
  });

  it('dayOfSeason restarts at season turnover', () => {
    expect(dayOfSeason(1)).toBe(1);
    expect(dayOfSeason(28)).toBe(28);
    expect(dayOfSeason(29)).toBe(1);
  });

  it('label composes weekday, week, season, year', () => {
    expect(calendarLabel(1)).toBe('Mon · Week 1 · Spring, Year 1');
    expect(calendarLabel(113)).toBe('Mon · Week 17 · Spring, Year 2');
  });
});

describe('calendar — day phases (showtime pulse)', () => {
  const t = (fraction: number) => Math.round(fraction * TIME.TICKS_PER_DAY);

  it('timeOfDay maps ticks to [0, 1)', () => {
    expect(timeOfDay(0)).toBe(0);
    expect(timeOfDay(TIME.TICKS_PER_DAY / 2)).toBeCloseTo(0.5);
    expect(timeOfDay(TIME.TICKS_PER_DAY - 1)).toBeLessThan(1);
  });

  it('phases switch exactly at their boundaries', () => {
    expect(dayPhase(0)).toBe('quiet');
    expect(dayPhase(t(0.35) - 1)).toBe('quiet');
    expect(dayPhase(t(0.35))).toBe('preshow');
    expect(dayPhase(t(0.55))).toBe('curtain');
    expect(dayPhase(t(0.75))).toBe('postshow');
    expect(dayPhase(t(0.9))).toBe('winddown');
    expect(dayPhase(TIME.TICKS_PER_DAY - 1)).toBe('winddown');
  });
});
