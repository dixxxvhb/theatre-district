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

const CARD_ROTATIONS = ['-2deg', '0deg', '2deg'];

function getTrendIndicator(genre: ShowGenre): 'positive' | 'neutral' | 'negative' {
  const trend = useGameStore.getState().campaign.currentTrend;
  if (!trend) return 'neutral';
  const genreEffect = trend.trend.effects.find(
    (e) => e.type === 'attendance' && e.genre === genre,
  );
  if (!genreEffect) return 'neutral';
  return genreEffect.multiplier > 1 ? 'positive' : 'negative';
}

const TREND_BORDER: Record<'positive' | 'neutral' | 'negative', string> = {
  positive: 'border-emerald-500/60 shadow-emerald-500/20',
  negative: 'border-red-500/60 shadow-red-500/20',
  neutral: 'border-amber-700/40',
};

function QualityBar({ value, label, color = '#d4a574' }: { value: number; label: string; color?: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-amber-900/60 w-16 text-right shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-amber-900/20 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${value}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-xs text-amber-800/60 w-7 text-right">{value}</span>
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
            i < value ? 'bg-amber-600' : 'bg-amber-900/20'
          }`}
        />
      ))}
    </div>
  );
}

function ShowCard({
  show,
  selected,
  dimmed,
  rotation,
  onSelect,
}: {
  show: Show;
  selected: boolean;
  dimmed: boolean;
  rotation: string;
  onSelect: () => void;
}) {
  const archetype = SHOW_ARCHETYPES[show.archetype];
  const trendIndicator = getTrendIndicator(show.genre);

  return (
    <button
      onClick={onSelect}
      className={`w-full text-left p-5 rounded-lg transition-all duration-300 cursor-pointer border-2 shadow-lg ${
        TREND_BORDER[trendIndicator]
      } ${
        selected
          ? 'ring-2 ring-amber-400/60 z-10'
          : ''
      } ${
        dimmed ? 'opacity-40 scale-95' : 'hover:scale-[1.02]'
      }`}
      style={{
        transform: `rotate(${selected ? '0deg' : rotation}) ${selected ? 'scale(1.05)' : dimmed ? 'scale(0.95)' : ''}`,
        background: 'linear-gradient(180deg, #fefce8 0%, #fef3c7 40%, #fde68a20 100%)',
        fontFamily: 'Georgia, "Times New Roman", serif',
      }}
    >
      {/* Script cover top line */}
      <div className="border-b border-amber-300/40 pb-2 mb-3">
        <div className="flex items-center justify-between">
          <span
            className="text-[10px] uppercase tracking-widest font-semibold px-2 py-0.5 rounded-full"
            style={{
              color: GENRE_COLORS[show.genre],
              backgroundColor: `${GENRE_COLORS[show.genre]}25`,
              border: `1px solid ${GENRE_COLORS[show.genre]}40`,
            }}
          >
            {GENRE_LABELS[show.genre]}
          </span>
          <span className="text-[10px] text-amber-700/50 uppercase tracking-wider font-sans">
            {archetype.label}
          </span>
        </div>
      </div>

      {/* Title */}
      <h3 className="text-lg font-bold text-amber-950 mb-1 leading-tight italic">
        {show.title}
      </h3>

      {/* Decorative line */}
      <div className="w-12 h-px bg-amber-400/50 mb-3" />

      {/* Trend label */}
      {trendIndicator !== 'neutral' && (
        <div className={`text-[10px] uppercase tracking-wider font-sans mb-2 ${
          trendIndicator === 'positive' ? 'text-emerald-700' : 'text-red-700'
        }`}>
          {trendIndicator === 'positive' ? 'Trending' : 'Against Trend'}
        </div>
      )}

      {/* Stats */}
      <div className="space-y-1.5 mb-3">
        <QualityBar value={show.scriptQuality} label="Script" color="#92400e" />
        <QualityBar value={show.audienceAppeal} label="Appeal" color="#9f1239" />
      </div>

      {/* Bottom row */}
      <div className="flex items-center justify-between text-xs font-sans border-t border-amber-300/30 pt-2">
        <div className="flex items-center gap-2">
          <span className="text-amber-800/50">Complexity</span>
          <ComplexityPips value={show.complexity} />
        </div>
        <span className="text-amber-800/50">
          Cast: {show.idealCastSize}
        </span>
        <span className="text-amber-900/70 font-medium">
          ${(show.idealBudget / 1000).toFixed(0)}K
        </span>
      </div>
    </button>
  );
}

function CommissionCard({
  cost,
  canAfford,
  onClick,
}: {
  cost: number;
  canAfford: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={!canAfford}
      className={`w-full text-left p-5 rounded-lg transition-all duration-300 border-2 border-dashed shadow-md ${
        canAfford
          ? 'border-amber-600/30 hover:border-amber-500/50 hover:scale-[1.02] cursor-pointer'
          : 'border-gray-700/30 opacity-40 cursor-not-allowed'
      }`}
      style={{
        transform: 'rotate(1deg)',
        background: canAfford
          ? 'linear-gradient(180deg, #fefce810 0%, #fef3c705 100%)'
          : 'linear-gradient(180deg, #1c1917 0%, #0c0a09 100%)',
      }}
    >
      <div className="flex flex-col items-center justify-center h-full min-h-[180px] gap-3">
        {/* Blank page icon */}
        <div className="w-12 h-16 border-2 border-dashed border-amber-700/30 rounded-sm flex items-center justify-center">
          <span className="text-amber-700/40 text-2xl">+</span>
        </div>
        <span
          className="text-sm text-amber-200/60 italic"
          style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
        >
          Commission Custom Script
        </span>
        <span className={`text-xs font-sans px-2 py-0.5 rounded-full ${
          canAfford
            ? 'bg-purple-900/40 text-purple-300 border border-purple-700/40'
            : 'bg-gray-800/40 text-gray-500 border border-gray-700/40'
        }`}>
          ${(cost / 1000).toFixed(0)}K
        </span>
        <span className="text-[10px] text-gray-500 font-sans">
          +{GAME_CONSTANTS.COMMISSION.SCRIPT_QUALITY_BONUS} script quality bonus
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
        <div
          className="rounded-2xl p-8 max-w-md w-full shadow-2xl border border-amber-900/30"
          style={{ background: 'linear-gradient(180deg, #451a03ee 0%, #1c1917ee 100%)' }}
        >
          <h2
            className="text-2xl font-bold text-amber-200 mb-2 text-center italic"
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
            dimmed={false}
            rotation="0deg"
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
      <div
        className="rounded-2xl p-6 max-w-4xl w-full shadow-2xl max-h-[90vh] overflow-y-auto border border-amber-900/30"
        style={{ background: 'linear-gradient(180deg, #451a03f2 0%, #1c1917f2 100%)' }}
      >
        {/* Header */}
        <div className="text-center mb-8">
          <h2
            className="text-3xl font-bold text-amber-200 mb-1 italic"
            style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
          >
            The Pitch Meeting
          </h2>
          <p className="text-amber-700/60 text-sm">
            Three scripts on your desk. Choose wisely, or commission something new.
          </p>
          {/* Decorative divider */}
          <div className="flex items-center justify-center gap-3 mt-3">
            <div className="w-16 h-px bg-amber-700/30" />
            <div className="w-1.5 h-1.5 rounded-full bg-amber-700/40" />
            <div className="w-16 h-px bg-amber-700/30" />
          </div>
        </div>

        {/* Script cards on desk */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-8 items-start">
          {showOptions.map((show, i) => (
            <ShowCard
              key={show.id}
              show={show}
              selected={selectedId === show.id}
              dimmed={selectedId !== null && selectedId !== show.id}
              rotation={CARD_ROTATIONS[i % CARD_ROTATIONS.length]}
              onSelect={() => setSelectedId(show.id)}
            />
          ))}

          {/* Commission card */}
          <CommissionCard
            cost={commissionCost}
            canAfford={canCommission}
            onClick={handleCommission}
          />
        </div>

        {/* Select button */}
        <div className="flex items-center justify-center">
          <button
            onClick={handleSelect}
            disabled={!selectedId}
            className={`px-10 py-3 text-sm font-semibold rounded-xl transition-all cursor-pointer border ${
              selectedId
                ? 'bg-emerald-900/50 border-emerald-600/50 text-emerald-200 hover:bg-emerald-900/70 shadow-lg shadow-emerald-900/20'
                : 'bg-gray-900/40 border-gray-800/40 text-gray-600 cursor-not-allowed'
            }`}
            style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
          >
            {selectedId ? 'Greenlight This Show' : 'Select a Script'}
          </button>
        </div>

        {/* Back to building */}
        <button
          onClick={() => setPhase('building')}
          className="w-full mt-4 py-2 text-xs text-amber-800/40 hover:text-amber-600/60 transition-colors cursor-pointer"
        >
          Back to Building
        </button>
      </div>
    </div>
  );
}
