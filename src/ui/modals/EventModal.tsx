// Event modal: shows random events with choices during the running phase
import { useGameStore } from '../../store/gameStore';

const SEVERITY_STYLES: Record<string, { border: string; bg: string; badge: string; badgeText: string }> = {
  minor:    { border: 'border-emerald-800/50', bg: 'bg-emerald-950/20', badge: 'bg-emerald-900/40', badgeText: 'text-emerald-400' },
  moderate: { border: 'border-amber-800/50',   bg: 'bg-amber-950/20',   badge: 'bg-amber-900/40',   badgeText: 'text-amber-400' },
  major:    { border: 'border-red-800/50',      bg: 'bg-red-950/20',      badge: 'bg-red-900/40',      badgeText: 'text-red-400' },
};

export function EventModal() {
  const events = useGameStore((s) => s.events);
  const resolveEvent = useGameStore((s) => s.resolveEvent);

  // Find the first unresolved event
  const unresolvedEvent = events.find((e) => !e.resolved);
  if (!unresolvedEvent) return null;

  const style = SEVERITY_STYLES[unresolvedEvent.severity] ?? SEVERITY_STYLES.minor;

  const handleChoice = (choiceId: string) => {
    resolveEvent(unresolvedEvent.id, choiceId);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className={`w-[420px] ${style.bg} border ${style.border} rounded-xl shadow-2xl`}>
        {/* Header */}
        <div className="p-5 border-b border-gray-800/30">
          <div className="flex items-center gap-2 mb-2">
            <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full ${style.badge} ${style.badgeText}`}>
              {unresolvedEvent.severity}
            </span>
          </div>
          <h2
            className="text-lg text-amber-200 font-bold"
            style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
          >
            {unresolvedEvent.title}
          </h2>
        </div>

        {/* Description */}
        <div className="p-5">
          <p className="text-sm text-gray-300 leading-relaxed">
            {unresolvedEvent.description}
          </p>
        </div>

        {/* Choices */}
        <div className="p-5 pt-0 space-y-2">
          {unresolvedEvent.choices.map((choice) => {
            // Build hint text from effects
            const hints = choice.effects.map((e) => {
              const sign = e.value >= 0 ? '+' : '-';
              const absVal = Math.abs(e.value);
              switch (e.type) {
                case 'cash': return `${sign}$${absVal.toLocaleString()}`;
                case 'reputation': return `${sign}${absVal} rep`;
                case 'buzz': return `${sign}${absVal} buzz`;
                case 'quality': return `${sign}${absVal} quality`;
                case 'morale': return `${sign}${absVal} morale`;
                default: return '';
              }
            }).filter(Boolean);

            return (
              <button
                key={choice.id}
                onClick={() => handleChoice(choice.id)}
                className="w-full text-left p-3 rounded-lg bg-gray-900/60 border border-gray-700/40 hover:border-amber-700/50 hover:bg-gray-800/60 transition-all cursor-pointer"
              >
                <span className="text-sm text-amber-200">{choice.text}</span>
                {hints.length > 0 && (
                  <div className="mt-1 flex gap-2">
                    {hints.map((hint, i) => (
                      <span
                        key={i}
                        className={`text-[10px] ${
                          hint.startsWith('+')
                            ? 'text-emerald-400'
                            : 'text-red-400'
                        }`}
                      >
                        {hint}
                      </span>
                    ))}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
