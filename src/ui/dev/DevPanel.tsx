// Dev/playtest panel — only rendered when the URL has ?dev=1.
// First-class deliverable: eras 3–5 get playtested through this, not by
// grinding hours. Stubs are labeled with the session that wires them.

import { useEffect, useState } from 'react';
import { useTDStore } from '../../store/store';
import { runtime } from '../../game/sim/runtime';
import { crowd } from '../../game/sim/crowd';
import { CALENDAR } from '../../game/config/balance';

export function devEnabled(): boolean {
  return new URLSearchParams(window.location.search).get('dev') === '1';
}

const DAYS_PER_SEASON = CALENDAR.DAYS_PER_WEEK * CALENDAR.WEEKS_PER_SEASON;

export function DevPanel() {
  const addCash = useTDStore((s) => s.addCash);
  const skipDays = useTDStore((s) => s.skipDays);
  const setEra = useTDStore((s) => s.setEra);
  const setTimeOfDay = useTDStore((s) => s.setTimeOfDay);
  const era = useTDStore((s) => s.street.era);

  const [meters, setMeters] = useState({ fps: 0, tps: 0, peeps: 0 });
  useEffect(() => {
    const id = setInterval(
      () => setMeters({ fps: runtime.fps(), tps: runtime.ticksPerSecond(), peeps: crowd.count() }),
      500,
    );
    return () => clearInterval(id);
  }, []);

  const btn =
    'px-2 py-1 text-xs rounded border border-amber-900/50 bg-gray-900/80 text-amber-100 hover:bg-gray-800';
  const stub = 'px-2 py-1 text-xs rounded border border-gray-800 bg-gray-900/40 text-gray-600 cursor-not-allowed';

  return (
    <div className="fixed bottom-3 left-3 z-40 w-60 rounded-lg border border-amber-900/40 bg-gray-950/95 p-3 text-amber-100 shadow-xl">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-bold tracking-widest text-amber-400">DEV</span>
        <span className="font-mono text-[10px] text-gray-400">
          {meters.fps} fps · {meters.tps} t/s · {meters.peeps} ppl
        </span>
      </div>
      <div className="mb-2 flex flex-wrap gap-1">
        <button className={btn} onClick={() => addCash(10_000)}>+$10k</button>
        <button className={btn} onClick={() => skipDays(1)}>+Day</button>
        <button className={btn} onClick={() => skipDays(CALENDAR.DAYS_PER_WEEK)}>+Week</button>
        <button className={btn} onClick={() => skipDays(DAYS_PER_SEASON)}>+Season</button>
      </div>
      <div className="mb-2 flex items-center gap-1">
        <span className="text-[10px] uppercase tracking-wider text-gray-400">Era</span>
        {[0, 1, 2, 3, 4].map((e) => (
          <button
            key={e}
            className={`${btn} ${era === e ? 'bg-amber-900/60' : ''}`}
            onClick={() => setEra(e)}
          >
            {e + 1}
          </button>
        ))}
      </div>
      <div className="mb-2 flex items-center gap-1">
        <span className="text-[10px] uppercase tracking-wider text-gray-400">Time</span>
        {([
          ['Noon', 0.15],
          ['Dusk', 0.45],
          ['Night', 0.65],
          ['Late', 0.95],
        ] as const).map(([label, t]) => (
          <button key={label} className={btn} onClick={() => setTimeOfDay(t)}>
            {label}
          </button>
        ))}
      </div>
      <div className="mb-2 flex items-center gap-1">
        <span className="text-[10px] uppercase tracking-wider text-gray-400">Weather</span>
        {(['clear', 'rain', 'heat'] as const).map((w) => (
          <button key={w} className={btn} onClick={() => useTDStore.getState().setWeather(w)}>
            {w}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-1">
        <button className={btn} onClick={() => crowd.surge(40)}>Crowd surge</button>
        <button className={stub} disabled title="Session 6">Event</button>
      </div>
    </div>
  );
}
