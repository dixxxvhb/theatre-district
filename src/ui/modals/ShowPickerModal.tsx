import { useState, useEffect } from 'react';
import { useGameStore } from '../../store/gameStore';
import { generateShowOptions, commissionShow } from '../../game/systems/ShowSystem';
import { SHOW_ARCHETYPES } from '../../game/data/shows';
import { GAME_CONSTANTS } from '../../game/data/constants';
import type { Show, ShowGenre } from '../../types';

const GENRE_LABELS: Record<ShowGenre, string> = {
  musical: 'Musical',
  play: 'Play',
  revival: 'Revival',
  experimental: 'Experimental',
  one_person_show: 'One-Person Show',
};

const GENRE_COLORS: Record<ShowGenre, string> = {
  musical: '#d4a574',
  play: '#8b9dc3',
  revival: '#c49b9b',
  experimental: '#a78bfa',
  one_person_show: '#6ee7b7',
};

function QualityBar({ value, label, color = '#d4a574' }: { value: number; label: string; color?: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-500 w-16 text-right shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${value}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-xs text-gray-400 w-7 text-right">{value}</span>
    </div>
  );
}

function ComplexityPips({ value }: { value: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <div
          key={i}
          className={`w-2 h-2 rounded-sm ${
            i < value ? 'bg-amber-500' : 'bg-gray-800'
          }`}
        />
      ))}
    </div>
  );
}

function ShowCard({
  show,
  selected,
  onSelect,
}: {
  show: Show;
  selected: boolean;
  onSelect: () => void;
}) {
  const archetype = SHOW_ARCHETYPES[show.archetype];

  return (
    <button
      onClick={onSelect}
      className={`w-full text-left p-4 rounded-xl transition-all cursor-pointer border ${
        selected
          ? 'border-amber-500/60 bg-amber-950/30 shadow-lg shadow-amber-900/20'
          : 'border-gray-800/60 bg-black/60 hover:border-gray-700/60 hover:bg-gray-900/40'
      }`}
    >
      {/* Genre tag */}
      <div className="flex items-center justify-between mb-2">
        <span
          className="text-[10px] uppercase tracking-widest font-semibold px-2 py-0.5 rounded-full"
          style={{
            color: GENRE_COLORS[show.genre],
            backgroundColor: `${GENRE_COLORS[show.genre]}15`,
            border: `1px solid ${GENRE_COLORS[show.genre]}30`,
          }}
        >
          {GENRE_LABELS[show.genre]}
        </span>
        <span className="text-[10px] text-gray-600 uppercase tracking-wider">
          {archetype.label}
        </span>
      </div>

      {/* Title */}
      <h3
        className="text-lg font-bold text-gray-100 mb-3 leading-tight"
        style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
      >
        {show.title}
      </h3>

      {/* Stats */}
      <div className="space-y-1.5 mb-3">
        <QualityBar value={show.scriptQuality} label="Script" color="#d4a574" />
        <QualityBar value={show.audienceAppeal} label="Appeal" color="#8b2252" />
      </div>

      {/* Bottom row */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className="text-gray-500">Complexity</span>
          <ComplexityPips value={show.complexity} />
        </div>
        <span className="text-gray-500">
          Cast: {show.idealCastSize}
        </span>
        <span className="text-gray-400">
          ${(show.idealBudget / 1000).toFixed(0)}K
        </span>
      </div>
    </button>
  );
}

export function ShowPickerModal() {
  const showOptions = useGameStore((s) => s.showOptions);
  const setShowOptions = useGameStore((s) => s.setShowOptions);
  const selectShow = useGameStore((s) => s.selectShow);
  const setPhase = useGameStore((s) => s.setPhase);
  const cash = useGameStore((s) => s.economy.cash);
  const day = useGameStore((s) => s.time.day);
  const removeCash = useGameStore((s) => s.removeCash);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [commissioning, setCommissioning] = useState(false);

  // Generate options on mount if empty
  useEffect(() => {
    if (showOptions.length === 0) {
      setShowOptions(generateShowOptions(3));
    }
  }, [showOptions.length, setShowOptions]);

  const commissionCost = GAME_CONSTANTS.COMMISSION.COST;
  const canCommission = cash >= commissionCost;

  const handleSelect = () => {
    if (!selectedId) return;
    selectShow(selectedId);
    // Stay in production phase for crew hiring
  };

  const handleCommission = () => {
    if (!canCommission) return;
    removeCash(commissionCost, 'commission', 'Commissioned a custom show');
    const show = commissionShow(undefined, day);
    // Replace current options with the commissioned show
    setShowOptions([show]);
    setCommissioning(true);
  };

  const handleSelectCommissioned = () => {
    if (showOptions.length !== 1) return;
    selectShow(showOptions[0].id);
  };

  if (commissioning && showOptions.length === 1) {
    const show = showOptions[0];
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-gray-950/95 border border-amber-900/30 rounded-2xl p-8 max-w-md w-full shadow-2xl">
          <h2
            className="text-2xl font-bold text-amber-200 mb-2 text-center"
            style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
          >
            Show Commissioned
          </h2>
          <p className="text-gray-400 text-sm text-center mb-6">
            Your playwright has delivered a custom script with enhanced quality.
          </p>

          <ShowCard
            show={show}
            selected={true}
            onSelect={() => {}}
          />

          <button
            onClick={handleSelectCommissioned}
            className="w-full mt-6 py-3 text-sm font-semibold rounded-xl bg-amber-900/40 border border-amber-700/50 text-amber-200 hover:bg-amber-900/60 transition-all cursor-pointer"
          >
            Accept This Show
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-950/95 border border-amber-900/30 rounded-2xl p-6 max-w-3xl w-full shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <h2
            className="text-2xl font-bold text-amber-200 mb-1"
            style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
          >
            Select Your Show
          </h2>
          <p className="text-gray-500 text-sm">
            Choose a script for your next production, or commission a custom one.
          </p>
        </div>

        {/* Show cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {showOptions.map((show) => (
            <ShowCard
              key={show.id}
              show={show}
              selected={selectedId === show.id}
              onSelect={() => setSelectedId(show.id)}
            />
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleSelect}
            disabled={!selectedId}
            className={`flex-1 py-3 text-sm font-semibold rounded-xl transition-all cursor-pointer border ${
              selectedId
                ? 'bg-emerald-900/40 border-emerald-700/50 text-emerald-200 hover:bg-emerald-900/60'
                : 'bg-gray-900/40 border-gray-800/40 text-gray-600 cursor-not-allowed'
            }`}
          >
            Select Show
          </button>

          <div className="text-gray-700">or</div>

          <button
            onClick={handleCommission}
            disabled={!canCommission}
            className={`flex-1 py-3 text-sm font-semibold rounded-xl transition-all cursor-pointer border ${
              canCommission
                ? 'bg-purple-900/40 border-purple-700/50 text-purple-200 hover:bg-purple-900/60'
                : 'bg-gray-900/40 border-gray-800/40 text-gray-600 cursor-not-allowed'
            }`}
          >
            Commission (${(commissionCost / 1000).toFixed(0)}K)
          </button>
        </div>

        <p className="text-center text-gray-600 text-xs mt-3">
          Commissioning costs ${commissionCost.toLocaleString()} and grants +{GAME_CONSTANTS.COMMISSION.SCRIPT_QUALITY_BONUS} script quality.
        </p>

        {/* Back to building */}
        <button
          onClick={() => setPhase('building')}
          className="w-full mt-4 py-2 text-xs text-gray-600 hover:text-gray-400 transition-colors cursor-pointer"
        >
          Back to Building
        </button>
      </div>
    </div>
  );
}
