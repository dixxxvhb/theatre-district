import { describe, expect, it } from 'vitest';
import { SimClock } from './clock';
import { TIME } from '../config/balance';

const TICK_MS = 1000 / TIME.SIM_TICKS_PER_SECOND; // 100ms

function counter() {
  const c = { ticks: 0 };
  const clock = new SimClock({ onTick: () => c.ticks++ });
  return { c, clock };
}

describe('SimClock — fixed timestep', () => {
  it('fires exactly TICKS_PER_SECOND ticks for one second of frames', () => {
    const { c, clock } = counter();
    for (let i = 0; i < 60; i++) clock.advance(1000 / 60);
    expect(c.ticks).toBe(TIME.SIM_TICKS_PER_SECOND);
  });

  it('accumulates partial frames without losing time', () => {
    const { c, clock } = counter();
    clock.advance(TICK_MS / 2); // 50ms — no tick yet
    expect(c.ticks).toBe(0);
    clock.advance(TICK_MS / 2); // completes the tick
    expect(c.ticks).toBe(1);
  });

  it('speed multipliers run more ticks per frame, never scale tick size', () => {
    // One second of 60fps frames — single huge deltas would (correctly) hit
    // the frame clamp, which is its own test below.
    const fast = counter();
    fast.clock.setSpeed('fast');
    for (let i = 0; i < 60; i++) fast.clock.advance(1000 / 60);
    expect(fast.c.ticks).toBe(TIME.SIM_TICKS_PER_SECOND * 2);

    const ultra = counter();
    ultra.clock.setSpeed('ultra');
    for (let i = 0; i < 60; i++) ultra.clock.advance(1000 / 60);
    expect(ultra.c.ticks).toBe(TIME.SIM_TICKS_PER_SECOND * 4);
  });

  it('clamps a huge frame delta (backgrounded tab cannot spiral)', () => {
    const { c, clock } = counter();
    clock.advance(60_000); // a minute away from the tab
    expect(c.ticks).toBe(Math.floor(TIME.MAX_FRAME_DELTA_MS / TICK_MS));
  });

  it('paused fires nothing', () => {
    const { c, clock } = counter();
    clock.setSpeed('paused');
    clock.advance(5000);
    expect(c.ticks).toBe(0);
  });

  it('suspension drops accumulated time — no catch-up burst on resume', () => {
    const { c, clock } = counter();
    clock.advance(TICK_MS * 0.9); // 90ms pending
    clock.setSuspended(true);
    clock.advance(5000); // hidden tab: nothing
    clock.setSuspended(false);
    clock.advance(TICK_MS * 0.5); // 50ms — would tick if the 90ms survived
    expect(c.ticks).toBe(0);
  });

  it('alpha stays in [0, 1)', () => {
    const { clock } = counter();
    clock.advance(TICK_MS * 0.75);
    expect(clock.alpha()).toBeGreaterThanOrEqual(0);
    expect(clock.alpha()).toBeLessThan(1);
  });
});
