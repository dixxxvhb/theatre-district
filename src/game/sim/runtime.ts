// Game runtime — owns the fixed-timestep clock and wires it to the store.
// One module-level instance; the PixiJS ticker calls frame() every render
// frame, the clock fires fixed sim ticks, ticks advance the store.
//
// Autosave happens here at day rollover (spec: autosave on day rollover).

import { SimClock } from './clock';
import { snapshotTDState, useTDStore } from '../../store/store';
import { AUTOSAVE_SLOT, saveGame } from '../../store/saves';
import { crowd } from './crowd';
import { showtime } from './showtime';

export class GameRuntime {
  readonly clock: SimClock;

  // Rolling meters for the dev panel.
  private frameTimes: number[] = [];
  private tickTimes: number[] = [];

  constructor() {
    this.clock = new SimClock({
      onTick: () => {
        const dayRolled = useTDStore.getState().advanceTick();
        this.tickTimes.push(performance.now());
        // Order matters: phase edges resolve before the crowd reacts to them.
        showtime.tick();
        crowd.tick();
        if (dayRolled) {
          useTDStore.getState().endOfDay();
          try {
            saveGame(AUTOSAVE_SLOT, snapshotTDState());
          } catch {
            // Autosave must never crash the sim (e.g. storage quota).
          }
        }
      },
    });
  }

  /** Called once per render frame with real elapsed ms. */
  frame(deltaMS: number): void {
    const now = performance.now();
    this.frameTimes.push(now);
    this.prune(this.frameTimes, now);
    this.prune(this.tickTimes, now);

    // The store's speed is the source of truth; the clock mirrors it.
    this.clock.setSpeed(useTDStore.getState().time.speed);
    this.clock.advance(deltaMS);
  }

  fps(): number {
    return this.frameTimes.length;
  }

  ticksPerSecond(): number {
    return this.tickTimes.length;
  }

  private prune(arr: number[], now: number): void {
    while (arr.length > 0 && now - arr[0] > 1000) arr.shift();
  }
}

export const runtime = new GameRuntime();

/** Reset ephemeral sims after newGame / load — agents are never saved, they
 *  respawn from game state (architecture rule #4). */
export function resetSims(): void {
  crowd.reset();
  showtime.reset();
}

// Dev-server-only sim handle (QA scripts; see store.ts for the store handle).
if (import.meta.env.DEV && typeof window !== 'undefined') {
  (window as unknown as { __tdSim?: object }).__tdSim = { crowd, runtime };
}
