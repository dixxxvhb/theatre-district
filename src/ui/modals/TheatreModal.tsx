// TheatreModal — opens when player clicks a placed theatre on the street.
//
// Session 6 scope: bridge surface. Shows the theatre's vital stats (capacity,
// ambiance, facility), current popularity, last performance result, and a
// "Run a Performance" button that simulates a show + updates buzz.
//
// Future: full cast / rehearsal / Tony reuse from the legacy show-production
// flow lives behind tabs in this same modal.

import { useMemo } from 'react';
import { useGameStore } from '../../store/gameStore';
import { computeTheatreStats } from '../../game/systems/TheatreStats';
import { BUILDING_DEFINITIONS } from '../../game/data/street';

export function TheatreModal({ onClose }: { onClose: () => void }) {
  const selectedId = useGameStore((s) => s.ui.streetSelectedId);
  const street = useGameStore((s) => s.street);
  const cash = useGameStore((s) => s.economy.cash);
  const runTheatrePerformance = useGameStore((s) => s.runTheatrePerformance);

  const building = useMemo(
    () => street.placedBuildings.find((b) => b.id === selectedId && b.kind === 'theatre'),
    [street.placedBuildings, selectedId],
  );

  if (!building) {
    // Theatre was removed or selection changed — close.
    return null;
  }

  const def = BUILDING_DEFINITIONS[building.kind];
  const stats = computeTheatreStats(building, street);
  const popularity = building.popularity ?? 1.0;
  const last = building.lastPerformance;
  const isBuilt = building.constructionDaysLeft === 0;

  const popTone =
    popularity >= 1.3 ? 'text-amber-300' :
    popularity >= 0.85 ? 'text-stone-200' :
    'text-rose-300';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={onClose}>
      <div
        className="w-[640px] max-w-[92vw] bg-stone-950 border border-stone-800 rounded-lg shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-800">
          <div>
            <h2 className="text-amber-300 font-serif text-2xl">Production Studio</h2>
            <div className="text-xs text-stone-400 mt-1">{def.label} at ({building.position.x}, {building.position.y})</div>
          </div>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-100 text-sm">Close</button>
        </div>

        {!isBuilt ? (
          <div className="p-6 text-center">
            <div className="text-amber-300 text-lg mb-2">Under Construction</div>
            <div className="text-stone-400 text-sm">{building.constructionDaysLeft} day{building.constructionDaysLeft === 1 ? '' : 's'} remaining</div>
          </div>
        ) : (
          <>
            {/* Theatre stats grid */}
            <div className="grid grid-cols-2 gap-4 p-5 border-b border-stone-800">
              <StatBlock label="Capacity" value={stats.capacity.toLocaleString()} hint={`${stats.vipCapacity} VIP`} />
              <StatBlock label="Ticket Price" value={`$${stats.ticketPrice}`} hint="varies w/ posters" />
              <StatBlock label="Ambiance" value={`${stats.ambianceScore.toFixed(2)}×`} hint="boosted by decor" />
              <StatBlock label="Facility" value={`${stats.facilityScore.toFixed(2)}×`} hint={`${stats.hasConcessionNearby ? 'amenities nearby' : 'no amenities'}`} />
              <StatBlock label="Popularity" value={`${popularity.toFixed(2)}×`} hint="recent hit/flop" tone={popTone} />
              <StatBlock label="Daily Overhead" value={`$${stats.dailyOverhead}`} hint="staff + utilities" />
            </div>

            {/* Last performance */}
            {last ? (
              <div className="p-5 border-b border-stone-800 bg-stone-900/40">
                <div className="text-xs uppercase tracking-wider text-stone-500 mb-2">Last Performance — Day {last.day}</div>
                <div className="text-amber-200 italic font-serif mb-2">"{last.showName}"</div>
                <div className="grid grid-cols-4 gap-3 text-sm">
                  <SmallStat label="Attendance" value={`${last.attendance}/${last.capacity}`} />
                  <SmallStat label="Fill" value={`${Math.round(last.fillFactor * 100)}%`} />
                  <SmallStat label="Quality" value={`${last.quality}/100`} />
                  <SmallStat
                    label="Revenue"
                    value={`$${last.revenue.toLocaleString()}`}
                    tone={last.revenue > 0 ? 'text-emerald-300' : 'text-rose-300'}
                  />
                </div>
                <div className="mt-3 text-xs text-stone-500">
                  Popularity {last.popularityDelta >= 0 ? '+' : ''}{last.popularityDelta.toFixed(2)}
                </div>
              </div>
            ) : (
              <div className="p-5 border-b border-stone-800 text-stone-400 text-sm italic">
                No performances yet. Run your first show to start building popularity.
              </div>
            )}

            {/* Action: Run Performance */}
            <div className="p-5">
              <button
                onClick={() => runTheatrePerformance(building.id)}
                className="w-full px-4 py-3 bg-amber-700/40 hover:bg-amber-700/60 border border-amber-600/60 text-amber-100 rounded transition-colors font-medium"
              >
                Run a Performance
              </button>
              <div className="mt-2 text-xs text-stone-500 text-center">
                Hits raise popularity → bigger street buzz → more visitors. Flops do the opposite.
              </div>
              <div className="mt-1 text-xs text-stone-500 text-center">Treasury: ${cash.toLocaleString()}</div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

interface StatProps { label: string; value: string; hint?: string; tone?: string }

function StatBlock({ label, value, hint, tone }: StatProps) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-stone-500">{label}</div>
      <div className={`text-lg font-mono mt-0.5 ${tone ?? 'text-stone-100'}`}>{value}</div>
      {hint && <div className="text-xs text-stone-500 mt-0.5">{hint}</div>}
    </div>
  );
}

function SmallStat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-stone-500">{label}</div>
      <div className={`text-sm font-mono mt-0.5 ${tone ?? 'text-stone-100'}`}>{value}</div>
    </div>
  );
}
