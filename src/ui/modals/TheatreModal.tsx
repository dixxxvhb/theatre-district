// TheatreModal — Production Studio for a placed street theatre.
//
// Tabbed flow that reuses the legacy show-production data + actions:
//   Show: commission a show (generateShow x3 → pick one)
//   Cast: per-role audition (generateCastCandidate x3 → cast a role)
//   Rehearse: advance rehearsal day by day (RehearsalSystem.advanceRehearsal)
//   Run: roll a performance (TheatrePerformance.runPerformance), close show
//
// The active show is tracked globally via activeShowId (one show in production
// at a time across the street). When you close the show, popularity on the
// hosting theatre is finalized from average attendance + critic score.

import { useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { computeTheatreStats } from '../../game/systems/TheatreStats';
import { BUILDING_DEFINITIONS } from '../../game/data/street';
import type { CastMember, Show } from '../../types';

type Tab = 'show' | 'cast' | 'rehearse' | 'run';

export function TheatreModal({ onClose }: { onClose: () => void }) {
  const selectedId = useGameStore((s) => s.ui.streetSelectedId);
  const street = useGameStore((s) => s.street);
  const cash = useGameStore((s) => s.economy.cash);
  const activeShowId = useGameStore((s) => s.activeShowId);
  const shows = useGameStore((s) => s.shows);
  const showOptions = useGameStore((s) => s.showOptions);

  const building = street.placedBuildings.find((b) => b.id === selectedId && b.kind === 'theatre');
  if (!building) return null;
  const def = BUILDING_DEFINITIONS[building.kind];
  const stats = computeTheatreStats(building, street);
  const isBuilt = building.constructionDaysLeft === 0;
  const show = activeShowId ? shows.find((s) => s.id === activeShowId) ?? null : null;

  // Default tab is the one matching current production phase
  const initialTab: Tab =
    !show ? 'show'
    : show.roles.some((r) => r.castMemberId === null) ? 'cast'
    : !show.isRehearsing && !show.isRunning && show.rehearsalProgress < 100 ? 'rehearse'
    : show.isRunning ? 'run'
    : show.isRehearsing ? 'rehearse'
    : 'run';

  const [tab, setTab] = useState<Tab>(initialTab);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={onClose}>
      <div
        className="w-[760px] max-w-[94vw] max-h-[90vh] flex flex-col bg-stone-950 border border-stone-800 rounded-lg shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <Header def={def.label} pos={building.position} popularity={building.popularity ?? 1.0} onClose={onClose} />

        {!isBuilt ? (
          <div className="p-6 text-center">
            <div className="text-amber-300 text-lg mb-2">Under Construction</div>
            <div className="text-stone-400 text-sm">{building.constructionDaysLeft} day{building.constructionDaysLeft === 1 ? '' : 's'} remaining</div>
          </div>
        ) : (
          <>
            <Tabs tab={tab} setTab={setTab} show={show} />
            <div className="flex-1 overflow-y-auto">
              {tab === 'show' && <ShowTab show={show} options={showOptions} />}
              {tab === 'cast' && show && <CastTab show={show} />}
              {tab === 'rehearse' && show && <RehearseTab show={show} />}
              {tab === 'run' && show && (
                <RunTab show={show} theatreId={building.id} stats={stats} lastPerformanceSummary={building.lastPerformance ?? null} />
              )}
            </div>
            <Footer cash={cash} stats={stats} />
          </>
        )}
      </div>
    </div>
  );
}

// ============================================================
// Header / Tabs / Footer
// ============================================================

function Header({ def, pos, popularity, onClose }: { def: string; pos: { x: number; y: number }; popularity: number; onClose: () => void }) {
  const tone =
    popularity >= 1.3 ? 'text-amber-300' :
    popularity >= 0.85 ? 'text-stone-200' :
    'text-rose-300';
  return (
    <div className="flex items-center justify-between px-5 py-4 border-b border-stone-800">
      <div>
        <h2 className="text-amber-300 font-serif text-2xl">Production Studio</h2>
        <div className="text-xs text-stone-400 mt-1">
          {def} at ({pos.x}, {pos.y}) · Popularity <span className={tone}>{popularity.toFixed(2)}×</span>
        </div>
      </div>
      <button onClick={onClose} className="text-stone-400 hover:text-stone-100 text-sm">Close</button>
    </div>
  );
}

function Tabs({ tab, setTab, show }: { tab: Tab; setTab: (t: Tab) => void; show: Show | null }) {
  const tabs: Array<{ id: Tab; label: string; disabled?: boolean }> = [
    { id: 'show', label: 'Show' },
    { id: 'cast', label: 'Cast', disabled: !show },
    { id: 'rehearse', label: 'Rehearse', disabled: !show || show.roles.some((r) => r.castMemberId === null) },
    { id: 'run', label: 'Run', disabled: !show || show.rehearsalProgress < 100 },
  ];
  return (
    <div className="flex border-b border-stone-800 bg-stone-900/40">
      {tabs.map((t) => {
        const active = tab === t.id;
        return (
          <button
            key={t.id}
            onClick={() => !t.disabled && setTab(t.id)}
            disabled={t.disabled}
            className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors ${
              active
                ? 'bg-stone-950 text-amber-200 border-b-2 border-amber-500'
                : t.disabled
                  ? 'text-stone-600 cursor-not-allowed'
                  : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/40'
            }`}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

function Footer({ cash, stats }: { cash: number; stats: ReturnType<typeof computeTheatreStats> }) {
  return (
    <div className="px-5 py-3 border-t border-stone-800 bg-stone-900/40 flex items-center justify-between text-xs">
      <div className="text-stone-400">
        Capacity <span className="font-mono text-stone-200">{stats.capacity}</span> · Ambiance{' '}
        <span className="font-mono text-stone-200">{stats.ambianceScore.toFixed(2)}×</span> · Facility{' '}
        <span className="font-mono text-stone-200">{stats.facilityScore.toFixed(2)}×</span>
      </div>
      <div className="text-emerald-300 font-mono">${cash.toLocaleString()}</div>
    </div>
  );
}

// ============================================================
// Show Tab — commission a new show or display current
// ============================================================

function ShowTab({ show, options }: { show: Show | null; options: Show[] }) {
  const commissionShowOptions = useGameStore((s) => s.commissionShowOptions);
  const commitShow = useGameStore((s) => s.commitShow);

  if (show) {
    return (
      <div className="p-5 space-y-3">
        <div className="text-xs uppercase tracking-wider text-stone-500">Current Production</div>
        <div className="text-amber-200 italic font-serif text-xl">"{show.title}"</div>
        <div className="grid grid-cols-3 gap-3 text-sm">
          <KV label="Genre" value={show.genre} />
          <KV label="Archetype" value={show.archetype} />
          <KV label="Script Quality" value={`${show.scriptQuality}/100`} />
          <KV label="Audience Appeal" value={`${show.audienceAppeal}/100`} />
          <KV label="Complexity" value={`${show.complexity}/5`} />
          <KV label="Cast Size" value={`${show.idealCastSize}`} />
        </div>
        <div className="pt-3 border-t border-stone-800">
          <div className="text-xs uppercase tracking-wider text-stone-500 mb-1">Status</div>
          <div className="text-sm text-stone-300">
            {show.isRunning ? `Running (opened day ${show.openingNight})` :
             show.rehearsalProgress >= 100 ? 'Ready to open' :
             show.isRehearsing ? `Rehearsing — ${Math.round(show.rehearsalProgress)}% ready` :
             show.roles.some((r) => r.castMemberId === null) ? 'Casting' :
             'Cast complete, ready to rehearse'}
          </div>
        </div>
      </div>
    );
  }

  if (options.length === 0) {
    return (
      <div className="p-5 space-y-3">
        <div className="text-stone-300 text-sm">No show in production. Commission three new scripts to choose from.</div>
        <button
          onClick={() => commissionShowOptions()}
          className="px-4 py-2 bg-amber-700/40 hover:bg-amber-700/60 border border-amber-600/60 text-amber-100 rounded text-sm font-medium transition-colors"
        >
          Generate Show Options
        </button>
      </div>
    );
  }

  return (
    <div className="p-5 space-y-3">
      <div className="text-xs uppercase tracking-wider text-stone-500">Pick One</div>
      <div className="space-y-2">
        {options.map((opt) => (
          <button
            key={opt.id}
            onClick={() => commitShow(opt.id)}
            className="w-full text-left p-3 bg-stone-900/60 hover:bg-stone-800/80 border border-stone-800 hover:border-amber-700/50 rounded transition-colors"
          >
            <div className="text-amber-200 italic font-serif text-lg">"{opt.title}"</div>
            <div className="text-xs text-stone-400 mt-1">{opt.genre} · {opt.archetype} · {opt.idealCastSize} cast</div>
            <div className="grid grid-cols-3 gap-2 mt-2 text-xs">
              <span className="text-stone-300">Script <span className="text-stone-100 font-mono">{opt.scriptQuality}</span></span>
              <span className="text-stone-300">Appeal <span className="text-stone-100 font-mono">{opt.audienceAppeal}</span></span>
              <span className="text-stone-300">Difficulty <span className="text-stone-100 font-mono">{opt.complexity}/5</span></span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// Cast Tab — per-role audition
// ============================================================

function CastTab({ show }: { show: Show }) {
  const auditionForRole = useGameStore((s) => s.auditionForRole);
  const castRole = useGameStore((s) => s.castRole);
  const castMembers = useGameStore((s) => s.castMembers);
  const [openRoleId, setOpenRoleId] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<CastMember[]>([]);

  const audition = (roleId: string) => {
    const cands = auditionForRole(show.id, roleId);
    setCandidates(cands);
    setOpenRoleId(roleId);
  };

  return (
    <div className="p-5 space-y-3">
      <div className="text-xs uppercase tracking-wider text-stone-500">Roles ({show.roles.filter((r) => r.castMemberId !== null).length}/{show.roles.length} cast)</div>
      <div className="space-y-2">
        {show.roles.map((role) => {
          const member = role.castMemberId ? castMembers.find((m) => m.id === role.castMemberId) : null;
          return (
            <div key={role.id} className="p-3 bg-stone-900/60 border border-stone-800 rounded">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-stone-100 font-medium">{role.name}</div>
                  <div className="text-xs text-stone-500">{role.type}</div>
                </div>
                {member ? (
                  <div className="text-right">
                    <div className="text-amber-200 font-medium">{member.name}</div>
                    <div className="text-xs text-stone-500">talent {member.talent} · star {member.starPower} · ${member.salary}/wk</div>
                  </div>
                ) : (
                  <button
                    onClick={() => audition(role.id)}
                    className="px-3 py-1.5 bg-amber-700/40 hover:bg-amber-700/60 border border-amber-600/60 text-amber-100 rounded text-xs font-medium transition-colors"
                  >
                    Audition
                  </button>
                )}
              </div>
              {openRoleId === role.id && !member && (
                <CandidateList
                  candidates={candidates}
                  onPick={(c) => { castRole(show.id, role.id, c); setOpenRoleId(null); setCandidates([]); }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CandidateList({ candidates, onPick }: { candidates: CastMember[]; onPick: (c: CastMember) => void }) {
  return (
    <div className="mt-3 pt-3 border-t border-stone-800 space-y-1.5">
      {candidates.map((c) => (
        <button
          key={c.id}
          onClick={() => onPick(c)}
          className="w-full text-left px-3 py-2 bg-stone-950/60 hover:bg-amber-950/30 border border-stone-800 hover:border-amber-700/50 rounded text-sm transition-colors"
        >
          <div className="flex items-center justify-between">
            <span className="text-stone-100">{c.name}</span>
            <span className="text-xs text-emerald-300 font-mono">${c.salary}/wk</span>
          </div>
          <div className="text-xs text-stone-400 mt-0.5">
            talent {c.talent} · star {c.starPower} · {c.personality}
          </div>
        </button>
      ))}
    </div>
  );
}

// ============================================================
// Rehearse Tab — advance day by day
// ============================================================

function RehearseTab({ show }: { show: Show }) {
  const startRehearsals = useGameStore((s) => s.startRehearsals);
  const advanceTheatreRehearsal = useGameStore((s) => s.advanceTheatreRehearsal);
  const rehearsalLog = useGameStore((s) => s.rehearsalLog);
  const [lastEvent, setLastEvent] = useState<string | null>(null);

  const recentLog = rehearsalLog.slice(-4).reverse();
  const allCast = show.roles.every((r) => r.castMemberId !== null);
  const ready = show.rehearsalProgress >= 100;
  const canAdvance = show.isRehearsing;

  const advance = () => {
    const { eventMessage } = advanceTheatreRehearsal(show.id);
    if (eventMessage) setLastEvent(eventMessage);
  };

  return (
    <div className="p-5 space-y-4">
      <div>
        <div className="flex items-baseline justify-between mb-1">
          <div className="text-xs uppercase tracking-wider text-stone-500">Readiness</div>
          <div className="text-sm font-mono text-stone-200">{Math.round(show.rehearsalProgress)}%</div>
        </div>
        <div className="h-2.5 bg-stone-900 rounded overflow-hidden">
          <div className="h-full bg-amber-500" style={{ width: `${show.rehearsalProgress}%` }} />
        </div>
        <div className="mt-1 text-xs text-stone-500">
          Day {show.rehearsalDaysCompleted} of ~{show.rehearsalDaysTotal} planned
        </div>
      </div>

      {!show.isRehearsing && !ready && (
        <button
          onClick={() => startRehearsals(show.id)}
          disabled={!allCast}
          className="w-full px-4 py-2 bg-amber-700/40 hover:bg-amber-700/60 disabled:opacity-40 disabled:cursor-not-allowed border border-amber-600/60 text-amber-100 rounded text-sm font-medium transition-colors"
        >
          {allCast ? 'Start Rehearsals' : 'Cast all roles first'}
        </button>
      )}

      {canAdvance && (
        <button
          onClick={advance}
          className="w-full px-4 py-2 bg-amber-700/40 hover:bg-amber-700/60 border border-amber-600/60 text-amber-100 rounded text-sm font-medium transition-colors"
        >
          Advance Rehearsal (+1 day)
        </button>
      )}

      {ready && (
        <div className="px-4 py-3 bg-emerald-950/30 border border-emerald-800/50 text-emerald-200 rounded text-sm text-center">
          ★ Ready. Open the show on the Run tab.
        </div>
      )}

      {lastEvent && (
        <div className="px-3 py-2 bg-stone-900 border border-stone-700 rounded text-sm text-stone-300 italic">
          {lastEvent}
        </div>
      )}

      {recentLog.length > 0 && (
        <div>
          <div className="text-xs uppercase tracking-wider text-stone-500 mb-2">Rehearsal Log</div>
          <div className="space-y-1.5 text-xs">
            {recentLog.map((entry) => (
              <div key={entry.id} className="px-2.5 py-1.5 bg-stone-900/40 rounded">
                <span className="text-stone-500 font-mono">d{entry.day}</span>{' '}
                <span className="text-stone-300">{entry.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// Run Tab — fire performance + close show
// ============================================================

import type { PerformanceSummary } from '../../types';
import { runPerformance } from '../../game/systems/TheatrePerformance';

function RunTab({ show, theatreId, stats, lastPerformanceSummary }: {
  show: Show;
  theatreId: string;
  stats: ReturnType<typeof computeTheatreStats>;
  lastPerformanceSummary: PerformanceSummary | null;
}) {
  const closeTheatreShow = useGameStore((s) => s.closeTheatreShow);
  const updateShow = useGameStore((s) => s.updateShow);
  const addCash = useGameStore((s) => s.addCash);
  const day = useGameStore((s) => s.time.day);
  const buildings = useGameStore((s) => s.street.placedBuildings);

  const ready = show.rehearsalProgress >= 100;

  const runTonight = () => {
    const building = buildings.find((b) => b.id === theatreId);
    if (!building) return;
    // Quality is now informed by the actual show.quality and cast chemistry,
    // not just a uniform random roll — pulls real legacy data into the roll.
    const castQualityBoost = show.scriptQuality / 100 * 0.3; // up to +30% lean
    const rolledFactor = Math.random();
    const finalRoll = Math.min(1, Math.max(0, rolledFactor + castQualityBoost - 0.1));
    const { summary, newPopularity } = runPerformance(building, stats, day, { forceRoll: finalRoll });
    // Override the random show name with the actual commissioned show name
    const named: PerformanceSummary = { ...summary, showName: show.title };
    if (named.revenue > 0) {
      addCash(named.revenue, 'box-office', `${show.title} (${show.archetype})`);
    }
    // Persist on the building via the slice — direct setState is OK here
    useGameStore.setState((state) => ({
      street: {
        ...state.street,
        placedBuildings: state.street.placedBuildings.map((b) =>
          b.id === theatreId ? { ...b, popularity: newPopularity, lastPerformance: named } : b,
        ),
      },
    }));
    // Track on the Show as well
    const newTotal = show.totalPerformances + 1;
    const newAvg = (show.averageAttendance * show.totalPerformances + named.fillFactor * 100) / newTotal;
    updateShow(show.id, {
      totalPerformances: newTotal,
      totalRevenue: show.totalRevenue + named.revenue,
      averageAttendance: Math.round(newAvg * 100) / 100,
      criticScore: show.criticScore ?? named.quality,
      isRunning: true,
      openingNight: show.openingNight ?? day,
    });
  };

  const close = () => closeTheatreShow(show.id, theatreId);

  return (
    <div className="p-5 space-y-4">
      <div className="text-center">
        <div className="text-amber-200 italic font-serif text-xl">"{show.title}"</div>
        <div className="text-xs text-stone-400 mt-1">
          {show.totalPerformances > 0
            ? `${show.totalPerformances} performances · avg ${show.averageAttendance.toFixed(0)}% fill · $${show.totalRevenue.toLocaleString()} gross`
            : 'Opening night'}
        </div>
      </div>

      {lastPerformanceSummary && (
        <div className="p-3 bg-stone-900/40 border border-stone-800 rounded">
          <div className="text-xs uppercase tracking-wider text-stone-500 mb-1">Last Night — Day {lastPerformanceSummary.day}</div>
          <div className="grid grid-cols-4 gap-3 text-sm">
            <SmallStat label="Attendance" value={`${lastPerformanceSummary.attendance}/${lastPerformanceSummary.capacity}`} />
            <SmallStat label="Fill" value={`${Math.round(lastPerformanceSummary.fillFactor * 100)}%`} />
            <SmallStat label="Quality" value={`${lastPerformanceSummary.quality}/100`} />
            <SmallStat label="Revenue" value={`$${lastPerformanceSummary.revenue.toLocaleString()}`} tone="text-emerald-300" />
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={runTonight}
          disabled={!ready}
          className="px-4 py-3 bg-amber-700/40 hover:bg-amber-700/60 disabled:opacity-40 disabled:cursor-not-allowed border border-amber-600/60 text-amber-100 rounded text-sm font-medium transition-colors"
        >
          Run Tonight's Performance
        </button>
        <button
          onClick={close}
          disabled={show.totalPerformances === 0}
          className="px-4 py-3 bg-rose-900/30 hover:bg-rose-900/50 disabled:opacity-40 disabled:cursor-not-allowed border border-rose-800/50 text-rose-200 rounded text-sm font-medium transition-colors"
        >
          Close the Show
        </button>
      </div>

      <div className="text-xs text-stone-500 text-center">
        Performance quality is informed by your show's script + your cast's pay tier. Hits raise popularity, flops dampen it.
      </div>
    </div>
  );
}

// ============================================================
// Small atoms
// ============================================================

function KV({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-stone-500">{label}</div>
      <div className="text-sm text-stone-100 font-mono mt-0.5 capitalize">{value}</div>
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

