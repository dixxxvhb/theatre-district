// Show system: generation, quality calculation, and commissioning
import type { Show, ShowGenre, CastMember, CrewMember, Room } from '../../types';
import { generateShow } from '../data/shows';
import { GAME_CONSTANTS } from '../data/constants';

/**
 * Generate N show options for the player to choose from.
 */
export function generateShowOptions(count: number): Show[] {
  const shows: Show[] = [];
  const usedTitles = new Set<string>();

  while (shows.length < count) {
    const show = generateShow();
    if (!usedTitles.has(show.title)) {
      usedTitles.add(show.title);
      shows.push(show);
    }
  }

  return shows;
}

/**
 * Calculate show quality using the GDD formula:
 *
 * baseQuality = scriptQuality * 0.3 + avgCastSkill * 0.25 + directorSkill * 0.15
 *             + rehearsalReadiness * 0.15 + productionBudgetRatio * 0.10 + facilityBonus * 0.05
 */
export function calculateShowQuality(
  show: Show,
  cast: CastMember[],
  crew: CrewMember[],
  rooms: Room[],
): number {
  // Script quality (0-100)
  const scriptQuality = show.scriptQuality;

  // Average cast talent for cast members assigned to this show's roles
  const assignedCast = cast.filter((c) =>
    show.roles.some((r) => r.castMemberId === c.id),
  );
  const avgCastSkill = assignedCast.length > 0
    ? assignedCast.reduce((sum, c) => sum + c.talent, 0) / assignedCast.length
    : 0;

  // Director skill
  const director = crew.find((c) => c.role === 'director' && c.hired);
  const directorSkill = director?.skill ?? 0;

  // Rehearsal readiness (rehearsalProgress 0-100)
  const rehearsalReadiness = show.rehearsalProgress;

  // Production budget ratio: 1.0 if budget is at idealBudget, scales linearly
  // For now use 0.5 as a baseline (budget tracking not yet fully wired)
  const productionBudgetRatio = 50;

  // Facility bonus: having key rooms adds bonus
  const hasRehearsalHall = rooms.some((r) => r.type === 'rehearsal_hall' && !r.isConstructing);
  const hasDressingRoom = rooms.some((r) => r.type === 'dressing_room' && !r.isConstructing);
  const hasOrchPit = rooms.some((r) => r.type === 'orchestra_pit' && !r.isConstructing);
  const hasTechBooth = rooms.some((r) => r.type === 'tech_booth' && !r.isConstructing);
  const facilityScore =
    (hasRehearsalHall ? 25 : 0) +
    (hasDressingRoom ? 25 : 0) +
    (hasOrchPit ? 25 : 0) +
    (hasTechBooth ? 25 : 0);

  // Crew bonuses
  let crewBonus = 0;
  const lightingDesigner = crew.find((c) => c.role === 'lighting_designer' && c.hired);
  const soundDesigner = crew.find((c) => c.role === 'sound_designer' && c.hired);
  const costumeDesigner = crew.find((c) => c.role === 'costume_designer' && c.hired);
  const choreographer = crew.find((c) => c.role === 'choreographer' && c.hired);
  const musicDirector = crew.find((c) => c.role === 'music_director' && c.hired);

  if (lightingDesigner) crewBonus += 5;
  if (soundDesigner) crewBonus += 5;
  if (costumeDesigner) crewBonus += 3;
  if (choreographer) {
    crewBonus += show.genre === 'musical' ? 10 : 3;
  }
  if (musicDirector && show.genre === 'musical') {
    crewBonus += 8;
  }

  const baseQuality =
    scriptQuality * 0.30 +
    avgCastSkill * 0.25 +
    directorSkill * 0.15 +
    rehearsalReadiness * 0.15 +
    productionBudgetRatio * 0.10 +
    facilityScore * 0.05;

  // Add crew bonus on top, clamp to 100
  return Math.min(100, Math.max(0, Math.round(baseQuality + crewBonus)));
}

/**
 * Commission a show: costs $25K, +15 script quality, delivered after 5 day delay.
 */
export function commissionShow(genre: ShowGenre | undefined, currentDay: number): Show {
  const show = generateShow(genre);
  const bonus = GAME_CONSTANTS.COMMISSION.SCRIPT_QUALITY_BONUS;

  return {
    ...show,
    scriptQuality: Math.min(100, show.scriptQuality + bonus),
    commissioned: true,
    commissionDeliveryDay: currentDay + GAME_CONSTANTS.COMMISSION.DELIVERY_DELAY_DAYS,
  };
}
