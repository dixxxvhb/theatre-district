// Core game loop for Broadway Tycoon.
// Runs on PixiJS's ticker and advances game time based on speed settings.

import type { Ticker } from 'pixi.js';
import { GAME_CONSTANTS } from '../data/constants';
import { useGameStore } from '../../store/gameStore';
import { advanceRehearsal } from '../systems/RehearsalSystem';
import { processMarketingDay } from '../systems/MarketingSystem';
import { calculatePerformance, getSeatingCapacity } from '../systems/PerformanceSystem';
import { calculateShowQuality } from '../systems/ShowSystem';
import { rollForEvent, isAutoResolve } from '../systems/EventSystem';
import { pushToast } from '../../ui/components/NotificationToast';
import type { MarketingCampaignState } from '../../types';
import { tickRivals, checkRivalActivation } from '../systems/RivalSystem';
import { pickRandomTrend, rollTrendDuration } from '../data/trends';


/**
 * Ticks required per game day at each speed setting.
 */
const TICKS_PER_DAY: Record<string, number> = {
  paused: 0,
  normal: GAME_CONSTANTS.TIME.TICKS_PER_DAY_NORMAL,
  fast: GAME_CONSTANTS.TIME.TICKS_PER_DAY_FAST,
  ultra: GAME_CONSTANTS.TIME.TICKS_PER_DAY_ULTRA,
};

export class GameLoop {
  private tickAccumulator = 0;

  update(ticker: Ticker): void {
    const state = useGameStore.getState();

    if (state.time.isPaused || !state.initialized) {
      return;
    }

    const ticksNeeded = TICKS_PER_DAY[state.time.speed];
    if (ticksNeeded === 0) return;

    this.tickAccumulator += ticker.deltaTime;

    while (this.tickAccumulator >= ticksNeeded) {
      this.tickAccumulator -= ticksNeeded;
      this.processDayTick();
    }
  }

  private processDayTick(): void {
    const store = useGameStore.getState();

    // 1. Advance the day counter
    store.advanceDay();

    // 2. Process construction (all phases)
    this.processConstruction();

    // 3. Process based on current phase
    const phase = store.ui.currentPhase;

    if (phase === 'rehearsal') {
      this.processRehearsal();
    }

    if (phase === 'running') {
      this.processRunningDay();
    }

    // Marketing processes during both rehearsal and running
    if (phase === 'rehearsal' || phase === 'running') {
      this.processMarketing();
    }

    // 4. Rival simulation (all phases after building)
    if (phase !== 'building' && phase !== 'menu' && phase !== 'property_select') {
      tickRivals();
    }

    // 5. Loss condition checks (during running phase)
    if (phase === 'running') {
      const lossReason = store.checkLossConditions();
      if (lossReason) {
        store.setGameOver(lossReason);
        store.setSpeed('paused');
        return;
      }
    }
  }

  private processConstruction(): void {
    const state = useGameStore.getState();
    const activeProperty = state.properties.find(
      (p) => p.id === state.activePropertyId,
    );

    if (!activeProperty) return;

    const hasConstructing = activeProperty.rooms.some((r) => r.isConstructing);
    if (!hasConstructing) return;

    const updatedRooms = activeProperty.rooms.map((room) => {
      if (!room.isConstructing) return room;

      const daysLeft = room.constructionDaysLeft - 1;
      if (daysLeft <= 0) {
        // Fire toast when construction finishes
        pushToast(`Room built!`, 'success');
        return { ...room, isConstructing: false, constructionDaysLeft: 0 };
      }
      return { ...room, constructionDaysLeft: daysLeft };
    });

    useGameStore.setState({
      properties: state.properties.map((p) =>
        p.id === activeProperty.id ? { ...p, rooms: updatedRooms } : p,
      ),
    });
  }

  private processRehearsal(): void {
    const state = useGameStore.getState();
    const activeShow = state.shows.find((s) => s.id === state.activeShowId);
    if (!activeShow || !activeShow.isRehearsing) return;

    const activeProperty = state.properties.find((p) => p.id === state.activePropertyId);
    if (!activeProperty) return;

    const rooms = activeProperty.rooms;
    const hasRehearsalHall = rooms.some((r) => r.type === 'rehearsal_hall' && !r.isConstructing);
    const rehearsalHallUpgraded = rooms.some(
      (r) => r.type === 'rehearsal_hall' && !r.isConstructing && r.level >= 2,
    );

    const { updatedShow, event } = advanceRehearsal(
      activeShow,
      hasRehearsalHall,
      rehearsalHallUpgraded,
      state.time.day,
    );

    // Update the show
    state.updateShow(activeShow.id, updatedShow);

    // Log progress
    state.addRehearsalLog({
      id: crypto.randomUUID(),
      day: state.time.day,
      message: `Rehearsal day ${updatedShow.rehearsalDaysCompleted}: Readiness at ${Math.round(updatedShow.rehearsalProgress)}%`,
      type: 'progress',
    });

    // Log event if one occurred
    if (event) {
      state.addRehearsalLog({
        id: event.id,
        day: event.day,
        message: event.message,
        type: event.type,
      });
    }

    // If rehearsal is complete, transition to running
    if (updatedShow.rehearsalProgress >= 100) {
      // Calculate final show quality
      const quality = calculateShowQuality(
        updatedShow,
        state.castMembers,
        state.crew,
        activeProperty.rooms,
      );

      // Set opening night buzz
      const openingBuzz = Math.min(
        100,
        updatedShow.buzzScore + GAME_CONSTANTS.PERFORMANCE.OPENING_NIGHT_BUZZ_BONUS,
      );

      state.updateShow(activeShow.id, {
        quality,
        buzzScore: openingBuzz,
        isRehearsing: false,
        isRunning: true,
        openingNight: state.time.day + 1,
      });

      useGameStore.setState({
        runDay: 0,
        lowAttendanceStreak: 0,
        performanceHistory: [],
      });

      // Show opening night modal instead of auto-transitioning
      state.setShowOpeningNightModal(true);
      state.setSpeed('paused');
    }
  }

  private processRunningDay(): void {
    const state = useGameStore.getState();
    const activeShow = state.shows.find((s) => s.id === state.activeShowId);
    if (!activeShow || !activeShow.isRunning) return;

    const activeProperty = state.properties.find((p) => p.id === state.activePropertyId);
    if (!activeProperty) return;

    // Increment run day
    const newRunDay = state.runDay + 1;
    state.setRunDay(newRunDay);

    // Calculate and process performance
    const result = calculatePerformance({
      show: activeShow,
      cast: state.castMembers,
      crew: state.crew,
      property: activeProperty,
      ticketPrice: state.ticketPrice,
      currentDay: state.time.day,
      runDay: newRunDay,
    });

    if (result) {
      state.processPerformance(result);
      pushToast(`$${result.revenue.toLocaleString()} earned tonight`, 'money');

      // Track low attendance streak
      const capacity = getSeatingCapacity(activeProperty.rooms);
      const attendanceRatio = capacity > 0 ? result.attendance / capacity : 0;
      if (attendanceRatio < GAME_CONSTANTS.PERFORMANCE.CLOSING_ATTENDANCE_MIN) {
        state.setLowAttendanceStreak(state.lowAttendanceStreak + 1);
      } else {
        state.setLowAttendanceStreak(0);
      }
    }

    // Check for random events
    const event = rollForEvent(state.time.day);
    if (event) {
      if (isAutoResolve(event)) {
        // Auto-resolve: apply effects immediately
        state.addEvent({ ...event, resolved: true });
        if (event.choices.length > 0) {
          state.applyEventEffects(event.choices[0].effects);
        }
        pushToast(event.title, 'warning');
      } else {
        // Choice event: pause and show modal
        state.addEvent(event);
        state.setSpeed('paused');
      }
    }

    // Check auto-close conditions
    const refetchedState = useGameStore.getState();
    const lowStreak = refetchedState.lowAttendanceStreak;
    const streakThreshold = GAME_CONSTANTS.PERFORMANCE.CLOSING_THRESHOLD_WEEKS * 6; // ~6 perf days per week

    if (lowStreak >= streakThreshold) {
      this.triggerCloseShow('Low attendance forced closure');
      return;
    }

    // Bankruptcy check
    if (refetchedState.economy.cash <= 0) {
      this.triggerCloseShow('Bankruptcy');
      return;
    }
  }

  private processMarketing(): void {
    const state = useGameStore.getState();
    const activeShow = state.shows.find((s) => s.id === state.activeShowId);
    if (!activeShow) return;

    const campaigns = state.activeMarketingCampaigns.map((c) => ({
      ...c,
    }));

    const { buzz, campaigns: updatedCampaigns } = processMarketingDay(
      activeShow.buzzScore,
      campaigns,
    );

    // Update buzz on the show
    state.updateShow(activeShow.id, { buzzScore: buzz });

    // Update campaigns
    const mapped: MarketingCampaignState[] = updatedCampaigns.map((c) => ({
      id: c.id,
      type: c.type,
      label: c.label,
      cost: c.cost,
      buzzGain: c.buzzGain,
      duration: c.duration,
      daysRemaining: c.daysRemaining,
      startDay: c.startDay,
    }));
    state.setMarketingCampaigns(mapped);
  }

  private triggerCloseShow(_reason: string): void {
    const state = useGameStore.getState();
    const activeShow = state.shows.find((s) => s.id === state.activeShowId);
    if (!activeShow) return;

    const showPerfs = state.performanceHistory;
    const totalRevenue = showPerfs.reduce((s, p) => s + p.revenue, 0);
    const totalExpenses = showPerfs.reduce((s, p) => s + p.expenses, 0);
    const avgAttPct = showPerfs.length > 0
      ? (showPerfs.reduce((s, p) => s + (p.capacity > 0 ? p.attendance / p.capacity : 0), 0) / showPerfs.length) * 100
      : 0;

    const sorted = [...showPerfs].sort((a, b) => a.profit - b.profit);
    const bestNight = sorted.length > 0 ? sorted[sorted.length - 1] : null;
    const worstNight = sorted.length > 0 ? sorted[0] : null;

    const repChange = avgAttPct > 60
      ? Math.round(GAME_CONSTANTS.REPUTATION.HIT_SHOW_REP_GAIN * (avgAttPct / 100))
      : -GAME_CONSTANTS.REPUTATION.FLOP_REP_LOSS;

    // Apply reputation change
    useGameStore.setState((s) => ({
      reputation: {
        ...s.reputation,
        score: Math.max(0, Math.min(100, s.reputation.score + repChange)),
      },
    }));

    // Campaign: increment show count and check act transition
    state.incrementShowCount();

    const updatedCampaign = useGameStore.getState().campaign;
    const actThresholds = GAME_CONSTANTS.CAMPAIGN.ACT_THRESHOLDS;

    // Check act transition
    if (updatedCampaign.act < 5 && updatedCampaign.showCount >= actThresholds[updatedCampaign.act]) {
      state.advanceAct();
      checkRivalActivation();
      pushToast(`Act ${updatedCampaign.act + 1}: The stakes rise...`, 'info');
    }

    // Track condemned shows (rep < 10)
    const currentRep = useGameStore.getState().reputation.score;
    if (currentRep < GAME_CONSTANTS.CAMPAIGN.CONDEMNED_REP_THRESHOLD) {
      useGameStore.setState((s) => ({
        campaign: { ...s.campaign, condemnedShowCount: s.campaign.condemnedShowCount + 1 },
      }));
    } else {
      useGameStore.setState((s) => ({
        campaign: { ...s.campaign, condemnedShowCount: 0 },
      }));
    }

    // Tony nomination check
    if (
      avgAttPct > GAME_CONSTANTS.CAMPAIGN.TONY_QUALITY_THRESHOLD &&
      showPerfs.length > GAME_CONSTANTS.CAMPAIGN.TONY_PERFORMANCE_THRESHOLD &&
      updatedCampaign.act >= GAME_CONSTANTS.CAMPAIGN.TONY_MIN_ACT
    ) {
      state.nominateForTony(activeShow.id);
      pushToast(`"${activeShow.title}" earns a Tony nomination!`, 'info');
    }

    // Trend advancement
    if (updatedCampaign.currentTrend) {
      const remaining = updatedCampaign.currentTrend.showsRemaining - 1;
      if (remaining <= 0) {
        if (updatedCampaign.nextTrend) {
          state.setTrend(updatedCampaign.nextTrend);
          state.setNextTrend(null);
          pushToast(`${updatedCampaign.nextTrend.trend.name} takes hold`, 'info');
        } else {
          state.setTrend(null);
        }
      } else {
        state.setTrend({ ...updatedCampaign.currentTrend, showsRemaining: remaining });
      }
    }

    // Queue next trend preview
    if (!updatedCampaign.nextTrend && updatedCampaign.showCount > 1 && Math.random() > 0.3) {
      const excludeId = updatedCampaign.currentTrend?.trend.id;
      const nextTrend = pickRandomTrend(excludeId);
      const duration = rollTrendDuration(nextTrend);
      state.setNextTrend({ trend: nextTrend, showsRemaining: duration });
      pushToast(`Word on the street: ${nextTrend.description}`, 'info');
    }

    pushToast(`Show closed: ${_reason}`, 'warning');

    state.closeShow(activeShow.id, {
      showTitle: activeShow.title,
      totalPerformances: showPerfs.length,
      totalRevenue,
      totalExpenses,
      profit: totalRevenue - totalExpenses,
      averageAttendancePercent: Math.round(avgAttPct),
      bestNight,
      worstNight,
      reputationChange: repChange,
      runDays: state.runDay,
    });
  }

  reset(): void {
    this.tickAccumulator = 0;
  }
}
