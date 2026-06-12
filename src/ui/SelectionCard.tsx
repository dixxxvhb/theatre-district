// Selection card — info + actions for the clicked building/decoration.
// Demolish confirms here for buildings (decoration demolishes instantly per
// spec). The restore action is the player's first move on the inherited
// derelict playhouse.

import { useState } from 'react';
import { DECORATIONS, DEMOLISH_REFUND, ECONOMY } from '../game/config/balance';
import { catalogEntry } from '../game/street/placement';
import { isTheatre } from '../game/street/buzz';
import { useTDStore } from '../store/store';

const fmt = (n: number) => `$${n.toLocaleString()}`;

export function SelectionCard() {
  const selectedId = useTDStore((s) => s.ui.selectedId);
  const building = useTDStore((s) => s.street.buildings.find((b) => b.id === s.ui.selectedId));
  const decoration = useTDStore((s) => s.street.decorations.find((d) => d.id === s.ui.selectedId));
  const cash = useTDStore((s) => s.economy.cash);
  const select = useTDStore((s) => s.select);
  const demolish = useTDStore((s) => s.demolish);
  const restore = useTDStore((s) => s.restoreBuilding);
  const [confirming, setConfirming] = useState(false);

  if (!selectedId || (!building && !decoration)) return null;

  const btn = 'rounded border px-2 py-1 text-xs';

  if (decoration) {
    return (
      <div className="absolute bottom-3 left-1/2 z-20 w-72 -translate-x-1/2 rounded-lg border border-amber-900/40 bg-gray-950/95 p-3 shadow-2xl">
        <div className="flex items-center justify-between">
          <span className="text-sm text-amber-200" style={{ fontFamily: 'Georgia, serif' }}>
            {DECORATIONS[decoration.kind].label}
          </span>
          <button className={`${btn} border-gray-700 text-gray-400 hover:bg-gray-800`} onClick={() => select(null)}>
            Close
          </button>
        </div>
        <div className="mt-2 flex gap-2">
          <button
            className={`${btn} border-red-900 text-red-300 hover:bg-red-950`}
            onClick={() => {
              demolish(decoration.id);
              select(null);
            }}
          >
            Remove
          </button>
        </div>
      </div>
    );
  }

  const b = building!;
  const entry = catalogEntry(b.kind);
  const blighted = b.condition < 0.4;
  const underConstruction = b.constructionDaysLeft > 0;
  const refund = Math.round(entry.cost * DEMOLISH_REFUND);

  return (
    <div className="absolute bottom-3 left-1/2 z-20 w-80 -translate-x-1/2 rounded-lg border border-amber-900/40 bg-gray-950/95 p-3 shadow-2xl">
      <div className="flex items-center justify-between">
        <span className="text-sm text-amber-200" style={{ fontFamily: 'Georgia, serif' }}>
          {entry.label}
          {isTheatre(b.kind) && blighted && ' · derelict'}
        </span>
        <button className={`${btn} border-gray-700 text-gray-400 hover:bg-gray-800`} onClick={() => select(null)}>
          Close
        </button>
      </div>

      {underConstruction ? (
        <div className="mt-2 text-xs text-gray-400">
          Under construction — {b.constructionDaysLeft} day{b.constructionDaysLeft === 1 ? '' : 's'} left
        </div>
      ) : (
        <div className="mt-2">
          <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-gray-500">
            <span>Condition</span>
            <span>{Math.round(b.condition * 100)}%</span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded bg-gray-800">
            <div
              className={`h-full ${blighted ? 'bg-red-800' : b.condition < 0.7 ? 'bg-amber-700' : 'bg-emerald-800'}`}
              style={{ width: `${Math.round(b.condition * 100)}%` }}
            />
          </div>
          {blighted && (
            <div className="mt-1 text-xs text-red-300/80">Radiating negative buzz — the street feels it.</div>
          )}
        </div>
      )}

      <div className="mt-3 flex items-center gap-2">
        {blighted && !underConstruction && (
          <button
            disabled={cash < ECONOMY.DERELICT_RESTORE_COST}
            className={`${btn} ${
              cash >= ECONOMY.DERELICT_RESTORE_COST
                ? 'border-amber-700 bg-amber-950/60 text-amber-100 hover:bg-amber-900/60'
                : 'cursor-not-allowed border-gray-800 text-gray-600'
            }`}
            onClick={() => restore(b.id)}
          >
            Restore ({fmt(ECONOMY.DERELICT_RESTORE_COST)})
          </button>
        )}
        {confirming ? (
          <>
            <span className="text-xs text-gray-400">Demolish? Refund {fmt(refund)}.</span>
            <button
              className={`${btn} border-red-700 bg-red-950/70 text-red-200`}
              onClick={() => {
                demolish(b.id);
                select(null);
                setConfirming(false);
              }}
            >
              Yes
            </button>
            <button className={`${btn} border-gray-700 text-gray-400`} onClick={() => setConfirming(false)}>
              No
            </button>
          </>
        ) : (
          <button className={`${btn} border-red-900 text-red-300 hover:bg-red-950`} onClick={() => setConfirming(true)}>
            Demolish
          </button>
        )}
      </div>
    </div>
  );
}
