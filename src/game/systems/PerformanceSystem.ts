// Performance system: nightly attendance, revenue, and expense calculations
import type { Show, CastMember, CrewMember, Room, Property, PerformanceResult } from '../../types';
import { getDayOfWeek, isPerformanceDay } from '../engine/TimeManager';
import { GAME_CONSTANTS } from '../data/constants';
import { calculateBuzzShare } from './RivalSystem';
import { useGameStore } from '../../store/gameStore';

const DAY_OF_WEEK_MODIFIERS: Record<string, number> = {
  Mon: 0,    // dark day — no performance
  Tue: 0.7,
  Wed: 0.7,
  Thu: 0.7,
  Fri: 0.9,
  Sat: 1.0,
  Sun: 0.85,
};

/**
 * Calculate seating capacity from seating rooms.
 * Uses 8 seats per tile of seating area.
 */
export function getSeatingCapacity(rooms: Room[]): number {
  const seatingRooms = rooms.filter((r) => r.type === 'seating' && !r.isConstructing);
  let totalSeats = 0;
  for (const room of seatingRooms) {
    const tiles = room.size.width * room.size.height;
    totalSeats += tiles * GAME_CONSTANTS.ROOMS.SEATING.seatsPerTile;
  }
  return totalSeats;
}

/**
 * Get VIP seat count from VIP lounge rooms.
 */
export function getVipSeats(rooms: Room[]): number {
  const vipRooms = rooms.filter((r) => r.type === 'vip_lounge' && !r.isConstructing);
  let seats = 0;
  for (const room of vipRooms) {
    seats += room.size.width * room.size.height * 4; // 4 VIP seats per tile
  }
  return seats;
}

interface PerformanceInput {
  show: Show;
  cast: CastMember[];
  crew: CrewMember[];
  property: Property;
  ticketPrice: number;
  currentDay: number;
  runDay: number;       // days since opening
}

/** Get attendance multiplier from current trend for a show genre */
function getTrendAttendanceMultiplier(genre: string): number {
  const state = useGameStore.getState();
  const activeTrend = state.campaign.currentTrend;
  if (!activeTrend) return 1;

  let multiplier = 1;
  for (const effect of activeTrend.trend.effects) {
    if (effect.type === 'attendance') {
      if (!effect.genre || effect.genre === genre) {
        multiplier *= effect.multiplier;
      }
    }
  }
  return multiplier;
}

/**
 * Calculate a single night's performance.
 * Returns null on dark days (Monday).
 */
export function calculatePerformance(input: PerformanceInput): PerformanceResult | null {
  const { show, cast, crew, property, ticketPrice, currentDay, runDay } = input;

  if (!isPerformanceDay(currentDay)) {
    return null; // Dark day
  }

  const rooms = property.rooms;
  const maxSeats = getSeatingCapacity(rooms);
  if (maxSeats === 0) return null;

  // Quality score — use show.quality which should be pre-calculated
  const showQuality = Math.max(1, show.quality);
  const buzzScore = Math.max(1, show.buzzScore);

  // Base attendance
  const baseAttendance = maxSeats * (showQuality / 100) * (buzzScore / 100);

  // Location modifier
  const locationMod = 1.0 + property.locationBonus.attendance;

  // Day of week modifier
  const dow = getDayOfWeek(currentDay);
  const dayOfWeekMod = DAY_OF_WEEK_MODIFIERS[dow] ?? 0.7;

  // Run length decay — audiences thin out over time
  const runLengthDecay = Math.max(0.5, 1.0 - (runDay / 200));

  // Rival buzz share — reduces attendance when rivals have more buzz
  const buzzShareMultiplier = calculateBuzzShare();

  // Trend modifier
  const trendMultiplier = getTrendAttendanceMultiplier(show.genre);

  // Final attendance
  const attendance = Math.min(
    maxSeats,
    Math.floor(baseAttendance * locationMod * dayOfWeekMod * runLengthDecay * buzzShareMultiplier * trendMultiplier),
  );

  // Revenue
  const ticketRevenue = attendance * ticketPrice;
  const hasConcession = rooms.some((r) => r.type === 'concession' && !r.isConstructing);
  const concessionRevenue = hasConcession ? attendance * 2 : 0;
  const hasVipLounge = rooms.some((r) => r.type === 'vip_lounge' && !r.isConstructing);
  const vipSeats = getVipSeats(rooms);
  const vipAttendees = hasVipLounge ? Math.min(vipSeats, Math.floor(attendance * 0.1)) : 0;
  const vipPrice = ticketPrice * 2.5;
  const vipRevenue = vipAttendees * vipPrice;
  const totalRevenue = ticketRevenue + concessionRevenue + vipRevenue;

  // Daily expenses
  const castSalaries = cast.reduce((sum, c) => sum + c.salary, 0) / 7;
  const crewSalaries = crew.reduce((sum, c) => sum + c.salary, 0) / 7;
  const facilityCost = 100 + (rooms.length * 25);
  const totalExpenses = Math.round(castSalaries + crewSalaries + facilityCost);

  const profit = Math.round(totalRevenue - totalExpenses);

  return {
    day: currentDay,
    attendance,
    capacity: maxSeats,
    revenue: Math.round(totalRevenue),
    expenses: totalExpenses,
    profit,
  };
}

/**
 * Check if a show should auto-close due to low attendance.
 * Returns true if attendance has been below 30% for 3 consecutive weeks.
 */
export function shouldAutoClose(
  performanceHistory: PerformanceResult[],
  capacity: number,
): boolean {
  const threshold = GAME_CONSTANTS.PERFORMANCE.CLOSING_ATTENDANCE_MIN;
  const requiredWeeks = GAME_CONSTANTS.PERFORMANCE.CLOSING_THRESHOLD_WEEKS;
  const requiredDays = requiredWeeks * 7;

  // Need enough history
  if (performanceHistory.length < requiredDays) return false;

  // Check the last N days of performances (excluding dark days)
  const recentPerfs = performanceHistory.slice(-requiredDays * 2) // grab extra to filter dark days
    .filter((p) => p.attendance > 0 || p.capacity > 0);

  if (recentPerfs.length < requiredDays) return false;

  const lastChunk = recentPerfs.slice(-requiredDays);
  const effectiveCapacity = capacity > 0 ? capacity : 1;
  return lastChunk.every((p) => p.attendance / effectiveCapacity < threshold);
}
