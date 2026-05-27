// StreetBuildPanel — Theatre District placement palette.
// Replaces the legacy BuildPanel when USE_RENDER2 is on.

import { useGameStore } from '../../store/gameStore';
import {
  BUILDING_DEFINITIONS,
  DECORATION_DEFINITIONS,
  plotAcquisitionCost,
} from '../../game/data/street';
import type { BuildingKind, DecorationKind, StreetTool } from '../../types';

const BUILDINGS = Object.values(BUILDING_DEFINITIONS);
const DECORATION = Object.values(DECORATION_DEFINITIONS);

export function StreetBuildPanel() {
  const cash = useGameStore((s) => s.economy.cash);
  const street = useGameStore((s) => s.street);
  const streetTool = useGameStore((s) => s.ui.streetTool);
  const streetSelectedId = useGameStore((s) => s.ui.streetSelectedId);
  const setStreetTool = useGameStore((s) => s.setStreetTool);
  const removeBuilding = useGameStore((s) => s.removeBuilding);
  const removeDecoration = useGameStore((s) => s.removeDecoration);
  const selectStreetEntity = useGameStore((s) => s.selectStreetEntity);

  const plotCost = plotAcquisitionCost(street.plots.length);
  const selectedBuilding = streetSelectedId
    ? street.placedBuildings.find((b) => b.id === streetSelectedId)
    : null;
  const selectedDecoration = streetSelectedId
    ? street.decoration.find((d) => d.id === streetSelectedId)
    : null;

  const isToolActive = (tool: StreetTool) => streetTool === tool;

  return (
    <div className="w-80 h-full bg-stone-950/95 border-l border-stone-800 text-stone-200 overflow-y-auto">
      <div className="p-4 border-b border-stone-800">
        <h2 className="text-amber-300 font-serif text-2xl tracking-wide">Theatre District</h2>
        <p className="text-stone-400 text-xs mt-1">Place buildings, amenities, and decor. Acquire plots to expand.</p>
        <div className="mt-3 text-emerald-300 font-mono">${cash.toLocaleString()}</div>
        <div className="mt-1 text-xs text-stone-500">
          {street.plots.length} plots · {street.placedBuildings.length} buildings · {street.decoration.length} decor
        </div>
      </div>

      {/* Selected entity panel */}
      {(selectedBuilding || selectedDecoration) && (
        <div className="p-4 border-b border-stone-800 bg-amber-950/20">
          <div className="text-amber-200 text-sm uppercase tracking-wider mb-2">Selected</div>
          {selectedBuilding && (
            <>
              <div className="font-medium">{BUILDING_DEFINITIONS[selectedBuilding.kind].label}</div>
              <div className="text-xs text-stone-400 mt-1">
                {selectedBuilding.constructionDaysLeft > 0
                  ? `Building (${selectedBuilding.constructionDaysLeft}d left)`
                  : 'Open'}
              </div>
              <button
                onClick={() => { removeBuilding(selectedBuilding.id); selectStreetEntity(null); }}
                className="mt-3 text-xs text-rose-400 hover:text-rose-300 underline"
              >
                Demolish (no refund)
              </button>
            </>
          )}
          {selectedDecoration && (
            <>
              <div className="font-medium">{DECORATION_DEFINITIONS[selectedDecoration.kind].label}</div>
              <button
                onClick={() => { removeDecoration(selectedDecoration.id); selectStreetEntity(null); }}
                className="mt-3 text-xs text-rose-400 hover:text-rose-300 underline"
              >
                Remove (no refund)
              </button>
            </>
          )}
        </div>
      )}

      {/* Tool active banner */}
      {streetTool && (
        <div className="p-3 bg-emerald-950/30 border-b border-emerald-900/40 text-xs flex items-center justify-between">
          <span className="text-emerald-300">
            {streetTool === 'acquire' ? 'Acquire mode — click adjacent tile' : `Placing: ${labelForTool(streetTool)}`}
          </span>
          <button onClick={() => setStreetTool(null)} className="text-stone-300 hover:text-stone-100">Cancel</button>
        </div>
      )}

      {/* Buildings */}
      <Section title="Buildings">
        {BUILDINGS.map((def) => {
          const canAfford = cash >= def.cost;
          return (
            <ToolButton
              key={def.kind}
              active={isToolActive(def.kind)}
              disabled={!canAfford}
              onClick={() => setStreetTool(isToolActive(def.kind) ? null : def.kind)}
              title={def.label}
              subtitle={`${def.footprint.width}×${def.footprint.height} · ${def.buildDays}d`}
              price={`$${def.cost.toLocaleString()}`}
              hint={def.description}
            />
          );
        })}
      </Section>

      {/* Decoration */}
      <Section title="Decoration">
        {DECORATION.map((def) => {
          const canAfford = cash >= def.cost;
          return (
            <ToolButton
              key={def.kind}
              active={isToolActive(def.kind)}
              disabled={!canAfford}
              onClick={() => setStreetTool(isToolActive(def.kind) ? null : def.kind)}
              title={def.label}
              subtitle="single tile"
              price={`$${def.cost.toLocaleString()}`}
              hint={def.description}
            />
          );
        })}
      </Section>

      {/* Plot acquisition */}
      <Section title="Expand Street">
        <ToolButton
          active={isToolActive('acquire')}
          disabled={cash < plotCost}
          onClick={() => setStreetTool(isToolActive('acquire') ? null : 'acquire')}
          title="Acquire Plot"
          subtitle="adjacent only"
          price={`$${plotCost.toLocaleString()}`}
          hint="Buy an adjacent tile to extend your street."
        />
      </Section>
    </div>
  );
}

function labelForTool(tool: StreetTool): string {
  if (tool in BUILDING_DEFINITIONS) return BUILDING_DEFINITIONS[tool as BuildingKind].label;
  if (tool in DECORATION_DEFINITIONS) return DECORATION_DEFINITIONS[tool as DecorationKind].label;
  if (tool === 'acquire') return 'Acquire Plot';
  return tool;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-stone-800">
      <div className="px-4 pt-4 pb-2 text-xs uppercase tracking-widest text-stone-500">{title}</div>
      <div className="px-2 pb-3 space-y-1">{children}</div>
    </div>
  );
}

interface ToolButtonProps {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  title: string;
  subtitle: string;
  price: string;
  hint: string;
}

function ToolButton({ active, disabled, onClick, title, subtitle, price, hint }: ToolButtonProps) {
  const base = 'w-full text-left px-3 py-2 rounded transition-colors';
  const state = active
    ? 'bg-amber-900/40 ring-1 ring-amber-600/60 text-amber-100'
    : disabled
      ? 'opacity-40 cursor-not-allowed text-stone-500'
      : 'hover:bg-stone-800/60 text-stone-200';
  return (
    <button onClick={onClick} disabled={disabled} className={`${base} ${state}`} title={hint}>
      <div className="flex items-baseline justify-between">
        <span className="font-medium">{title}</span>
        <span className="text-xs font-mono text-emerald-400">{price}</span>
      </div>
      <div className="text-xs text-stone-400 mt-0.5">{subtitle}</div>
    </button>
  );
}
