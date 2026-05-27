import { useState, useEffect } from 'react';
import { useGameStore } from '../../store/gameStore';
import { MarketingPanel } from './MarketingPanel';
import { DirectorDecisionModal } from '../modals/DirectorDecisionModal';
import { pickDecision } from '../../game/data/decisions';
import { pushToast } from '../components/NotificationToast';
import type { DirectorDecision } from '../../types';

export function RehearsalView() {
  const shows = useGameStore((s) => s.shows);
  const activeShowId = useGameStore((s) => s.activeShowId);
  const castMembers = useGameStore((s) => s.castMembers);
  const rehearsalLog = useGameStore((s) => s.rehearsalLog);
  const day = useGameStore((s) => s.time.day);

  const activeShow = shows.find((s) => s.id === activeShowId);
  const lastDecisionDay = useGameStore((s) => s.lastDirectorDecisionDay);
  const usedDecisionIds = useGameStore((s) => s.usedDirectorDecisionIds);
  const [activeDecision, setActiveDecision] = useState<DirectorDecision | null>(null);

  // Check for director decision trigger
  useEffect(() => {
    if (!activeShow?.isRehearsing) return;
    if (activeDecision) return;
    const daysSinceLast = day - lastDecisionDay;
    if (daysSinceLast >= 5 + Math.floor(Math.random() * 3)) {
      const decision = pickDecision(usedDecisionIds);
      if (decision) {
        setActiveDecision(decision);
        useGameStore.getState().setSpeed('paused');
      }
    }
  }, [day, activeShow?.isRehearsing, activeDecision, lastDecisionDay, usedDecisionIds]);

  const handleResolveDecision = (choice: 'a' | 'b') => {
    if (!activeDecision || !activeShow) return;

    const option = choice === 'a' ? activeDecision.optionA : activeDecision.optionB;

    for (const effect of option.effects) {
      const roll = Math.random();
      if (effect.chance && roll > effect.chance) continue;

      switch (effect.type) {
        case 'quality':
          useGameStore.getState().updateShow(activeShow.id, {
            quality: Math.max(0, Math.min(100, activeShow.quality + effect.value)),
          });
          break;
        case 'readiness':
          useGameStore.getState().updateShow(activeShow.id, {
            rehearsalProgress: Math.max(0, Math.min(100, activeShow.rehearsalProgress + effect.value)),
          });
          break;
        case 'cash':
          if (effect.value < 0) {
            useGameStore.getState().removeCash(Math.abs(effect.value), 'rehearsal', activeDecision.title);
          } else {
            useGameStore.getState().addCash(effect.value, 'rehearsal', activeDecision.title);
          }
          break;
        case 'morale':
          // Apply to all cast — morale changes handled via cast member updates if available
          break;
        case 'days':
          useGameStore.getState().updateShow(activeShow.id, {
            rehearsalDaysTotal: activeShow.rehearsalDaysTotal + effect.value,
          });
          break;
      }
    }

    pushToast(`Director chose: ${option.label}`, 'info');
    useGameStore.getState().recordDirectorDecision(activeDecision.id, day);
    setActiveDecision(null);
    useGameStore.getState().setSpeed('normal');
  };

  if (!activeShow) return null;

  const readiness = activeShow.rehearsalProgress;
  const stage = readiness < 25 ? 'Blocking' : readiness < 50 ? 'Stumbling' : readiness < 75 ? 'Gelling' : 'Polishing';

  return (
    <div className="w-80 bg-gray-950 border-l border-gray-800 flex flex-col h-full overflow-hidden">
      {/* Rehearsal info header */}
      <div className="p-3 border-b border-gray-800">
        <div className="text-sm font-bold text-white">{activeShow.title}</div>
        <div className="text-[10px] text-gray-500 mt-0.5">
          Day {activeShow.rehearsalDaysCompleted} / {activeShow.rehearsalDaysTotal}
        </div>
      </div>

      {/* Readiness bar */}
      <div className="px-3 py-2 border-b border-gray-800/50">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] text-gray-400 uppercase tracking-wider">Readiness</span>
          <span className="text-xs text-amber-300 font-semibold">{stage}</span>
        </div>
        <div className="w-full h-3 bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${readiness}%`,
              background: readiness < 25 ? '#ef4444' : readiness < 50 ? '#f59e0b' : readiness < 75 ? '#22c55e' : '#10b981',
            }}
          />
        </div>
        <div className="text-right text-[10px] text-gray-500 mt-0.5">{Math.round(readiness)}%</div>
      </div>

      {/* Cast morale summary */}
      <div className="px-3 py-2 border-b border-gray-800/50">
        <div className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Cast</div>
        <div className="flex flex-wrap gap-1">
          {castMembers.map((cm) => (
            <div
              key={cm.id}
              className="text-[9px] px-1.5 py-0.5 rounded bg-gray-800"
              title={`${cm.name}: morale ${cm.morale}`}
            >
              <span className={cm.morale > 60 ? 'text-emerald-400' : cm.morale > 30 ? 'text-amber-400' : 'text-red-400'}>
                {cm.name.split(' ')[0]}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Rehearsal log */}
      <div className="flex-1 overflow-y-auto px-3 py-2">
        <div className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Log</div>
        <div className="space-y-1">
          {rehearsalLog.slice(-15).reverse().map((entry) => (
            <div
              key={entry.id}
              className={`text-[10px] py-0.5 ${
                entry.type === 'breakthrough' ? 'text-amber-300' :
                entry.type === 'conflict' ? 'text-red-400' :
                entry.type === 'injury' ? 'text-red-500' :
                'text-gray-500'
              }`}
            >
              <span className="text-gray-600">D{entry.day}</span> {entry.message}
            </div>
          ))}
        </div>
      </div>

      {/* Marketing panel */}
      <div className="border-t border-gray-800">
        <MarketingPanel />
      </div>

      {/* Director decision modal */}
      {activeDecision && (
        <DirectorDecisionModal
          decision={activeDecision}
          onResolve={handleResolveDecision}
        />
      )}
    </div>
  );
}
