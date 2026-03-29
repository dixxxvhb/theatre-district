// Save/Load modal for Broadway Tycoon
// Triggered by Escape key or menu button.

import { useState, useCallback } from 'react';
import { useGameStore } from '../../store/gameStore';
import {
  saveGame,
  loadGame,
  listSaves,
  deleteSave,
  exportSave,
  importSave,
  getManualSlotIds,
  AUTOSAVE_SLOT_ID,
} from '../../store/saveManager';
import type { SaveSlot } from '../../types';
import { pushToast } from '../components/NotificationToast';
import { getFormattedDate } from '../../game/engine/TimeManager';

interface SaveLoadModalProps {
  onClose: () => void;
}

type Tab = 'save' | 'load';

export function SaveLoadModal({ onClose }: SaveLoadModalProps) {
  const [tab, setTab] = useState<Tab>('save');
  const [confirmSlot, setConfirmSlot] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<'save' | 'load' | 'delete' | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState('');
  const [showMainMenuConfirm, setShowMainMenuConfirm] = useState(false);

  const saves = listSaves();
  const savesMap = new Map(saves.map((s) => [s.id, s]));
  const manualSlots = getManualSlotIds();
  const autosaveSlot = savesMap.get(AUTOSAVE_SLOT_ID);

  const handleSave = useCallback((slotId: string) => {
    const existing = savesMap.get(slotId);
    if (existing) {
      setConfirmSlot(slotId);
      setConfirmAction('save');
      return;
    }
    executeSave(slotId);
  }, [savesMap]);

  const executeSave = useCallback((slotId: string) => {
    const state = useGameStore.getState().getSerializableState();
    saveGame(slotId, state);
    pushToast('Game saved!', 'success');
    setConfirmSlot(null);
    setConfirmAction(null);
  }, []);

  const handleLoad = useCallback((slotId: string) => {
    setConfirmSlot(slotId);
    setConfirmAction('load');
  }, []);

  const executeLoad = useCallback((slotId: string) => {
    const state = loadGame(slotId);
    if (state) {
      useGameStore.getState().loadState(state);
      pushToast('Game loaded!', 'success');
      onClose();
    } else {
      pushToast('Failed to load save', 'error');
    }
    setConfirmSlot(null);
    setConfirmAction(null);
  }, [onClose]);

  const handleDelete = useCallback((slotId: string) => {
    setConfirmSlot(slotId);
    setConfirmAction('delete');
  }, []);

  const executeDelete = useCallback((slotId: string) => {
    deleteSave(slotId);
    pushToast('Save deleted', 'info');
    setConfirmSlot(null);
    setConfirmAction(null);
  }, []);

  const handleExport = useCallback((slotId: string) => {
    const data = exportSave(slotId);
    if (data) {
      navigator.clipboard.writeText(data).then(() => {
        pushToast('Save data copied to clipboard!', 'success');
      }).catch(() => {
        // Fallback: show in a prompt
        window.prompt('Copy this save data:', data);
      });
    }
  }, []);

  const handleImport = useCallback(() => {
    const trimmed = importText.trim();
    if (!trimmed) return;

    const state = importSave(trimmed);
    if (state) {
      useGameStore.getState().loadState(state);
      pushToast('Save imported!', 'success');
      setShowImport(false);
      setImportText('');
      onClose();
    } else {
      pushToast('Invalid save data', 'error');
    }
  }, [importText, onClose]);

  const handleReturnToMenu = useCallback(() => {
    // Save first
    const state = useGameStore.getState().getSerializableState();
    saveGame(AUTOSAVE_SLOT_ID, state);
    useGameStore.getState().resetGame();
    pushToast('Returned to main menu', 'info');
    onClose();
  }, [onClose]);

  // Confirmation dialog
  if (confirmSlot && confirmAction) {
    const actionLabel = confirmAction === 'save' ? 'Overwrite' : confirmAction === 'load' ? 'Load' : 'Delete';
    const slotLabel = confirmSlot === AUTOSAVE_SLOT_ID ? 'Autosave' : `Slot ${confirmSlot.replace('slot-', '#')}`;

    return (
      <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/80 backdrop-blur-sm">
        <div className="w-80 bg-gray-950 border border-amber-900/40 rounded-xl p-6 shadow-2xl">
          <h3 className="text-amber-200 text-sm font-bold mb-3">
            {actionLabel} {slotLabel}?
          </h3>
          <p className="text-gray-400 text-xs mb-5">
            {confirmAction === 'save' && 'This will overwrite the existing save in this slot.'}
            {confirmAction === 'load' && 'Unsaved progress will be lost.'}
            {confirmAction === 'delete' && 'This save will be permanently deleted.'}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => { setConfirmSlot(null); setConfirmAction(null); }}
              className="flex-1 py-2 text-sm bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                if (confirmAction === 'save') executeSave(confirmSlot);
                if (confirmAction === 'load') executeLoad(confirmSlot);
                if (confirmAction === 'delete') executeDelete(confirmSlot);
              }}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors cursor-pointer border ${
                confirmAction === 'delete'
                  ? 'bg-red-900/40 border-red-800/50 text-red-200 hover:bg-red-900/60'
                  : 'bg-amber-900/40 border-amber-700/50 text-amber-200 hover:bg-amber-900/60'
              }`}
            >
              {actionLabel}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Main menu confirmation
  if (showMainMenuConfirm) {
    return (
      <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/80 backdrop-blur-sm">
        <div className="w-80 bg-gray-950 border border-amber-900/40 rounded-xl p-6 shadow-2xl">
          <h3 className="text-amber-200 text-sm font-bold mb-3">Return to Main Menu?</h3>
          <p className="text-gray-400 text-xs mb-5">
            Your game will be auto-saved before returning.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setShowMainMenuConfirm(false)}
              className="flex-1 py-2 text-sm bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleReturnToMenu}
              className="flex-1 py-2 text-sm font-semibold bg-red-900/40 border border-red-800/50 text-red-200 hover:bg-red-900/60 rounded-lg transition-colors cursor-pointer"
            >
              Quit to Menu
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Import dialog
  if (showImport) {
    return (
      <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/80 backdrop-blur-sm">
        <div className="w-96 bg-gray-950 border border-amber-900/40 rounded-xl p-6 shadow-2xl">
          <h3 className="text-amber-200 text-sm font-bold mb-3">Import Save</h3>
          <p className="text-gray-500 text-xs mb-3">Paste your save data below:</p>
          <textarea
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            className="w-full h-24 bg-gray-900/80 border border-gray-700/40 text-gray-300 text-xs p-3 rounded-lg resize-none focus:outline-none focus:border-amber-700/50"
            placeholder="Paste base64 save data here..."
          />
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => { setShowImport(false); setImportText(''); }}
              className="flex-1 py-2 text-sm bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleImport}
              disabled={!importText.trim()}
              className="flex-1 py-2 text-sm font-semibold bg-amber-900/40 border border-amber-700/50 text-amber-200 hover:bg-amber-900/60 rounded-lg transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Import
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="w-[440px] bg-gray-950 border border-amber-900/40 rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-gray-800/30 flex items-center justify-between">
          <h2
            className="text-lg text-amber-200 font-bold"
            style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
          >
            Save / Load
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-300 text-lg cursor-pointer transition-colors px-2"
          >
            x
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-800/30">
          {(['save', 'load'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2.5 text-sm font-medium transition-all cursor-pointer ${
                tab === t
                  ? 'text-amber-200 border-b-2 border-amber-600'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {t === 'save' ? 'Save' : 'Load'}
            </button>
          ))}
        </div>

        {/* Slot list */}
        <div className="p-4 space-y-2 max-h-[400px] overflow-y-auto">
          {tab === 'save' ? (
            // Save tab: 5 manual slots
            manualSlots.map((slotId) => {
              const slot = savesMap.get(slotId);
              return (
                <SlotRow
                  key={slotId}
                  slotId={slotId}
                  slot={slot}
                  onAction={() => handleSave(slotId)}
                  onDelete={slot ? () => handleDelete(slotId) : undefined}
                  onExport={slot ? () => handleExport(slotId) : undefined}
                  actionLabel={slot ? 'Overwrite' : 'Save'}
                />
              );
            })
          ) : (
            // Load tab: autosave + manual slots
            <>
              {autosaveSlot && (
                <SlotRow
                  key={AUTOSAVE_SLOT_ID}
                  slotId={AUTOSAVE_SLOT_ID}
                  slot={autosaveSlot}
                  onAction={() => handleLoad(AUTOSAVE_SLOT_ID)}
                  onExport={() => handleExport(AUTOSAVE_SLOT_ID)}
                  actionLabel="Load"
                  isAutosave
                />
              )}
              {manualSlots.map((slotId) => {
                const slot = savesMap.get(slotId);
                if (!slot) return null;
                return (
                  <SlotRow
                    key={slotId}
                    slotId={slotId}
                    slot={slot}
                    onAction={() => handleLoad(slotId)}
                    onDelete={() => handleDelete(slotId)}
                    onExport={() => handleExport(slotId)}
                    actionLabel="Load"
                  />
                );
              })}
              {!autosaveSlot && saves.filter((s) => s.id !== AUTOSAVE_SLOT_ID).length === 0 && (
                <p className="text-center text-gray-600 text-sm py-8">No saves found</p>
              )}
            </>
          )}
        </div>

        {/* Footer actions */}
        <div className="p-4 border-t border-gray-800/30 flex gap-2">
          <button
            onClick={() => setShowImport(true)}
            className="px-3 py-2 text-xs bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-gray-200 rounded-lg transition-colors cursor-pointer"
          >
            Import
          </button>
          <div className="flex-1" />
          <button
            onClick={() => setShowMainMenuConfirm(true)}
            className="px-4 py-2 text-xs bg-red-950/30 border border-red-800/40 text-red-300 hover:bg-red-950/50 rounded-lg transition-colors cursor-pointer"
          >
            Return to Main Menu
          </button>
        </div>
      </div>
    </div>
  );
}

// ---- Slot Row ----

function SlotRow({
  slotId,
  slot,
  onAction,
  onDelete,
  onExport,
  actionLabel,
  isAutosave,
}: {
  slotId: string;
  slot: SaveSlot | undefined;
  onAction: () => void;
  onDelete?: () => void;
  onExport?: () => void;
  actionLabel: string;
  isAutosave?: boolean;
}) {
  const slotLabel = isAutosave
    ? 'Autosave'
    : `Slot ${slotId.replace('slot-', '')}`;

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-900/40 border border-gray-800/30 hover:border-gray-700/40 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-200 font-medium">{slotLabel}</span>
          {isAutosave && (
            <span className="text-[9px] text-amber-500 uppercase tracking-wider bg-amber-900/20 px-1.5 py-0.5 rounded">
              auto
            </span>
          )}
        </div>
        {slot ? (
          <div className="text-[11px] text-gray-500 mt-0.5 space-x-2">
            <span>{slot.theaterName}</span>
            <span>{getFormattedDate(slot.day)}</span>
            <span>${slot.cash.toLocaleString()}</span>
          </div>
        ) : (
          <div className="text-[11px] text-gray-600 mt-0.5 italic">Empty</div>
        )}
        {slot && (
          <div className="text-[10px] text-gray-600 mt-0.5">
            {new Date(slot.timestamp).toLocaleString()}
          </div>
        )}
      </div>

      <div className="flex items-center gap-1 shrink-0">
        {onExport && slot && (
          <button
            onClick={onExport}
            className="px-2 py-1 text-[10px] text-gray-500 hover:text-gray-300 transition-colors cursor-pointer"
            title="Export save"
          >
            Export
          </button>
        )}
        {onDelete && (
          <button
            onClick={onDelete}
            className="px-2 py-1 text-[10px] text-red-500/60 hover:text-red-400 transition-colors cursor-pointer"
            title="Delete save"
          >
            Del
          </button>
        )}
        <button
          onClick={onAction}
          disabled={actionLabel === 'Load' && !slot}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer border ${
            actionLabel === 'Load' && !slot
              ? 'bg-gray-900/40 border-gray-800/40 text-gray-600 cursor-not-allowed'
              : 'bg-amber-900/30 border-amber-800/40 text-amber-300 hover:bg-amber-900/50'
          }`}
        >
          {actionLabel}
        </button>
      </div>
    </div>
  );
}
