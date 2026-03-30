import { useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { AVAILABLE_PROPERTIES } from '../../game/data/properties';
import type { Property } from '../../types';

/** Small SVG grid preview showing lot dimensions proportionally */
function GridPreview({ width, height }: { width: number; height: number }) {
  const maxW = 120;
  const maxH = 80;
  const padding = 4;
  const availW = maxW - padding * 2;
  const availH = maxH - padding * 2;

  // Scale to fit
  const cellSize = Math.min(availW / width, availH / height);
  const gridW = width * cellSize;
  const gridH = height * cellSize;
  const offsetX = (maxW - gridW) / 2;
  const offsetY = (maxH - gridH) / 2;

  return (
    <svg width={maxW} height={maxH} className="mx-auto">
      <rect x={0} y={0} width={maxW} height={maxH} fill="#0a0a1a" rx={4} />
      {Array.from({ length: height }, (_, row) =>
        Array.from({ length: width }, (_, col) => (
          <rect
            key={`${row}-${col}`}
            x={offsetX + col * cellSize + 0.5}
            y={offsetY + row * cellSize + 0.5}
            width={cellSize - 1}
            height={cellSize - 1}
            fill="#1a1a2e"
            stroke="#2a2a4e"
            strokeWidth={0.5}
            rx={0.5}
          />
        )),
      )}
      {/* Dimension label */}
      <text
        x={maxW / 2}
        y={maxH - 3}
        textAnchor="middle"
        fill="#666"
        fontSize={8}
        fontFamily="monospace"
      >
        {width}x{height}
      </text>
    </svg>
  );
}

const CONDITION_BADGE: Record<string, { bg: string; text: string }> = {
  poor: { bg: 'bg-red-900/40 border-red-700/40', text: 'text-red-400' },
  fair: { bg: 'bg-orange-900/40 border-orange-700/40', text: 'text-orange-400' },
  good: { bg: 'bg-emerald-900/40 border-emerald-700/40', text: 'text-emerald-400' },
  excellent: { bg: 'bg-blue-900/40 border-blue-700/40', text: 'text-blue-400' },
  pristine: { bg: 'bg-purple-900/40 border-purple-700/40', text: 'text-purple-400' },
};

export function PropertySelect() {
  const cash = useGameStore((s) => s.economy.cash);
  const reputation = useGameStore((s) => s.reputation.score);
  const purchaseProperty = useGameStore((s) => s.purchaseProperty);
  const removeCash = useGameStore((s) => s.removeCash);
  const setPhase = useGameStore((s) => s.setPhase);
  const initGrid = useGameStore((s) => s.initGrid);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleSelectProperty = (property: Property) => {
    if (property.unlockReputation > reputation) return;
    if (property.cost > cash) return;
    setSelectedProperty(property);
    setShowConfirm(true);
  };

  const handleConfirmPurchase = () => {
    if (!selectedProperty) return;

    // Load properties into store
    useGameStore.setState({ properties: AVAILABLE_PROPERTIES });

    // Purchase and deduct
    purchaseProperty(selectedProperty.id);
    removeCash(selectedProperty.cost, 'property', `Purchased ${selectedProperty.name}`);

    // Initialize grid to property size
    initGrid(selectedProperty.gridSize.width, selectedProperty.gridSize.height);

    // Move to building phase
    setPhase('building');
  };

  return (
    <div className="w-full min-h-screen h-full flex flex-col bg-gray-950 overflow-auto">
      {/* Header */}
      <div className="text-center py-8 px-4">
        <h1
          className="text-3xl font-bold tracking-wider mb-2"
          style={{
            fontFamily: 'Georgia, "Times New Roman", serif',
            color: '#d4a574',
          }}
        >
          Choose Your Theater
        </h1>
        <p className="text-gray-500 text-sm">
          Select a property to begin building your theater empire
        </p>
        <div className="mt-2 text-emerald-400 font-mono text-sm">
          Budget: ${cash.toLocaleString()}
        </div>
      </div>

      {/* Property cards */}
      <div className="flex-1 flex flex-wrap justify-center gap-5 px-6 pb-8">
        {AVAILABLE_PROPERTIES.map((property) => {
          const locked = property.unlockReputation > reputation;
          const tooExpensive = property.cost > cash;
          const disabled = locked || tooExpensive;
          const isStarter = property.id === 'dusty_loft';
          const badge = CONDITION_BADGE[property.condition];
          const hasLocationBonus = property.locationBonus.attendance > 0 || property.locationBonus.ticketPrice > 0;

          return (
            <div
              key={property.id}
              onClick={() => !disabled && handleSelectProperty(property)}
              className={`w-72 rounded-xl border p-5 transition-all flex flex-col relative ${
                disabled
                  ? 'border-gray-800/40 bg-gray-900/30 opacity-50 cursor-not-allowed'
                  : 'border-amber-900/40 bg-gray-900/70 hover:border-amber-600/60 hover:bg-gray-900/90 cursor-pointer hover:shadow-lg hover:shadow-amber-900/10'
              }`}
            >
              {/* Starter badge */}
              {isStarter && !disabled && (
                <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-emerald-900/60 border border-emerald-700/50 rounded-full text-emerald-300 text-[9px] uppercase tracking-wider font-semibold whitespace-nowrap">
                  Recommended for Beginners
                </div>
              )}

              {/* Locked overlay */}
              {locked && (
                <div className="absolute inset-0 rounded-xl bg-gray-950/60 flex flex-col items-center justify-center z-10">
                  <span className="text-gray-500 text-2xl mb-1">[Locked]</span>
                  <span className="text-gray-600 text-xs">Requires {property.unlockReputation} Reputation</span>
                </div>
              )}

              {/* Name */}
              <h3
                className="text-lg font-bold mb-0.5"
                style={{
                  fontFamily: 'Georgia, "Times New Roman", serif',
                  color: disabled ? '#666' : '#d4a574',
                }}
              >
                {property.name}
              </h3>

              <p className="text-gray-600 text-xs mb-3">{property.address}</p>

              {/* Price — prominent */}
              <div className="text-center mb-3">
                <span
                  className={`text-xl font-bold font-mono ${tooExpensive ? 'text-red-400' : ''}`}
                  style={{ color: tooExpensive ? undefined : '#d4a574' }}
                >
                  ${property.cost.toLocaleString()}
                </span>
              </div>

              {/* Grid Preview */}
              <div className="mb-3">
                <GridPreview width={property.gridSize.width} height={property.gridSize.height} />
              </div>

              {/* Condition badge + Max seats */}
              <div className="flex items-center justify-between mb-3">
                {badge && (
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border ${badge.bg} ${badge.text}`}
                  >
                    {property.condition}
                  </span>
                )}
                <span className="text-gray-400 text-xs font-mono">
                  {property.maxSeats.toLocaleString()} seats max
                </span>
              </div>

              {/* Location bonus pills */}
              {hasLocationBonus && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {property.locationBonus.attendance > 0 && (
                    <span className="px-2 py-0.5 bg-emerald-900/30 border border-emerald-800/40 rounded-full text-emerald-400 text-[10px] font-mono">
                      +{Math.round(property.locationBonus.attendance * 100)}% attendance
                    </span>
                  )}
                  {property.locationBonus.ticketPrice > 0 && (
                    <span className="px-2 py-0.5 bg-emerald-900/30 border border-emerald-800/40 rounded-full text-emerald-400 text-[10px] font-mono">
                      +{Math.round(property.locationBonus.ticketPrice * 100)}% tickets
                    </span>
                  )}
                </div>
              )}

              {/* Build cost modifier */}
              <div className="flex justify-between text-xs border-t border-gray-800/40 pt-2">
                <span className="text-gray-600">Build Cost</span>
                <span className={property.constructionCostModifier > 1 ? 'text-red-400' : property.constructionCostModifier < 1 ? 'text-emerald-400' : 'text-gray-400'}>
                  {property.constructionCostModifier > 1 ? '+' : ''}
                  {Math.round((property.constructionCostModifier - 1) * 100)}%
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Confirmation dialog */}
      {showConfirm && selectedProperty && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-gray-900/95 border border-amber-900/40 rounded-xl p-6 max-w-sm w-full mx-4 shadow-2xl">
            <h3
              className="text-xl font-bold mb-4"
              style={{
                fontFamily: 'Georgia, "Times New Roman", serif',
                color: '#d4a574',
              }}
            >
              Confirm Purchase
            </h3>

            <div className="space-y-2 text-sm mb-4">
              <div className="flex justify-between">
                <span className="text-gray-400">Property</span>
                <span className="text-amber-200">{selectedProperty.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Cost</span>
                <span className="text-red-400">
                  -${selectedProperty.cost.toLocaleString()}
                </span>
              </div>
              <div className="border-t border-gray-800 pt-2 flex justify-between font-semibold">
                <span className="text-gray-400">Remaining Cash</span>
                <span className="text-emerald-400">
                  ${(cash - selectedProperty.cost).toLocaleString()}
                </span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmPurchase}
                className="flex-1 py-2 bg-amber-900/50 hover:bg-amber-800/60 border border-amber-700/50 text-amber-200 rounded-lg transition-colors cursor-pointer"
              >
                Purchase
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
