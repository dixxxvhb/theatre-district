// End of run summary modal: shown when a show closes
import { useGameStore } from '../../store/gameStore';

export function EndOfRunModal() {
  const runSummary = useGameStore((s) => s.runSummary);
  const clearRunSummary = useGameStore((s) => s.clearRunSummary);

  if (!runSummary) return null;

  const isProfit = runSummary.profit >= 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="w-[480px] bg-gray-950 border border-amber-900/40 rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-6 bg-gradient-to-b from-amber-950/30 to-transparent border-b border-gray-800/30">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Final Curtain</p>
          <h2
            className="text-xl text-amber-200 font-bold"
            style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
          >
            {runSummary.showTitle}
          </h2>
          <p className="text-xs text-gray-400 mt-1">{runSummary.runDays} day run</p>
        </div>

        {/* Stats Grid */}
        <div className="p-6 grid grid-cols-2 gap-4">
          <StatBox label="Performances" value={runSummary.totalPerformances.toString()} />
          <StatBox
            label="Avg. Attendance"
            value={`${runSummary.averageAttendancePercent}%`}
            color={runSummary.averageAttendancePercent > 60 ? 'text-emerald-400' : 'text-red-400'}
          />
          <StatBox
            label="Total Revenue"
            value={`$${runSummary.totalRevenue.toLocaleString()}`}
            color="text-emerald-400"
          />
          <StatBox
            label="Total Expenses"
            value={`$${runSummary.totalExpenses.toLocaleString()}`}
            color="text-red-400"
          />
        </div>

        {/* Profit line */}
        <div className="px-6 pb-4">
          <div className={`text-center p-3 rounded-lg border ${
            isProfit
              ? 'bg-emerald-950/20 border-emerald-800/40'
              : 'bg-red-950/20 border-red-800/40'
          }`}>
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">
              {isProfit ? 'Profit' : 'Loss'}
            </p>
            <p className={`text-2xl font-mono font-bold ${isProfit ? 'text-emerald-400' : 'text-red-400'}`}>
              {isProfit ? '+' : ''}{runSummary.profit < 0 ? '-' : ''}${Math.abs(runSummary.profit).toLocaleString()}
            </p>
          </div>
        </div>

        {/* Best/Worst nights */}
        <div className="px-6 pb-4 grid grid-cols-2 gap-3">
          {runSummary.bestNight && (
            <div className="p-2.5 bg-gray-900/40 border border-gray-800/30 rounded-lg">
              <p className="text-[10px] text-gray-500 uppercase">Best Night</p>
              <p className="text-xs text-emerald-400 font-mono mt-0.5">
                ${runSummary.bestNight.revenue.toLocaleString()} rev
              </p>
              <p className="text-[10px] text-gray-500 mt-0.5">
                {runSummary.bestNight.attendance} attended
              </p>
            </div>
          )}
          {runSummary.worstNight && (
            <div className="p-2.5 bg-gray-900/40 border border-gray-800/30 rounded-lg">
              <p className="text-[10px] text-gray-500 uppercase">Worst Night</p>
              <p className="text-xs text-red-400 font-mono mt-0.5">
                ${runSummary.worstNight.revenue.toLocaleString()} rev
              </p>
              <p className="text-[10px] text-gray-500 mt-0.5">
                {runSummary.worstNight.attendance} attended
              </p>
            </div>
          )}
        </div>

        {/* Reputation */}
        <div className="px-6 pb-4">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-400">Reputation Change</span>
            <span className={runSummary.reputationChange >= 0 ? 'text-emerald-400' : 'text-red-400'}>
              {runSummary.reputationChange >= 0 ? '+' : ''}{runSummary.reputationChange}
            </span>
          </div>
        </div>

        {/* Action */}
        <div className="p-6 border-t border-gray-800/30">
          <button
            onClick={clearRunSummary}
            className="w-full py-3 px-4 bg-gradient-to-r from-amber-900/60 to-amber-800/40 border border-amber-700/50 rounded-lg text-amber-200 text-sm font-medium hover:from-amber-900/80 hover:to-amber-800/60 transition-all cursor-pointer"
          >
            Back to Building
          </button>
        </div>
      </div>
    </div>
  );
}

function StatBox({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="p-3 bg-gray-900/40 border border-gray-800/30 rounded-lg">
      <p className="text-[10px] text-gray-500 uppercase tracking-wider">{label}</p>
      <p className={`text-lg font-mono font-bold mt-0.5 ${color ?? 'text-gray-200'}`}>{value}</p>
    </div>
  );
}
