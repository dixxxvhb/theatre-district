// TimeSystem — drives game time + daily-phase cycle for Theatre District.
//
// Independent from the legacy GameLoop (which assumes a single activePropertyId
// and runs in the floor-plan canvas ticker). This system runs from the
// Render2Canvas ticker, advancing street.timeOfDay each frame and emitting
// dailyPhase transitions + day rollovers + construction ticks.
//
// One real-time minute ≈ one in-game day at normal speed. Each day cycles
// through 5 phases of equal length (quiet/preshow/curtain/postshow/winddown).

import { useGameStore } from '../../store/gameStore';
import type { DailyPhase } from '../../types';
import { withRecomputedBuzz } from './BuzzSystem';

// One in-game day = N real seconds at normal speed
const SECONDS_PER_DAY = 60;

const SPEED_MULT: Record<string, number> = {
  paused: 0,
  normal: 1,
  fast: 2,
  ultra: 4,
};

const PHASES: DailyPhase[] = ['quiet', 'preshow', 'curtain', 'postshow', 'winddown'];

export function phaseForTimeOfDay(t: number): DailyPhase {
  // Wrap t into [0, 1)
  const f = ((t % 1) + 1) % 1;
  const idx = Math.min(PHASES.length - 1, Math.floor(f * PHASES.length));
  return PHASES[idx];
}

/**
 * Advance time + daily-phase. Triggers day-rollover side effects (construction tick).
 * Called from the engine ticker every frame with dtMS = frame delta.
 */
export function tickTime(dtMS: number): void {
  const root = useGameStore.getState();
  if (root.time.isPaused) return;
  const mult = SPEED_MULT[root.time.speed] ?? 0;
  if (mult === 0) return;

  const elapsedDays = (dtMS / 1000) / SECONDS_PER_DAY * mult;
  if (elapsedDays <= 0) return;

  let newTimeOfDay = root.street.timeOfDay + elapsedDays;
  let dayAdvances = 0;
  while (newTimeOfDay >= 1) {
    newTimeOfDay -= 1;
    dayAdvances += 1;
    if (dayAdvances > 10) break; // safety against runaway dt
  }
  const newPhase = phaseForTimeOfDay(newTimeOfDay);

  // Update timeOfDay + dailyPhase in one set
  useGameStore.setState((state) => ({
    street: {
      ...state.street,
      timeOfDay: newTimeOfDay,
      dailyPhase: newPhase,
    },
  }));

  if (dayAdvances > 0) {
    for (let i = 0; i < dayAdvances; i++) {
      root.advanceDay();
    }
    tickConstruction(dayAdvances);
  }
}

/** Decrement constructionDaysLeft for each in-progress building. Recomputes buzz so
 * newly-finished buildings start emitting on the same tick they complete. */
function tickConstruction(days: number): void {
  useGameStore.setState((state) => {
    const updated = state.street.placedBuildings.map((b) =>
      b.constructionDaysLeft > 0
        ? { ...b, constructionDaysLeft: Math.max(0, b.constructionDaysLeft - days) }
        : b,
    );
    // Did anything finish on this tick? Only recompute buzz if so.
    const finishedNow = updated.some((b, i) =>
      b.constructionDaysLeft === 0 && state.street.placedBuildings[i].constructionDaysLeft > 0,
    );
    const nextStreet = { ...state.street, placedBuildings: updated };
    return { street: finishedNow ? withRecomputedBuzz(nextStreet) : nextStreet };
  });
}
