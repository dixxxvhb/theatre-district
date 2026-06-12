import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AUTOSAVE_SLOT,
  decodeEnvelope,
  deleteSave,
  listSaves,
  loadGame,
  manualSlotIds,
  mostRecentSave,
  SAVE_GAME_TAG,
  SAVE_VERSION,
  saveGame,
  type KVStorage,
} from './saves';
import { initialTDState } from './store';
import type { TDState } from '../types/td';

function fakeStorage(): KVStorage {
  const map = new Map<string, string>();
  return {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, v),
    removeItem: (k) => void map.delete(k),
  };
}

function fixtureState(): TDState {
  const s = initialTDState();
  return {
    ...s,
    initialized: true,
    districtName: 'Tamara Row',
    time: { ...s.time, day: 5, tickOfDay: 321 },
    economy: { cash: 38_500 },
    street: {
      era: 1,
      buildings: [
        {
          id: 'b1',
          kind: 'theatre_playhouse',
          x: 4,
          side: 'north',
          constructionDaysLeft: 0,
          condition: 1,
        },
      ],
      decorations: [{ id: 'd1', kind: 'street_lamp', x: 3, y: 3 }],
    },
    upkeep: { litter: { '5,3': 2 }, sweeperHired: true },
  };
}

let storage: KVStorage;
beforeEach(() => {
  storage = fakeStorage();
});

describe('saves — round trip', () => {
  it('save → load returns a deep-equal state', () => {
    const state = fixtureState();
    saveGame('slot-1', state, storage);
    expect(loadGame('slot-1', storage)).toEqual(state);
  });

  it('index lists slot metadata', () => {
    saveGame('slot-2', fixtureState(), storage);
    const saves = listSaves(storage);
    expect(saves).toHaveLength(1);
    expect(saves[0]).toMatchObject({ id: 'slot-2', day: 5, cash: 38_500, districtName: 'Tamara Row' });
  });

  it('delete removes both save and index entry', () => {
    saveGame('slot-1', fixtureState(), storage);
    deleteSave('slot-1', storage);
    expect(loadGame('slot-1', storage)).toBeNull();
    expect(listSaves(storage)).toHaveLength(0);
  });

  it('mostRecentSave picks the newest timestamp', () => {
    const now = vi.spyOn(Date, 'now');
    now.mockReturnValue(1000);
    saveGame('slot-1', { ...fixtureState(), districtName: 'Older' }, storage);
    now.mockReturnValue(2000);
    saveGame(AUTOSAVE_SLOT, { ...fixtureState(), districtName: 'Newer' }, storage);
    expect(mostRecentSave(storage)?.districtName).toBe('Newer');
    now.mockRestore();
  });

  it('exposes exactly 3 manual slots', () => {
    expect(manualSlotIds()).toEqual(['slot-1', 'slot-2', 'slot-3']);
  });
});

describe('saves — version gate', () => {
  it('rejects Broadway Tycoon saves (no game tag)', () => {
    // Shape of the old BT envelope: { version, state } — no `game` field.
    expect(decodeEnvelope({ version: 2, state: { theaterName: 'The Majestic' } })).toBeNull();
  });

  it('rejects raw legacy state objects', () => {
    expect(decodeEnvelope({ theaterName: 'The Majestic', time: { day: 3 } })).toBeNull();
  });

  it('rejects saves from a newer schema than this build understands', () => {
    expect(
      decodeEnvelope({ game: SAVE_GAME_TAG, version: SAVE_VERSION + 1, savedAt: 0, state: fixtureState() }),
    ).toBeNull();
  });

  it('rejects structurally broken states', () => {
    expect(
      decodeEnvelope({ game: SAVE_GAME_TAG, version: SAVE_VERSION, savedAt: 0, state: { nonsense: true } }),
    ).toBeNull();
  });

  it('accepts a valid current envelope', () => {
    const state = fixtureState();
    expect(
      decodeEnvelope({ game: SAVE_GAME_TAG, version: SAVE_VERSION, savedAt: 0, state }),
    ).toEqual(state);
  });
});
