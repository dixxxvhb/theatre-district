// Save/Load system for Broadway Tycoon
// Uses localStorage with JSON serialization.

import type { GameState, SaveSlot } from '../types';

const SAVE_KEY_PREFIX = 'broadway-tycoon-save-';
const AUTOSAVE_SLOT = 'autosave';
const MAX_MANUAL_SLOTS = 5;
const SAVE_INDEX_KEY = 'broadway-tycoon-save-index';

/**
 * Save game state to a slot.
 */
export function saveGame(slotId: string, state: GameState): void {
  const key = SAVE_KEY_PREFIX + slotId;
  const data = JSON.stringify(state);
  localStorage.setItem(key, data);

  // Update save index
  updateSaveIndex(slotId, state);
}

/**
 * Load game state from a slot.
 */
export function loadGame(slotId: string): GameState | null {
  const key = SAVE_KEY_PREFIX + slotId;
  const raw = localStorage.getItem(key);
  if (!raw) return null;

  try {
    const state = JSON.parse(raw) as GameState;
    // Basic validation
    if (!state.initialized && slotId !== AUTOSAVE_SLOT) return null;
    if (typeof state.theaterName !== 'string') return null;
    if (typeof state.time?.day !== 'number') return null;
    return state;
  } catch {
    return null;
  }
}

/**
 * List all save slots with metadata.
 */
export function listSaves(): SaveSlot[] {
  const raw = localStorage.getItem(SAVE_INDEX_KEY);
  if (!raw) return [];

  try {
    const index = JSON.parse(raw) as SaveSlot[];
    // Validate each slot still exists
    return index.filter((slot) => {
      const key = SAVE_KEY_PREFIX + slot.id;
      return localStorage.getItem(key) !== null;
    });
  } catch {
    return [];
  }
}

/**
 * Delete a save slot.
 */
export function deleteSave(slotId: string): void {
  const key = SAVE_KEY_PREFIX + slotId;
  localStorage.removeItem(key);

  // Remove from index
  const saves = listSaves().filter((s) => s.id !== slotId);
  localStorage.setItem(SAVE_INDEX_KEY, JSON.stringify(saves));
}

/**
 * Export a save as base64 string for sharing.
 */
export function exportSave(slotId: string): string {
  const key = SAVE_KEY_PREFIX + slotId;
  const raw = localStorage.getItem(key);
  if (!raw) return '';
  return btoa(raw);
}

/**
 * Import a save from base64 string.
 * Returns the decoded GameState or null on failure.
 */
export function importSave(data: string): GameState | null {
  try {
    const json = atob(data);
    const state = JSON.parse(json) as GameState;
    // Basic validation
    if (typeof state.theaterName !== 'string') return null;
    if (typeof state.time?.day !== 'number') return null;
    return state;
  } catch {
    return null;
  }
}

/**
 * Get the most recent save (for Continue button).
 */
export function getMostRecentSave(): GameState | null {
  const saves = listSaves();
  if (saves.length === 0) return null;

  // Sort by timestamp descending
  saves.sort((a, b) => b.timestamp - a.timestamp);

  // Try autosave first, then most recent manual save
  const autosave = saves.find((s) => s.id === AUTOSAVE_SLOT);
  const mostRecent = saves[0];

  // Use whichever is more recent
  const target = autosave && (!mostRecent || autosave.timestamp >= mostRecent.timestamp)
    ? autosave
    : mostRecent;

  if (!target) return null;
  return loadGame(target.id);
}

/**
 * Check if there are any saves available.
 */
export function hasSaves(): boolean {
  const saves = listSaves();
  return saves.length > 0;
}

/**
 * Get manual slot IDs (slot-1 through slot-5).
 */
export function getManualSlotIds(): string[] {
  return Array.from({ length: MAX_MANUAL_SLOTS }, (_, i) => `slot-${i + 1}`);
}

// ---- Internal ----

function updateSaveIndex(slotId: string, state: GameState): void {
  const saves = listSaves().filter((s) => s.id !== slotId);

  const slot: SaveSlot = {
    id: slotId,
    name: slotId === AUTOSAVE_SLOT ? 'Autosave' : `Save ${slotId.replace('slot-', '#')}`,
    timestamp: Date.now(),
    day: state.time?.day ?? 1,
    cash: state.economy?.cash ?? 0,
    reputation: state.reputation?.score ?? 0,
    theaterName: state.theaterName ?? 'Unknown',
  };

  saves.push(slot);
  localStorage.setItem(SAVE_INDEX_KEY, JSON.stringify(saves));
}

// Autosave constants
export const AUTOSAVE_INTERVAL_MS = 60_000; // 60 seconds
export const AUTOSAVE_SLOT_ID = AUTOSAVE_SLOT;
