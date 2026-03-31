import type { DirectorDecision } from '../../types';

interface Props {
  decision: DirectorDecision;
  onResolve: (choice: 'a' | 'b') => void;
}

export function DirectorDecisionModal({ decision, onResolve }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="bg-gray-900 border border-amber-800/40 rounded-lg p-6 max-w-lg w-full mx-4 shadow-2xl">
        <h2 className="text-lg font-bold text-amber-300 mb-1">{decision.title}</h2>
        <p className="text-sm text-gray-400 mb-4">{decision.description}</p>
        <div className="grid grid-cols-2 gap-3">
          {[
            { key: 'a' as const, option: decision.optionA },
            { key: 'b' as const, option: decision.optionB },
          ].map(({ key, option }) => (
            <button
              key={key}
              onClick={() => onResolve(key)}
              className="p-4 bg-gray-800 border border-gray-700 rounded-lg hover:border-amber-600 hover:bg-gray-800/80 transition-colors text-left group cursor-pointer"
            >
              <div className="text-sm font-semibold text-white mb-1 group-hover:text-amber-300">
                {option.label}
              </div>
              <div className="text-xs text-gray-400">{option.description}</div>
              <div className="mt-2 flex flex-wrap gap-1">
                {option.effects.map((eff, i) => (
                  <span
                    key={i}
                    className={`text-[10px] px-1.5 py-0.5 rounded ${
                      eff.value >= 0 ? 'bg-emerald-900/40 text-emerald-400' : 'bg-red-900/40 text-red-400'
                    }`}
                  >
                    {eff.value >= 0 ? '+' : ''}{eff.value} {eff.type}
                    {eff.chance && eff.chance < 1 ? ` (${Math.round(eff.chance * 100)}%)` : ''}
                  </span>
                ))}
                {option.effects.length === 0 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-700 text-gray-400">No effect</span>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
