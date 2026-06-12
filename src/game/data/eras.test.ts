import { describe, expect, it } from 'vitest';
import { ERAS, eraComplete, eraStatus } from './eras';
import { initialTDState } from '../../store/store';
import type { TDState } from '../../types/td';

function mkState(overrides: Partial<TDState> = {}): TDState {
  return { ...initialTDState(), ...overrides };
}

describe('eras — milestone checks', () => {
  it('has five eras, in order', () => {
    expect(ERAS).toHaveLength(5);
    expect(ERAS[0].name).toMatch(/Dark/);
    expect(ERAS[4].name).toMatch(/District/);
  });

  it('fresh game has zero milestones complete', () => {
    const status = eraStatus(mkState(), 0);
    for (const m of status) expect(m.done).toBe(false);
  });

  it('Era 1 requires the playhouse restored, a show, and 2+ amenities/decorations', () => {
    const s: TDState = {
      ...initialTDState(),
      initialized: true,
      street: {
        era: 0,
        buildings: [{ id: 'p', kind: 'theatre_playhouse', x: 8, side: 'north', constructionDaysLeft: 0, condition: 1 }],
        decorations: [
          { id: 'd1', kind: 'street_lamp', x: 6, y: 3 },
          { id: 'd2', kind: 'street_lamp', x: 8, y: 3 },
        ],
      },
      productions: {
        p: { ...({} as any), stage: 'running' },
      },
    } as any;
    expect(eraStatus(s, 0).every((m) => m.done)).toBe(true);
    expect(eraComplete(s, 0)).toBe(true);
  });

  it('Era 4 (The District) never reports complete — it’s terminal', () => {
    expect(eraComplete(mkState({ street: { era: 4, buildings: [], decorations: [] } }), 4)).toBe(false);
  });
});
