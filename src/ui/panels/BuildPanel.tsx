import { useGameStore } from '../../store/gameStore';
import { ROOM_DEFINITIONS, REQUIRED_ROOMS } from '../../game/data/rooms';
import type { RoomType, RoomDefinition } from '../../types';

const ROOM_LIST: RoomDefinition[] = Object.values(ROOM_DEFINITIONS);

// Required rooms that must be built before opening
const MVT_ROOMS: RoomType[] = ['lobby', 'box_office', 'seating', 'stage', 'backstage'];

export function BuildPanel() {
  const selectedRoomType = useGameStore((s) => s.ui.selectedRoomType);
  const selectRoomType = useGameStore((s) => s.selectRoomType);
  const setPhase = useGameStore((s) => s.setPhase);
  const properties = useGameStore((s) => s.properties);
  const activePropertyId = useGameStore((s) => s.activePropertyId);
  const cash = useGameStore((s) => s.economy.cash);
  const isRenovating = useGameStore((s) => s.ui.isRenovating);

  const activeProperty = properties.find((p) => p.id === activePropertyId);
  const costModifier = activeProperty?.constructionCostModifier ?? 1;
  const builtRoomTypes = new Set(
    (activeProperty?.rooms ?? [])
      .filter((r) => !r.isConstructing)
      .map((r) => r.type),
  );
  const allRoomTypes = new Set(
    (activeProperty?.rooms ?? []).map((r) => r.type),
  );

  // Check if all MVT rooms are built (not just placed, but finished construction)
  const mvtComplete = MVT_ROOMS.every((rt) => builtRoomTypes.has(rt));
  // Check if all MVT rooms are at least placed (may be constructing)
  const mvtPlaced = MVT_ROOMS.every((rt) => allRoomTypes.has(rt));

  const handleDoneBuilding = () => {
    if (!mvtComplete) return;
    setPhase('production');
  };

  const handleSelectRoom = (type: RoomType) => {
    if (selectedRoomType === type) {
      selectRoomType(null);
    } else {
      selectRoomType(type);
    }
  };

  const handleCancel = () => {
    selectRoomType(null);
  };

  return (
    <div className="w-72 min-w-[288px] h-full bg-gray-950/95 backdrop-blur-sm border-l border-amber-900/30 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-3 border-b border-amber-900/20">
        <h2
          className="text-lg font-bold tracking-wide"
          style={{
            fontFamily: 'Georgia, "Times New Roman", serif',
            color: '#d4a574',
          }}
        >
          {isRenovating ? 'Renovate' : 'Build Mode'}
        </h2>
        <p className="text-gray-500 text-xs mt-1">
          {isRenovating ? 'Rush pricing: 1.5x cost' : 'Click to place, or drag to resize'}
        </p>
      </div>

      {/* MVT Checklist */}
      <div className="p-3 border-b border-amber-900/20">
        <div className="text-xs text-gray-400 uppercase tracking-wider mb-2">
          Minimum Viable Theater
        </div>
        <div className="grid grid-cols-1 gap-1">
          {MVT_ROOMS.map((rt) => {
            const def = ROOM_DEFINITIONS[rt];
            const isBuilt = builtRoomTypes.has(rt);
            const isPlaced = allRoomTypes.has(rt);
            return (
              <div key={rt} className="flex items-center gap-2 text-xs">
                <span
                  className={
                    isBuilt
                      ? 'text-emerald-400'
                      : isPlaced
                        ? 'text-yellow-400'
                        : 'text-gray-600'
                  }
                >
                  {isBuilt ? '[+]' : isPlaced ? '[~]' : '[ ]'}
                </span>
                <span
                  className={
                    isBuilt
                      ? 'text-emerald-300'
                      : isPlaced
                        ? 'text-yellow-300'
                        : 'text-gray-500'
                  }
                >
                  {def.name}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Room list */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {ROOM_LIST.map((room) => {
          const rushMultiplier = isRenovating ? 1.5 : 1;
          const adjustedCost = Math.round(room.baseCost * costModifier * rushMultiplier);
          const canAfford = cash >= adjustedCost;
          const isSelected = selectedRoomType === room.type;
          const isRequired = REQUIRED_ROOMS.includes(room.type);

          return (
            <button
              key={room.type}
              onClick={() => handleSelectRoom(room.type)}
              className={`w-full text-left p-2.5 rounded-lg transition-all cursor-pointer border ${
                isSelected
                  ? 'border-amber-600/60 bg-amber-900/30'
                  : 'border-transparent hover:border-gray-700/50 hover:bg-gray-900/50'
              }`}
            >
              <div className="flex items-center gap-2">
                {/* Color swatch */}
                <div
                  className="w-4 h-4 rounded-sm flex-shrink-0"
                  style={{ backgroundColor: room.color }}
                />
                <span
                  className={`text-sm font-medium flex-1 ${
                    isSelected ? 'text-amber-200' : 'text-gray-300'
                  }`}
                >
                  {room.name}
                  {isRequired && (
                    <span className="text-amber-500 ml-1" title="Required">
                      *
                    </span>
                  )}
                </span>
              </div>

              <div className="flex items-center gap-3 mt-1 ml-6 text-xs">
                <span className={canAfford ? 'text-gray-400' : 'text-red-400'}>
                  ${adjustedCost.toLocaleString()}
                </span>
                <span className="text-gray-600">
                  {room.buildDays}d
                </span>
                <span className="text-gray-600" title={`Min ${room.minSize.width}x${room.minSize.height}, default ${room.defaultSize.width}x${room.defaultSize.height}`}>
                  {room.minSize.width}x{room.minSize.height}–{room.defaultSize.width}x{room.defaultSize.height}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Cancel / Done — always visible at bottom */}
      <div className="flex-shrink-0 p-3 border-t border-amber-900/20 space-y-2">
        {selectedRoomType && (
          <>
            <button
              onClick={handleCancel}
              className="w-full py-2 text-sm bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors cursor-pointer"
            >
              Cancel Placement
            </button>
            <div className="flex items-center justify-center gap-3 text-[10px] text-gray-600">
              <span>
                <span className="inline-block bg-gray-800 border border-gray-600 rounded px-1 py-px font-mono text-gray-400">Esc</span> to cancel
              </span>
              <span>
                <span className="inline-block bg-gray-800 border border-gray-600 rounded px-1 py-px font-mono text-gray-400">Right-click</span> to cancel
              </span>
            </div>
          </>
        )}

        {!isRenovating && (
          <button
            onClick={handleDoneBuilding}
            disabled={!mvtComplete}
            className={`w-full py-2.5 text-sm font-semibold rounded-lg transition-all cursor-pointer border ${
              mvtComplete
                ? 'bg-emerald-900/40 border-emerald-700/50 text-emerald-200 hover:bg-emerald-900/60'
                : 'bg-gray-900/40 border-gray-800/40 text-gray-600 cursor-not-allowed'
            }`}
          >
            {mvtComplete
              ? 'Done Building →'
              : mvtPlaced
                ? 'Finish Construction First'
                : 'Build Required Rooms'}
          </button>
        )}
      </div>
    </div>
  );
}
