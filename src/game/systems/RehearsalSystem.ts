// Rehearsal system: daily rehearsal progress, events, and completion logic
import type { Show } from '../../types';

export interface RehearsalEvent {
  id: string;
  day: number;
  type: 'breakthrough' | 'conflict' | 'injury';
  message: string;
  readinessEffect: number;
}

const REHEARSAL_EVENT_CHANCE = 0.10;

const REHEARSAL_EVENTS: { type: RehearsalEvent['type']; message: string; effect: number }[] = [
  { type: 'breakthrough', message: 'The cast had a breakthrough moment! A difficult scene suddenly clicked.', effect: 5 },
  { type: 'breakthrough', message: 'The director found a brilliant new staging idea during run-through.', effect: 5 },
  { type: 'conflict', message: 'Backstage tension between cast members disrupted rehearsal.', effect: -3 },
  { type: 'conflict', message: 'Disagreement over character interpretation slowed progress.', effect: -3 },
  { type: 'injury', message: 'A cast member twisted their ankle during blocking. They need a few days off.', effect: -5 },
  { type: 'injury', message: 'A performer strained their voice during vocal rehearsal.', effect: -4 },
];

/**
 * Advance rehearsal by one day.
 * Returns the updated show and any rehearsal event that occurred.
 */
export function advanceRehearsal(
  show: Show,
  hasRehearsalHall: boolean,
  rehearsalHallUpgraded: boolean,
  currentDay: number,
): { updatedShow: Show; event: RehearsalEvent | null } {
  if (!show.isRehearsing || show.rehearsalProgress >= 100) {
    return { updatedShow: show, event: null };
  }

  // Base readiness gain per day
  const baseGain = show.rehearsalDaysTotal > 0
    ? 100 / show.rehearsalDaysTotal
    : 5;

  // Facility modifier
  let facilityMod = 1.0;
  if (hasRehearsalHall) {
    facilityMod = rehearsalHallUpgraded ? 1.35 : 1.20;
  } else {
    // Rehearsing on stage is slower
    facilityMod = 0.85;
  }

  let dailyGain = baseGain * facilityMod;

  // Random rehearsal event
  let event: RehearsalEvent | null = null;
  if (Math.random() < REHEARSAL_EVENT_CHANCE) {
    const eventTemplate = REHEARSAL_EVENTS[Math.floor(Math.random() * REHEARSAL_EVENTS.length)];
    event = {
      id: crypto.randomUUID(),
      day: currentDay,
      type: eventTemplate.type,
      message: eventTemplate.message,
      readinessEffect: eventTemplate.effect,
    };
    dailyGain += eventTemplate.effect;
  }

  const newProgress = Math.min(100, Math.max(0, show.rehearsalProgress + dailyGain));
  const newDaysCompleted = show.rehearsalDaysCompleted + 1;
  const isComplete = newProgress >= 100;

  const updatedShow: Show = {
    ...show,
    rehearsalProgress: Math.round(newProgress * 100) / 100,
    rehearsalDaysCompleted: newDaysCompleted,
    isRehearsing: !isComplete,
    isRunning: isComplete,
    openingNight: isComplete ? currentDay + 1 : show.openingNight,
  };

  return { updatedShow, event };
}
