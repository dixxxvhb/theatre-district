// Save/Load menu — autosave + 3 manual slots + JSON file export/import.
// Lean Session 1 chrome; gets the full playbill treatment later.

import { useRef, useState } from 'react';
import {
  AUTOSAVE_SLOT,
  deleteSave,
  exportToFile,
  importFromFile,
  listSaves,
  loadGame,
  manualSlotIds,
  saveGame,
  type SaveSlotMeta,
} from '../store/saves';
import { snapshotTDState, useTDStore } from '../store/store';

export function SaveMenu({ onClose }: { onClose: () => void }) {
  const hydrate = useTDStore((s) => s.hydrate);
  const [saves, setSaves] = useState<SaveSlotMeta[]>(() => listSaves());
  const [notice, setNotice] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const refresh = () => setSaves(listSaves());
  const metaFor = (id: string) => saves.find((s) => s.id === id);

  const handleSave = (slotId: string) => {
    saveGame(slotId, snapshotTDState());
    refresh();
    setNotice(`Saved to ${slotId === AUTOSAVE_SLOT ? 'autosave' : slotId.replace('slot-', 'slot ')}.`);
  };

  const handleLoad = (slotId: string) => {
    const state = loadGame(slotId);
    if (!state) {
      setNotice('That save could not be loaded.');
      return;
    }
    hydrate(state);
    onClose();
  };

  const handleImport = async (file: File | undefined) => {
    if (!file) return;
    const state = await importFromFile(file);
    if (!state) {
      setNotice('Not a valid Theatre District save file.');
      return;
    }
    hydrate(state);
    onClose();
  };

  const row = 'flex items-center justify-between gap-2 rounded border border-amber-900/30 bg-gray-900/60 px-3 py-2';
  const btn = 'px-2 py-1 text-xs rounded border border-amber-900/50 text-amber-100 hover:bg-gray-800';

  const slotRow = (id: string, label: string, canSave: boolean) => {
    const meta = metaFor(id);
    return (
      <div key={id} className={row}>
        <div className="min-w-0">
          <div className="text-sm text-amber-100">{label}</div>
          <div className="truncate text-xs text-gray-400">
            {meta
              ? `${meta.districtName} · Day ${meta.day} · $${meta.cash.toLocaleString()}`
              : 'Empty'}
          </div>
        </div>
        <div className="flex shrink-0 gap-1">
          {canSave && (
            <button className={btn} onClick={() => handleSave(id)}>Save</button>
          )}
          {meta && (
            <>
              <button className={btn} onClick={() => handleLoad(id)}>Load</button>
              <button
                className={btn}
                onClick={() => {
                  deleteSave(id);
                  refresh();
                }}
              >
                Delete
              </button>
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={onClose}>
      <div
        className="w-[26rem] rounded-lg border border-amber-900/40 bg-gray-950 p-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg tracking-wide text-amber-200" style={{ fontFamily: 'Georgia, serif' }}>
            Saves
          </h2>
          <button className={btn} onClick={onClose}>Close</button>
        </div>
        <div className="space-y-2">
          {slotRow(AUTOSAVE_SLOT, 'Autosave (day rollover)', false)}
          {manualSlotIds().map((id, i) => slotRow(id, `Slot ${i + 1}`, true))}
        </div>
        <div className="mt-3 flex gap-2 border-t border-gray-800 pt-3">
          <button className={btn} onClick={() => exportToFile(snapshotTDState())}>
            Export to file
          </button>
          <button className={btn} onClick={() => fileRef.current?.click()}>
            Import from file
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => void handleImport(e.target.files?.[0])}
          />
        </div>
        {notice && <div className="mt-2 text-xs text-amber-300">{notice}</div>}
      </div>
    </div>
  );
}
