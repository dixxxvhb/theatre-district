import { describe, expect, it } from 'vitest';
import { SEASON_MOD, WEATHER } from '../config/balance';

describe('seasons — economy weights', () => {
  it('summer brings more bodies', () => {
    expect(SEASON_MOD.summer.crowd).toBeGreaterThan(SEASON_MOD.spring.crowd);
  });

  it('winter is the slump (lower crowd, lower ticket take)', () => {
    expect(SEASON_MOD.winter.crowd).toBeLessThan(SEASON_MOD.summer.crowd);
    expect(SEASON_MOD.winter.tickets).toBeLessThan(SEASON_MOD.spring.tickets);
  });
});

describe('weather — crowd multipliers', () => {
  it('clear is the baseline', () => {
    expect(WEATHER.CROWD_MULT.clear).toBe(1);
  });

  it('rain thins the crowd more than heat', () => {
    expect(WEATHER.CROWD_MULT.rain).toBeLessThan(WEATHER.CROWD_MULT.heat);
  });

  it('rain has a chance every season but stays bounded', () => {
    for (const k of ['spring', 'summer', 'fall', 'winter'] as const) {
      const c = WEATHER.CHANCES[k];
      expect(c.rain + c.heat).toBeLessThan(0.5);
    }
  });
});
