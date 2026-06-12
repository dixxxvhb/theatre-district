// Era panel — the always-visible "what's next" UI. Lives in the top-left of
// the canvas area: current era name + milestone checklist + advance button.

import { useState } from 'react';
import { eraComplete, ERAS, eraStatus } from '../game/data/eras';
import { useTDStore } from '../store/store';

export function EraPanel() {
  const era = useTDStore((s) => s.street.era);
  const state = useTDStore((s) => s);
  const advance = useTDStore((s) => s.advanceEra);
  const [expanded, setExpanded] = useState(true);

  const def = ERAS[era];
  const status = eraStatus(state, era);
  const ready = eraComplete(state, era);

  return (
    <div className="absolute top-2 left-2 z-20 w-60 rounded-lg border border-amber-900/40 bg-gray-950/85 p-3 shadow-xl backdrop-blur-sm">
      <button onClick={() => setExpanded(!expanded)} className="flex w-full items-center justify-between text-left">
        <div>
          <div className="text-[10px] uppercase tracking-[0.3em] text-amber-700">Era {era + 1}</div>
          <div className="text-sm text-amber-200" style={{ fontFamily: 'Georgia, serif' }}>
            {def.name}
          </div>
        </div>
        <span className="text-xs text-gray-500">{expanded ? '▾' : '▸'}</span>
      </button>
      {expanded && (
        <>
          <ul className="mt-2 space-y-1 text-xs">
            {status.map((m, i) => (
              <li key={i} className={m.done ? 'text-emerald-400/80' : 'text-gray-400'}>
                <span className="mr-1">{m.done ? '✓' : '○'}</span>
                {m.label}
              </li>
            ))}
          </ul>
          {ready && era < 4 && (
            <button
              onClick={advance}
              className="mt-2 w-full rounded border border-amber-700 bg-amber-950/70 px-2 py-1 text-xs text-amber-100 hover:bg-amber-900/60"
            >
              Advance to {ERAS[era + 1].name}
            </button>
          )}
        </>
      )}
    </div>
  );
}
