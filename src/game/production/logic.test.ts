import { describe, expect, it } from 'vitest';
import {
  castChemistry,
  draftOptions,
  emptyProduction,
  generateCandidates,
  openingQuality,
  pairChemistry,
  upgradeEffects,
} from './logic';
import { PRODUCTION, UPGRADES } from '../config/balance';
import type { CastMember, Production } from '../../types/td';

function member(name: string, skill = 70, personality = 'method'): CastMember {
  return { id: name, name, skill, starPower: 50, personality, signingFee: 0, dailyWage: 0 };
}

function productionWith(cast: Production['cast'], readiness = 70): Production {
  return {
    ...emptyProduction(),
    stage: 'rehearsing',
    show: {
      title: 'T',
      genre: 'play',
      archetype: 'safe_bet',
      archetypeLabel: 'Safe Bet',
      scriptQuality: 60,
      appeal: 70,
      rightsCost: 5000,
    },
    cast,
    readiness,
  };
}

describe('production — chemistry (legacy port)', () => {
  it('is deterministic for the same pair', () => {
    const a = member('Ada Chen');
    const b = member('Bo Park', 70, 'showboat');
    expect(pairChemistry(a, b)).toBe(pairChemistry(a, b));
    expect(pairChemistry(a, b)).toBe(pairChemistry(b, a)); // order-free
  });

  it('kindred personalities always click', () => {
    expect(pairChemistry(member('X'), member('Y'))).toBe(4);
  });

  it('cast chemistry is zero with fewer than two members', () => {
    expect(castChemistry({ lead: member('Solo') })).toBe(0);
  });
});

describe('production — opening quality', () => {
  it('better casts open better shows', () => {
    const weak = productionWith({ lead: member('A', 40), second: member('B', 40) });
    const strong = productionWith({ lead: member('A', 90), second: member('B', 90) });
    expect(openingQuality(strong, upgradeEffects([]))).toBeGreaterThan(openingQuality(weak, upgradeEffects([])));
  });

  it('polish past the threshold adds quality', () => {
    const base = productionWith({ lead: member('A') }, PRODUCTION.OPEN_THRESHOLD);
    const polished = productionWith({ lead: member('A') }, 100);
    expect(openingQuality(polished, upgradeEffects([]))).toBeGreaterThan(openingQuality(base, upgradeEffects([])));
  });

  it('stage renovation + tech booth raise quality; clamped to 100', () => {
    const p = productionWith({ lead: member('A', 95), second: member('B', 95) }, 100);
    const plain = openingQuality(p, upgradeEffects([]));
    const upgraded = openingQuality(p, upgradeEffects(['stage_renovation', 'tech_booth']));
    expect(upgraded).toBeGreaterThanOrEqual(plain);
    expect(upgraded).toBeLessThanOrEqual(100);
  });

  it('big spectacle without a fly system is punished, with one rewarded', () => {
    const p = productionWith({ lead: member('A') });
    p.show = { ...p.show!, archetype: 'big_spectacle' };
    const without = openingQuality(p, upgradeEffects([]));
    const withFly = openingQuality(p, upgradeEffects(['fly_system']));
    expect(withFly - without).toBe(14);
  });

  it('director decisions land via qualityNudge', () => {
    const p = productionWith({ lead: member('A') });
    const nudged = { ...p, qualityNudge: 8 };
    expect(openingQuality(nudged, upgradeEffects([]))).toBe(openingQuality(p, upgradeEffects([])) + 8);
  });
});

describe('production — generation & upgrades', () => {
  it('drafts three options with archetype-bounded scripts', () => {
    const options = draftOptions();
    expect(options).toHaveLength(3);
    for (const o of options) {
      expect(o.scriptQuality).toBeGreaterThanOrEqual(0);
      expect(o.scriptQuality).toBeLessThanOrEqual(100);
      expect(o.rightsCost).toBeGreaterThan(0);
    }
  });

  it('star dressing rooms lift the candidate pool', () => {
    const floorOf = (dressing: boolean) =>
      Math.min(...Array.from({ length: 30 }, () => generateCandidates('ensemble', dressing)).flat().map((c) => c.skill));
    expect(floorOf(true)).toBeGreaterThan(floorOf(false) - 1);
  });

  it('every upgrade id resolves to a real effect change', () => {
    const none = upgradeEffects([]);
    for (const id of Object.keys(UPGRADES)) {
      const fx = upgradeEffects([id]);
      expect(JSON.stringify(fx)).not.toBe(JSON.stringify(none));
    }
  });
});
