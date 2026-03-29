// Time display utilities for Broadway Tycoon.
// Converts raw game day numbers into human-readable calendar dates.

const DAYS_PER_YEAR = 365;
const DAYS_PER_WEEK = 7;

const MONTHS: { name: string; short: string; days: number }[] = [
  { name: 'January',   short: 'Jan', days: 31 },
  { name: 'February',  short: 'Feb', days: 28 },
  { name: 'March',     short: 'Mar', days: 31 },
  { name: 'April',     short: 'Apr', days: 30 },
  { name: 'May',       short: 'May', days: 31 },
  { name: 'June',      short: 'Jun', days: 30 },
  { name: 'July',      short: 'Jul', days: 31 },
  { name: 'August',    short: 'Aug', days: 31 },
  { name: 'September', short: 'Sep', days: 30 },
  { name: 'October',   short: 'Oct', days: 31 },
  { name: 'November',  short: 'Nov', days: 30 },
  { name: 'December',  short: 'Dec', days: 31 },
];

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

/**
 * Decompose a game day number into year, month index, and day-of-month.
 * Day 1 = January 1, Year 1.
 */
function decompose(day: number): { year: number; monthIndex: number; dayOfMonth: number } {
  // Zero-index the day for modular arithmetic
  const zeroDay = day - 1;
  const year = Math.floor(zeroDay / DAYS_PER_YEAR) + 1;
  let remaining = zeroDay % DAYS_PER_YEAR;

  for (let m = 0; m < MONTHS.length; m++) {
    if (remaining < MONTHS[m].days) {
      return { year, monthIndex: m, dayOfMonth: remaining + 1 };
    }
    remaining -= MONTHS[m].days;
  }

  // Fallback (should never reach here with 365-day year)
  return { year, monthIndex: 11, dayOfMonth: 31 };
}

/**
 * Get the day of the week (Mon-Sun). Day 1 starts on Monday.
 */
export function getDayOfWeek(day: number): string {
  return DAY_NAMES[(day - 1) % DAYS_PER_WEEK];
}

/**
 * Format a game day as a readable date string.
 * Example: "Mon, Jan 15 — Year 1"
 */
export function getFormattedDate(day: number): string {
  const { year, monthIndex, dayOfMonth } = decompose(day);
  const dow = getDayOfWeek(day);
  const monthShort = MONTHS[monthIndex].short;
  return `${dow}, ${monthShort} ${dayOfMonth} — Year ${year}`;
}

/**
 * Get the week number (1-based). Week 1 is days 1-7.
 */
export function getWeekNumber(day: number): number {
  return Math.ceil(day / DAYS_PER_WEEK);
}

/**
 * Broadway schedule: shows run Tue-Sun, dark on Monday.
 * Returns true if the given day is a performance day.
 */
export function isPerformanceDay(day: number): boolean {
  // Day 1 = Monday (dark day), so Mon = index 0
  const dow = getDayOfWeek(day);
  return dow !== 'Mon';
}

/**
 * Get the full month name for a given day.
 */
export function getMonthName(day: number): string {
  const { monthIndex } = decompose(day);
  return MONTHS[monthIndex].name;
}

/**
 * Get the year number for a given day.
 */
export function getYear(day: number): number {
  return decompose(day).year;
}

/**
 * Get the season label for a given day.
 */
export function getSeason(day: number): string {
  const { monthIndex } = decompose(day);
  if (monthIndex >= 2 && monthIndex <= 4) return 'Spring';
  if (monthIndex >= 5 && monthIndex <= 7) return 'Summer';
  if (monthIndex >= 8 && monthIndex <= 10) return 'Fall';
  return 'Winter';
}
