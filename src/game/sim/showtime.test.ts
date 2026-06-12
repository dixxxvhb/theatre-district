import { describe, expect, it } from 'vitest';
import { attendanceFor, nextMomentum } from './showtime';
import { SHOWTIME } from '../config/balance';

describe('showtime — attendance', () => {
  it('caps at capacity', () => {
    expect(attendanceFor(500, 50, 120, 1)).toBe(120);
  });

  it('adds buzz-driven walk-ins to the queue', () => {
    const a = attendanceFor(10, 10, 700, 1);
    expect(a).toBe(10 + Math.round(10 * SHOWTIME.WALKINS_PER_BUZZ));
  });

  it('momentum scales walk-ins, not the queue', () => {
    const hot = attendanceFor(0, 10, 700, SHOWTIME.MOMENTUM_MAX);
    const cold = attendanceFor(0, 10, 700, SHOWTIME.MOMENTUM_MIN);
    expect(hot).toBeGreaterThan(cold);
  });

  it('negative door buzz produces no negative walk-ins', () => {
    expect(attendanceFor(5, -8, 120, 1)).toBe(5);
  });
});

describe('showtime — momentum (word-of-mouth lite)', () => {
  it('a quality hit with a full house snowballs', () => {
    const next = nextMomentum(1, 90, 1);
    expect(next).toBeGreaterThan(1);
  });

  it('a flop in an empty house decays', () => {
    const next = nextMomentum(1, 30, 0.1);
    expect(next).toBeLessThan(1);
  });

  it('mediocrity drifts slowly downward (the decay term)', () => {
    const next = nextMomentum(1, 60, 0.5);
    expect(next).toBeLessThan(1);
    expect(next).toBeGreaterThan(0.9);
  });

  it('clamps to the configured band', () => {
    let m = 1;
    for (let i = 0; i < 100; i++) m = nextMomentum(m, 95, 1);
    expect(m).toBe(SHOWTIME.MOMENTUM_MAX);
    for (let i = 0; i < 200; i++) m = nextMomentum(m, 10, 0);
    expect(m).toBe(SHOWTIME.MOMENTUM_MIN);
  });
});
