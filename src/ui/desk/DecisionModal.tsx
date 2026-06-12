// Director decision modal — auto-pausing (the store pauses when a decision
// lands; resolving restores the previous speed). Content is the PRESERVED
// legacy DIRECTOR_DECISIONS data.

import { DIRECTOR_DECISIONS } from '../../game/data/decisions';
import { useTDStore } from '../../store/store';

export function DecisionModal() {
  const pending = useTDStore((s) => s.pendingDecision);
  const production = useTDStore((s) => (s.pendingDecision ? s.productions[s.pendingDecision.theatreId] : undefined));
  const resolve = useTDStore((s) => s.resolveDecision);

  if (!pending) return null;
  const decision = DIRECTOR_DECISIONS.find((d) => d.id === pending.decisionId);
  if (!decision) return null;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/75">
      <div className="w-[30rem] rounded-lg border border-amber-900/50 bg-[#f2e8d5] p-5 text-gray-900 shadow-2xl">
        <div className="text-[10px] uppercase tracking-[0.3em] text-amber-800">
          From the director{production?.show ? ` — ${production.show.title}` : ''}
        </div>
        <h3 className="mt-1 text-xl" style={{ fontFamily: 'Georgia, serif' }}>
          {decision.title}
        </h3>
        <p className="mt-2 text-sm text-gray-700">{decision.description}</p>
        <div className="mt-4 space-y-2">
          {(['A', 'B'] as const).map((opt) => {
            const o = opt === 'A' ? decision.optionA : decision.optionB;
            return (
              <button
                key={opt}
                onClick={() => resolve(opt)}
                className="block w-full rounded border border-amber-900/40 bg-white/60 p-3 text-left hover:bg-white"
              >
                <div className="text-sm font-semibold">{o.label}</div>
                <div className="text-xs text-gray-600">{o.description}</div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
