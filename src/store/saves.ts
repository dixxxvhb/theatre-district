// Theatre District save system — TD schema v1.
//
// Preserves the Broadway Tycoon versioned-envelope machinery (the part worth
// keeping) under a NEW key prefix. Old `broadway-tycoon-save-*` entries are a
// different namespace and are never read or migrated (Dixon-approved — sole
// player, old saves abandoned).
//
// Slots: 'autosave' (written at day rollover) + 'slot-1'..'slot-3' manual.
// Export/import: one-click JSON file (the no-backend insurance policy).
//
// Storage is injectable so sim tests can run in plain Node without jsdom.

import { SAVES } from '../game/config/balance';
import type { TDState } from '../types/td';

export const SAVE_GAME_TAG = 'theatre-district';
export const SAVE_VERSION = 1;
const KEY_PREFIX = 'theatre-district-save-';
const INDEX_KEY = 'theatre-district-save-index';
export const AUTOSAVE_SLOT = 'autosave';

export interface SaveEnvelope {
  game: typeof SAVE_GAME_TAG;
  version: number;
  savedAt: number;
  state: TDState;
}

export interface SaveSlotMeta {
  id: string;
  timestamp: number;
  day: number;
  cash: number;
  districtName: string;
}

/** Minimal storage contract (subset of DOM Storage). */
export interface KVStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function defaultStorage(): KVStorage {
  return globalThis.localStorage;
}

export function manualSlotIds(): string[] {
  return Array.from({ length: SAVES.MANUAL_SLOTS }, (_, i) => `slot-${i + 1}`);
}

export function saveGame(slotId: string, state: TDState, storage: KVStorage = defaultStorage()): void {
  const envelope: SaveEnvelope = {
    game: SAVE_GAME_TAG,
    version: SAVE_VERSION,
    savedAt: Date.now(),
    state,
  };
  storage.setItem(KEY_PREFIX + slotId, JSON.stringify(envelope));
  updateIndex(slotId, envelope, storage);
}

export function loadGame(slotId: string, storage: KVStorage = defaultStorage()): TDState | null {
  const raw = storage.getItem(KEY_PREFIX + slotId);
  if (!raw) return null;
  try {
    return decodeEnvelope(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function deleteSave(slotId: string, storage: KVStorage = defaultStorage()): void {
  storage.removeItem(KEY_PREFIX + slotId);
  const index = listSaves(storage).filter((s) => s.id !== slotId);
  storage.setItem(INDEX_KEY, JSON.stringify(index));
}

export function listSaves(storage: KVStorage = defaultStorage()): SaveSlotMeta[] {
  const raw = storage.getItem(INDEX_KEY);
  if (!raw) return [];
  try {
    const index = JSON.parse(raw) as SaveSlotMeta[];
    return index.filter((meta) => storage.getItem(KEY_PREFIX + meta.id) !== null);
  } catch {
    return [];
  }
}

export function mostRecentSave(storage: KVStorage = defaultStorage()): TDState | null {
  const saves = [...listSaves(storage)].sort((a, b) => b.timestamp - a.timestamp);
  if (saves.length === 0) return null;
  return loadGame(saves[0].id, storage);
}

// --- Envelope decoding / validation / migration -------------------------------

/**
 * Decode any parsed JSON into a TDState, or null if it isn't a valid
 * Theatre District save. This is the version gate: Broadway Tycoon saves
 * (no `game` tag) and saves from a NEWER schema are rejected, older TD
 * schemas are migrated forward.
 */
export function decodeEnvelope(parsed: unknown): TDState | null {
  if (!parsed || typeof parsed !== 'object') return null;
  const env = parsed as Partial<SaveEnvelope>;
  if (env.game !== SAVE_GAME_TAG) return null; // rejects BT and foreign JSON
  if (typeof env.version !== 'number' || env.version > SAVE_VERSION) return null;
  if (!env.state || typeof env.state !== 'object') return null;

  const state = migrate(env.state as TDState, env.version);
  return isValid(state) ? state : null;
}

/** Forward-migrate older TD schemas. v1 is current — chain grows from here.
 *  Pre-release saves may predate fields added during the build; fill defaults. */
function migrate(state: TDState, _fromVersion: number): TDState {
  return {
    ...state,
    upkeep: state.upkeep ?? { litter: {}, sweeperHired: false },
    productions: state.productions ?? {},
  };
}

function isValid(state: TDState): boolean {
  return (
    typeof state.districtName === 'string' &&
    typeof state.time?.day === 'number' &&
    state.time.day >= 1 &&
    typeof state.economy?.cash === 'number' &&
    typeof state.street?.era === 'number' &&
    Array.isArray(state.street?.buildings) &&
    Array.isArray(state.street?.decorations)
  );
}

function updateIndex(slotId: string, envelope: SaveEnvelope, storage: KVStorage): void {
  const index = listSaves(storage).filter((s) => s.id !== slotId);
  index.push({
    id: slotId,
    timestamp: envelope.savedAt,
    day: envelope.state.time.day,
    cash: envelope.state.economy.cash,
    districtName: envelope.state.districtName,
  });
  storage.setItem(INDEX_KEY, JSON.stringify(index));
}

// --- File export / import (browser only) --------------------------------------

export function exportToFile(state: TDState): void {
  const envelope: SaveEnvelope = {
    game: SAVE_GAME_TAG,
    version: SAVE_VERSION,
    savedAt: Date.now(),
    state,
  };
  const blob = new Blob([JSON.stringify(envelope, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `theatre-district-day${state.time.day}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function importFromFile(file: File): Promise<TDState | null> {
  try {
    return decodeEnvelope(JSON.parse(await file.text()));
  } catch {
    return null;
  }
}
