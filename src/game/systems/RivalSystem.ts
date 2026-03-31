import { useGameStore } from '../../store/gameStore';
import { RIVAL_CONFIGS, generateRivalShowTitle } from '../data/rivals';
import { pushToast } from '../../ui/components/NotificationToast';
import type { RivalShow } from '../../types';

function getConfig(personality: string) {
  return RIVAL_CONFIGS.find((c) => c.personality === personality)!;
}

/** Simulate one day for all active rivals */
export function tickRivals(): void {
  const state = useGameStore.getState();
  const { rivals, time } = state;

  for (const rival of rivals) {
    if (!rival.active) continue;

    const config = getConfig(rival.personality);

    // 1. Generate buzz daily
    if (rival.currentShow) {
      state.updateRival(rival.id, {
        buzz: Math.min(100, rival.buzz + config.marketingRate * 0.1),
      });
    }

    // 2. Check if rival needs a new show
    if (!rival.currentShow) {
      const lastShow = rival.showHistory[rival.showHistory.length - 1];
      const daysSinceClose = lastShow?.closingDay
        ? time.day - lastShow.closingDay
        : 999;

      const [minInterval, maxInterval] = config.showInterval;
      const interval = minInterval + Math.floor(Math.random() * (maxInterval - minInterval));

      if (daysSinceClose >= interval || rival.showHistory.length === 0) {
        const genre = config.preferredGenres[
          Math.floor(Math.random() * config.preferredGenres.length)
        ];
        const [minBudget, maxBudget] = config.budgetRange;
        const budget = minBudget + Math.floor(Math.random() * (maxBudget - minBudget));
        const quality = Math.min(
          config.criticCap,
          rival.reputation * 0.6 + Math.random() * 30 + budget / 10000,
        );

        const newShow: RivalShow = {
          title: generateRivalShowTitle(),
          genre,
          quality: Math.round(quality),
          openDay: time.day,
          closingDay: null,
          attendance: Math.round(50 + Math.random() * 30),
        };

        state.updateRival(rival.id, {
          currentShow: newShow,
          buzz: 20 + config.marketingRate * 3,
          cash: rival.cash - budget,
        });

        pushToast(`${rival.name} announces "${newShow.title}"`, 'info');
      }
    }

    // 3. Update running show
    if (rival.currentShow && rival.currentShow.closingDay === null) {
      const runDays = time.day - rival.currentShow.openDay;
      const showQuality = rival.currentShow.quality;
      const maxRunDays = Math.round(showQuality * 0.8 + 20);

      if (runDays >= maxRunDays) {
        const closedShow: RivalShow = {
          ...rival.currentShow,
          closingDay: time.day,
        };

        state.updateRival(rival.id, {
          currentShow: null,
          showHistory: [...rival.showHistory, closedShow],
          buzz: Math.max(0, rival.buzz - 20),
          reputation: Math.min(90, rival.reputation + (showQuality > 60 ? 3 : -2)),
        });

        pushToast(`${rival.name}'s "${closedShow.title}" closes after ${runDays} performances`, 'info');
      } else {
        const attendance = Math.round(
          Math.min(100, showQuality * 0.5 + rival.buzz * 0.3 + Math.random() * 15),
        );
        state.updateRival(rival.id, {
          currentShow: { ...rival.currentShow, attendance },
        });
      }
    }
  }
}

export function calculateBuzzShare(): number {
  const state = useGameStore.getState();
  const activeShow = state.shows.find((s) => s.id === state.activeShowId);
  if (!activeShow) return 1;

  const playerBuzz = Math.max(1, activeShow.buzzScore);
  const rivalBuzzTotal = state.rivals
    .filter((r) => r.active && r.currentShow)
    .reduce((sum, r) => sum + r.buzz, 0);

  if (rivalBuzzTotal === 0) return 1;
  return playerBuzz / (playerBuzz + rivalBuzzTotal * 0.3);
}

export function checkRivalActivation(): void {
  const state = useGameStore.getState();
  const { rivals, campaign } = state;

  for (const rival of rivals) {
    if (!rival.active && rival.appearsAtAct <= campaign.act) {
      state.activateRival(rival.id);
      pushToast(`A new competitor has arrived: ${rival.name}`, 'info');
    }
  }
}

export function attemptPoach(firedCrewName: string, firedRole: string): void {
  const state = useGameStore.getState();
  const activeRivals = state.rivals.filter((r) => r.active);
  if (activeRivals.length === 0) return;

  if (Math.random() < 0.3) {
    const rival = activeRivals[Math.floor(Math.random() * activeRivals.length)];
    pushToast(`${rival.name} just hired ${firedCrewName} as their ${firedRole}`, 'info');
  }
}
