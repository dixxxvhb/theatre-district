// Showtime — the daily pulse made mechanical. Phase edges drive everything:
//   preshow  → marquees ignite, crowds head for the doors
//   curtain  → queues admitted (capacity-capped), street goes quiet
//   postshow → audiences flood out, the box-office beat lands
//   winddown → amenity takings beat, last call
//
// Session 4 runs SIMPLIFIED shows (auto-assigned title + quality). Session 5
// swaps the show source for the full Production Desk; this rhythm stays.
// Pure math is exported for unit tests.

import { SHOWTIME, THEATRES } from '../config/balance';
import type { PlacedBuilding } from '../../types/td';
import { isTheatre } from '../street/buzz';
import { getBuzzField } from './buzzCache';
import { crowd } from './crowd';
import { useTDStore } from '../../store/store';
import { dayPhase, type DayPhase } from './calendar';
import { upgradeEffects } from '../production/logic';
import { genreAppetite, isGouging, mixPriceTolerance, priceDemand } from './demographics';
import { PRODUCTION } from '../config/balance';
import { pushToast } from '../../ui/components/NotificationToast';
import { sidewalkRowFor } from '../street/topology';

// --- pure math (unit-tested) ---------------------------------------------------

/** Nightly attendance: queued patrons + buzz-driven walk-ins, capacity-capped. */
export function attendanceFor(queued: number, doorBuzz: number, capacity: number, momentum: number): number {
  const walkIns = Math.max(0, doorBuzz) * SHOWTIME.WALKINS_PER_BUZZ * momentum;
  return Math.min(capacity, Math.round(queued + walkIns));
}

/** Word-of-mouth lite: hits snowball, flops decay, everything drifts down. */
export function nextMomentum(momentum: number, quality: number, fillRate: number): number {
  const qualityPull = (quality - 60) / 100; // >60 builds, <60 erodes
  const housePull = (fillRate - 0.5) * 0.5; // a packed house talks
  const next = momentum + SHOWTIME.MOMENTUM_GAIN * (qualityPull + housePull) - SHOWTIME.MOMENTUM_DECAY;
  return Math.min(SHOWTIME.MOMENTUM_MAX, Math.max(SHOWTIME.MOMENTUM_MIN, next));
}

// --- runtime driver ---------------------------------------------------------------

export class ShowtimeDirector {
  private lastPhase: DayPhase | null = null;
  /** Scene hook set by the canvas: fires the marquee-ignition cascade. */
  onIgnite: (() => void) | null = null;
  /** Scene hook: a quick applause flash on box-office payoff. */
  onApplause: (() => void) | null = null;

  /** Called once per sim tick, AFTER the store tick. */
  tick(): void {
    const s = useTDStore.getState();
    if (!s.initialized) return;
    const phase = dayPhase(s.time.tickOfDay);
    if (phase === this.lastPhase) return;
    const prev = this.lastPhase;
    this.lastPhase = phase;
    if (prev === null) return; // first tick after boot/load — no edge

    if (phase === 'preshow') this.onPreshow(s);
    else if (phase === 'curtain') this.onCurtain(s);
    else if (phase === 'postshow') this.onPostshow(s);
    else if (phase === 'winddown') this.onWinddown(s);
  }

  reset(): void {
    this.lastPhase = null;
  }

  private operationalTheatres(s: ReturnType<typeof useTDStore.getState>): PlacedBuilding[] {
    return s.street.buildings.filter((b) => isTheatre(b.kind) && b.constructionDaysLeft === 0 && b.condition >= 0.4);
  }

  /** Theatres with a show actually running tonight. */
  private showingTheatres(s: ReturnType<typeof useTDStore.getState>): PlacedBuilding[] {
    return this.operationalTheatres(s).filter((t) => s.productions[t.id]?.stage === 'running');
  }

  private onPreshow(s: ReturnType<typeof useTDStore.getState>): void {
    if (this.showingTheatres(s).length > 0) this.onIgnite?.();
  }

  private onCurtain(s: ReturnType<typeof useTDStore.getState>): void {
    const { field, cols } = getBuzzField(s.street, s.upkeep);
    for (const t of this.showingTheatres(s)) {
      const p = s.productions[t.id];
      if (!p || !p.show) continue;
      const fx = upgradeEffects(t.upgrades);
      const capacity = Math.round(THEATRES[t.kind as keyof typeof THEATRES].capacity * fx.capacityMult);
      const doorX = t.x + Math.floor(THEATRES[t.kind as keyof typeof THEATRES].width / 2);
      const doorY = sidewalkRowFor(t.side);
      const doorBuzz = field[doorY * cols + doorX] ?? 0;

      // Demographics + ticket elasticity scale the buzz-driven walk-ins.
      const refPrice = PRODUCTION.REF_TICKET[t.kind] ?? 35;
      const tolerance = mixPriceTolerance(s.time.day);
      const appetite = genreAppetite(s.time.day, p.show.genre);
      const elasticity = priceDemand(p.ticketPrice, refPrice, tolerance);
      const effectiveBuzz = (doorBuzz + fx.attendanceBonus) * appetite * elasticity;

      const { admitted } = crowd.admit(t.id, capacity);
      const attendance = attendanceFor(admitted, effectiveBuzz, capacity, p.momentum);
      s.recordNightly(t.id, attendance);
    }
  }

  private onPostshow(s: ReturnType<typeof useTDStore.getState>): void {
    let total = 0;
    const titles: string[] = [];
    for (const t of this.showingTheatres(s)) {
      const p = s.productions[t.id];
      if (!p || !p.show || p.lastAttendance === 0) continue;
      const fx = upgradeEffects(t.upgrades);
      const capacity = Math.round(THEATRES[t.kind as keyof typeof THEATRES].capacity * fx.capacityMult);
      const refPrice = PRODUCTION.REF_TICKET[t.kind] ?? 35;
      const tolerance = mixPriceTolerance(s.time.day);
      // VIP lounge premium rides on top of the set price; the house bar takes
      // its cut of the whole night.
      const perTicket = p.ticketPrice + fx.ticketPremium;
      const revenue = Math.round(p.lastAttendance * perTicket * (1 + fx.takingsCut));
      total += revenue;
      titles.push(`${p.show.title} $${revenue.toLocaleString()}`);

      const fillRate = p.lastAttendance / capacity;
      const goodShow = p.quality >= 62;
      let momentum = nextMomentum(p.momentum, p.quality, fillRate);
      // Restrooms upgrade removes the quiet drag on word of mouth.
      if (fx.wordOfMouthFloor) momentum = Math.max(momentum, 0.85);
      // Green-room upgrade slows momentum decay.
      momentum = p.momentum + (momentum - p.momentum) * fx.momentumDecayMult;
      // Gouging penalty — overprice a hit and word of mouth dies for it.
      if (isGouging(p.ticketPrice, refPrice, tolerance)) momentum -= 0.04;
      momentum = Math.min(1.6, Math.max(0.55, momentum));
      s.updateMomentum(t.id, momentum);

      const doorX = t.x + Math.floor(THEATRES[t.kind as keyof typeof THEATRES].width / 2);
      crowd.release(t.id, doorX, t.side, goodShow);
    }
    if (total > 0) {
      s.addCash(total);
      pushToast(`Box office — ${titles.join(' · ')}`, 'money');
      this.onApplause?.();
    }
  }

  private onWinddown(s: ReturnType<typeof useTDStore.getState>): void {
    const takings = crowd.collectTakings();
    if (takings > 0) {
      s.addCash(takings);
      pushToast(`Late-night takings: $${takings.toLocaleString()}`, 'money');
    }
    crowd.lastCall();
  }
}

export const showtime = new ShowtimeDirector();
