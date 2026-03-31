import { useGameStore } from '../../store/gameStore';

export function RivalTicker() {
  const rivals = useGameStore((s) => s.rivals);
  const activeRivals = rivals.filter((r) => r.active);

  if (activeRivals.length === 0) return null;

  return (
    <div className="border-t border-gray-800/50 p-2">
      <div className="text-[10px] text-purple-400 uppercase tracking-wider mb-1">Competition</div>
      <div className="space-y-1">
        {activeRivals.map((rival) => (
          <div key={rival.id} className="text-[10px] text-gray-400 flex items-center justify-between">
            <span className="text-purple-300 truncate mr-2">{rival.name}</span>
            {rival.currentShow ? (
              <span className="text-gray-500">
                "{rival.currentShow.title}" — {rival.currentShow.attendance}%
              </span>
            ) : (
              <span className="text-gray-600 italic">between shows</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
