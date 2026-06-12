// Build palette (B) — theatres, amenities, decoration, demolish, plus the
// street-services toggles (sweeper, buzz overlay). Lean chrome; full playbill
// treatment lands in the cohesion pass.

import { AMENITIES, DECORATIONS, THEATRES, UPKEEP } from '../game/config/balance';
import { useTDStore, type Tool } from '../store/store';
import type { BuildingKind, DecorationKind } from '../types/td';

const fmt = (n: number) => `$${n.toLocaleString()}`;

function sameTool(a: Tool, b: Tool): boolean {
  if (!a || !b) return a === b;
  if (a.type !== b.type) return false;
  if (a.type === 'demolish') return true;
  return (a as { kind?: string }).kind === (b as { kind?: string }).kind;
}

export function BuildPalette() {
  const tool = useTDStore((s) => s.ui.tool);
  const setTool = useTDStore((s) => s.setTool);
  const cash = useTDStore((s) => s.economy.cash);
  const sweeperHired = useTDStore((s) => s.upkeep.sweeperHired);
  const toggleSweeper = useTDStore((s) => s.toggleSweeper);
  const buzzOverlay = useTDStore((s) => s.settings.buzzOverlay);
  const toggleBuzzOverlay = useTDStore((s) => s.toggleBuzzOverlay);
  const togglePalette = useTDStore((s) => s.togglePalette);

  const pick = (next: Tool) => setTool(sameTool(tool, next) ? null : next);

  const item = (label: string, cost: number, next: Tool, hint?: string) => {
    const active = sameTool(tool, next);
    const affordable = cash >= cost;
    return (
      <button
        key={label}
        onClick={() => affordable && pick(next)}
        title={hint}
        className={`flex w-full items-center justify-between rounded border px-2 py-1 text-left text-xs ${
          active
            ? 'border-amber-600 bg-amber-950/70 text-amber-100'
            : affordable
              ? 'border-gray-800 bg-gray-900/60 text-gray-300 hover:bg-gray-800'
              : 'cursor-not-allowed border-gray-900 bg-gray-950 text-gray-600'
        }`}
      >
        <span>{label}</span>
        <span className="font-mono text-[10px] text-gray-500">{fmt(cost)}</span>
      </button>
    );
  };

  const heading = (text: string) => (
    <div className="mt-2 mb-1 text-[10px] font-bold uppercase tracking-widest text-amber-700">{text}</div>
  );

  return (
    <div className="absolute top-2 right-2 bottom-2 z-20 flex w-56 flex-col rounded-lg border border-amber-900/40 bg-gray-950/95 p-3 shadow-2xl">
      <div className="flex items-center justify-between">
        <h2 className="text-sm tracking-wide text-amber-200" style={{ fontFamily: 'Georgia, serif' }}>
          Build
        </h2>
        <button onClick={togglePalette} className="rounded border border-gray-700 px-1.5 text-xs text-gray-400 hover:bg-gray-800">
          B
        </button>
      </div>

      <div className="mt-1 flex-1 overflow-y-auto pr-1">
        {heading('Theatres')}
        {(Object.entries(THEATRES) as Array<[BuildingKind, (typeof THEATRES)[keyof typeof THEATRES]]>).map(([k, v]) =>
          item(v.label, v.cost, { type: 'building', kind: k }, `${v.width} lots wide · ${v.buildDays} days · ${v.capacity} seats`),
        )}
        {heading('Amenities')}
        {(Object.entries(AMENITIES) as Array<[BuildingKind, (typeof AMENITIES)[keyof typeof AMENITIES]]>).map(([k, v]) =>
          item(v.label, v.cost, { type: 'building', kind: k }, `${v.width} lots wide · ${v.buildDays} days`),
        )}
        {heading('Decoration')}
        {(Object.entries(DECORATIONS) as Array<[DecorationKind, (typeof DECORATIONS)[keyof typeof DECORATIONS]]>).map(
          ([k, v]) =>
            item(
              v.label,
              v.cost,
              { type: 'decoration', kind: k },
              k === 'string_lights' ? 'Click two anchor tiles, 2–6 apart' : 'Sidewalk and lot-front tiles',
            ),
        )}
      </div>

      <div className="mt-2 space-y-1 border-t border-gray-800 pt-2">
        <button
          onClick={() => pick({ type: 'demolish' })}
          className={`w-full rounded border px-2 py-1 text-xs ${
            tool?.type === 'demolish'
              ? 'border-red-700 bg-red-950/70 text-red-200'
              : 'border-gray-800 bg-gray-900/60 text-gray-300 hover:bg-gray-800'
          }`}
        >
          Demolish
        </button>
        <button
          onClick={toggleSweeper}
          className={`w-full rounded border px-2 py-1 text-xs ${
            sweeperHired ? 'border-amber-700 bg-amber-950/60 text-amber-100' : 'border-gray-800 bg-gray-900/60 text-gray-300 hover:bg-gray-800'
          }`}
        >
          Street crew {sweeperHired ? `· on (${fmt(UPKEEP.SWEEPER_COST_PER_DAY)}/day)` : `· hire (${fmt(UPKEEP.SWEEPER_COST_PER_DAY)}/day)`}
        </button>
        <button
          onClick={toggleBuzzOverlay}
          title="Tab"
          className={`w-full rounded border px-2 py-1 text-xs ${
            buzzOverlay ? 'border-amber-700 bg-amber-950/60 text-amber-100' : 'border-gray-800 bg-gray-900/60 text-gray-300 hover:bg-gray-800'
          }`}
        >
          Buzz overlay {buzzOverlay ? '· on' : '· off'}
        </button>
      </div>
    </div>
  );
}
