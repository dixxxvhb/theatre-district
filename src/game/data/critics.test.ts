import { describe, expect, it } from 'vitest';
import { reviewShow, verdictMomentum } from './critics';
import { emptyProduction, upgradeEffects } from '../production/logic';
import type { Production } from '../../types/td';

function makeProduction(overrides: Partial<Production> = {}): Production {
  const base = emptyProduction();
  return {
    ...base,
    quality: 75,
    show: {
      title: 'T',
      genre: 'play',
      archetype: 'safe_bet',
      archetypeLabel: 'Safe Bet',
      scriptQuality: 65,
      appeal: 70,
      rightsCost: 5000,
    },
    ...overrides,
  };
}

describe('critics — three verdicts', () => {
  it('returns exactly three reviews with stars in 1–5', () => {
    const reviews = reviewShow(makeProduction(), upgradeEffects([]));
    expect(reviews).toHaveLength(3);
    for (const r of reviews) {
      expect(r.stars).toBeGreaterThanOrEqual(1);
      expect(r.stars).toBeLessThanOrEqual(5);
      expect(typeof r.line).toBe('string');
    }
  });

  it('rave verdicts produce raised momentum, pan verdicts crush it', () => {
    const rave = verdictMomentum([
      { critic: 'A', stars: 5, line: '' },
      { critic: 'B', stars: 5, line: '' },
      { critic: 'C', stars: 5, line: '' },
    ]);
    const pan = verdictMomentum([
      { critic: 'A', stars: 1, line: '' },
      { critic: 'B', stars: 1, line: '' },
      { critic: 'C', stars: 1, line: '' },
    ]);
    expect(rave).toBeGreaterThan(pan);
    expect(rave).toBeGreaterThan(1);
    expect(pan).toBeLessThan(1);
  });
});
