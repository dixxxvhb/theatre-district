import { describe, expect, it } from 'vitest';
import { audienceMix, genreAppetite, isGouging, mixPriceTolerance, priceDemand } from './demographics';

describe('demographics — audience mix', () => {
  it('mixes sum to ≈1', () => {
    for (const day of [1, 6, 30, 90, 113]) {
      const mix = audienceMix(day);
      const total = Object.values(mix).reduce((a, b) => a + b, 0);
      expect(total).toBeCloseTo(1, 2);
    }
  });

  it('weekends bring more tourists than weekdays', () => {
    expect(audienceMix(6).tourists).toBeGreaterThan(audienceMix(1).tourists); // Sat vs Mon
  });

  it('summer pushes the tourist share further', () => {
    expect(audienceMix(35).tourists).toBeGreaterThan(audienceMix(1).tourists); // day 35 = summer
  });
});

describe('demographics — appetite and elasticity', () => {
  it('musicals beat experimentals with a weekend tourist crowd', () => {
    expect(genreAppetite(6, 'musical')).toBeGreaterThan(genreAppetite(6, 'experimental'));
  });

  it('price tolerance is roughly 0.8–1.4 across the year', () => {
    for (const d of [1, 6, 30, 90]) {
      const t = mixPriceTolerance(d);
      expect(t).toBeGreaterThan(0.8);
      expect(t).toBeLessThan(1.4);
    }
  });

  it('demand decays as price climbs above the reference', () => {
    const ref = 35;
    expect(priceDemand(35, ref, 1)).toBeCloseTo(1, 1);
    expect(priceDemand(70, ref, 1)).toBeLessThan(0.5);
    expect(priceDemand(20, ref, 1)).toBeGreaterThan(1.1);
  });

  it('gouging trips above 1.4× the tolerance-adjusted reference', () => {
    expect(isGouging(45, 35, 1)).toBe(false); // ~1.29×
    expect(isGouging(60, 35, 1)).toBe(true); // ~1.71×
  });
});
