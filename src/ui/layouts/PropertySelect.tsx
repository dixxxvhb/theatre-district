import { useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { AVAILABLE_PROPERTIES } from '../../game/data/properties';
import type { Property } from '../../types';

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

  const conditionColors: Record<string, string> = {
    poor: 'text-red-400',
    fair: 'text-yellow-400',
    good: 'text-emerald-400',
    excellent: 'text-blue-400',
    pristine: 'text-purple-400',
  };

  const lotLabels: Record<string, string> = {
    small: 'Small Lot',
    medium: 'Medium Lot',
    large: 'Large Lot',
  };

  return (
    <div className="w-full h-full flex flex-col bg-gray-950 overflow-auto">
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
      <div className="flex-1 flex flex-wrap justify-center gap-4 px-6 pb-8">
        {AVAILABLE_PROPERTIES.map((property) => {
          const locked = property.unlockReputation > reputation;
          const tooExpensive = property.cost > cash;
          const disabled = locked || tooExpensive;

          return (
            <div
              key={property.id}
              onClick={() => !disabled && handleSelectProperty(property)}
              className={`w-72 rounded-xl border p-5 transition-all flex flex-col ${
                disabled
                  ? 'border-gray-800/40 bg-gray-900/30 opacity-50 cursor-not-allowed'
                  : 'border-amber-900/40 bg-gray-900/70 hover:border-amber-600/60 hover:bg-gray-900/90 cursor-pointer hover:shadow-lg hover:shadow-amber-900/10'
              }`}
            >
              {/* Name + lock icon */}
              <div className="flex items-start justify-between mb-1">
                <h3
                  className="text-lg font-bold"
                  style={{
                    fontFamily: 'Georgia, "Times New Roman", serif',
                    color: disabled ? '#666' : '#d4a574',
                  }}
                >
                  {property.name}
                </h3>
                {locked && (
                  <span className="text-gray-600 text-lg" title={`Requires ${property.unlockReputation} reputation`}>
                    [Locked]
                  </span>
                )}
              </div>

              <p className="text-gray-500 text-xs mb-3">{property.address}</p>

              {/* Stats */}
              <div className="space-y-1.5 text-sm flex-1">
                <div className="flex justify-between">
                  <span className="text-gray-500">Price</span>
                  <span className={tooExpensive ? 'text-red-400' : 'text-amber-200'}>
                    ${property.cost.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Lot Size</span>
                  <span className="text-gray-300">{lotLabels[property.lot]}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Grid</span>
                  <span className="text-gray-300">
                    {property.gridSize.width} x {property.gridSize.height}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Condition</span>
                  <span className={conditionColors[property.condition] ?? 'text-gray-300'}>
                    {property.condition.charAt(0).toUpperCase() + property.condition.slice(1)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Max Seats</span>
                  <span className="text-gray-300">{property.maxSeats.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Build Cost Mod</span>
                  <span className={property.constructionCostModifier > 1 ? 'text-red-400' : property.constructionCostModifier < 1 ? 'text-emerald-400' : 'text-gray-300'}>
                    {property.constructionCostModifier > 1 ? '+' : ''}
                    {Math.round((property.constructionCostModifier - 1) * 100)}%
                  </span>
                </div>
                {(property.locationBonus.attendance > 0 || property.locationBonus.ticketPrice > 0) && (
                  <div className="pt-1 border-t border-gray-800">
                    {property.locationBonus.attendance > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Attendance</span>
                        <span className="text-emerald-400">
                          +{Math.round(property.locationBonus.attendance * 100)}%
                        </span>
                      </div>
                    )}
                    {property.locationBonus.ticketPrice > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Ticket Price</span>
                        <span className="text-emerald-400">
                          +{Math.round(property.locationBonus.ticketPrice * 100)}%
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Reputation requirement */}
              {locked && (
                <div className="mt-3 text-center text-xs text-gray-600">
                  Requires {property.unlockReputation} Reputation
                </div>
              )}
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
