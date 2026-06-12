// Fixed-timestep simulation clock.
//
// The PixiJS ticker feeds real elapsed milliseconds into advance(). The clock
// accumulates them, scaled by the current speed multiplier, and fires zero or
// more FIXED ticks per frame. Sim logic only ever sees whole ticks — never a
// frame delta — so the simulation is identical at any framerate and any speed.
// Render code may use alpha() to interpolate between the last two sim states.
//
// The accumulated frame delta is clamped (TIME.MAX_FRAME_DELTA_MS) so a tab
// that was backgrounded and regains focus cannot fire a tick avalanche.

import { TIME } from '../config/balance';

export type Speed = keyof typeof TIME.SPEED_MULTIPLIERS;

const TICK_MS = 1000 / TIME.SIM_TICKS_PER_SECOND;

export interface ClockCallbacks {
  /** One fixed sim tick. Called 0..n times per advance(). */
  onTick: () => void;
}

export class SimClock {
  private accumulatorMs = 0;
  private speed: Speed = 'normal';
  /** Hard gate on top of speed — used by visibilitychange and modals. */
  private suspended = false;

  constructor(private callbacks: ClockCallbacks) {}

  setSpeed(speed: Speed): void {
    this.speed = speed;
  }

  getSpeed(): Speed {
    return this.speed;
  }

  /** Suspend overrides speed entirely (hidden tab, blocking modal). */
  setSuspended(suspended: boolean): void {
    this.suspended = suspended;
    if (suspended) this.accumulatorMs = 0; // drop partial time, no catch-up
  }

  isRunning(): boolean {
    return !this.suspended && TIME.SPEED_MULTIPLIERS[this.speed] > 0;
  }

  /**
   * Feed real elapsed milliseconds; runs the due fixed ticks.
   * Returns the number of ticks fired (useful for tests and meters).
   */
  advance(elapsedMs: number): number {
    if (!this.isRunning()) return 0;

    const clamped = Math.min(elapsedMs, TIME.MAX_FRAME_DELTA_MS);
    this.accumulatorMs += clamped * TIME.SPEED_MULTIPLIERS[this.speed];

    let ticks = 0;
    while (this.accumulatorMs >= TICK_MS) {
      this.accumulatorMs -= TICK_MS;
      this.callbacks.onTick();
      ticks++;
    }
    return ticks;
  }

  /** Interpolation factor 0..1 between the previous and current sim tick. */
  alpha(): number {
    return this.accumulatorMs / TICK_MS;
  }
}
