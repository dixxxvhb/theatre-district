// End of run summary modal: shown when a show closes
import { useGameStore } from '../../store/gameStore';

function getStarRating(summary: { profit: number; averageAttendancePercent: number; totalPerformances: number }): number {
  let stars = 1;
  if (summary.averageAttendancePercent > 40) stars++;
  if (summary.averageAttendancePercent > 65) stars++;
  if (summary.profit > 0) stars++;
  if (summary.profit > 50000 && summary.totalPerformances > 10) stars++;
  return Math.min(5, stars);
}

function getCriticQuote(quality: number, showTitle: string): { quote: string; publication: string } {
  const publications = ['The New York Times', 'Broadway Beat', 'Theater Weekly', 'The Stage Review'];
  const publication = publications[Math.floor(Math.random() * publications.length)];

  if (quality > 85) {
    return {
      quote: `"A triumph. ${showTitle} is the kind of theater that reminds you why Broadway matters."`,
      publication,
    };
  }
  if (quality >= 70) {
    return {
      quote: `"Solid entertainment. ${showTitle} delivers on its promise with style and conviction."`,
      publication,
    };
  }
  if (quality >= 50) {
    return {
      quote: `"Adequate. ${showTitle} has its moments but struggles to soar beyond the expected."`,
      publication,
    };
  }
  return {
    quote: `"Unfortunately, ${showTitle} never finds its footing. A misfire on all counts."`,
    publication,
  };
}

function StarDisplay({ count }: { count: number }) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }, (_, i) => (
        <span
          key={i}
          className={`text-lg ${i < count ? 'text-amber-400' : 'text-gray-700'}`}
          style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
        >
          {i < count ? '\u2605' : '\u2606'}
        </span>
      ))}
    </div>
  );
}

export function EndOfRunModal() {
  const runSummary = useGameStore((s) => s.runSummary);
  const clearRunSummary = useGameStore((s) => s.clearRunSummary);
  const events = useGameStore((s) => s.events);

  if (!runSummary) return null;

  const isProfit = runSummary.profit >= 0;
  const stars = getStarRating(runSummary);

  // Determine quality for critic quote — approximate from attendance + profit
  const estimatedQuality = Math.min(100, Math.round(
    runSummary.averageAttendancePercent * 0.6 + (runSummary.profit > 0 ? 30 : 10) + (stars * 2)
  ));
  const critic = getCriticQuote(estimatedQuality, runSummary.showTitle);

  // Best moment: find the most positive resolved event
  const resolvedEvents = events.filter((e) => e.resolved);
  const bestEvent = resolvedEvents.length > 0
    ? resolvedEvents.reduce((best, e) => {
        const score = e.severity === 'minor' ? 1 : e.severity === 'moderate' ? 2 : 3;
        const bestScore = best.severity === 'minor' ? 1 : best.severity === 'moderate' ? 2 : 3;
        return score > bestScore ? e : best;
      })
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="w-[520px] bg-gray-950 border border-amber-900/40 rounded-xl shadow-2xl overflow-hidden end-of-run-enter">
        {/* Header */}
        <div className="p-6 bg-gradient-to-b from-amber-950/30 to-transparent border-b border-gray-800/30">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Final Curtain</p>
          <h2
            className="text-xl text-amber-200 font-bold"
            style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
          >
            {runSummary.showTitle}
          </h2>
          <div className="flex items-center gap-3 mt-2">
            <StarDisplay count={stars} />
            <span className="text-xs text-gray-500">{runSummary.runDays} day run</span>
          </div>
        </div>

        {/* Critic Quote */}
        <div className="px-6 pt-5 pb-3">
          <blockquote className="border-l-2 border-amber-700/40 pl-4">
            <p
              className="text-sm text-gray-300 italic leading-relaxed"
              style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
            >
              {critic.quote}
            </p>
            <p className="text-[10px] text-gray-500 mt-1.5 uppercase tracking-wider">
              -- {critic.publication}
            </p>
          </blockquote>
        </div>

        {/* Stats Grid */}
        <div className="px-6 pb-4 grid grid-cols-2 gap-3">
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

        {/* Best/Worst nights + Best Moment */}
        <div className="px-6 pb-4 grid grid-cols-3 gap-2">
          {runSummary.bestNight && (
            <div className="p-2.5 bg-gray-900/40 border border-gray-800/30 rounded-lg">
              <p className="text-[10px] text-gray-500 uppercase">Best Night</p>
              <p className="text-xs text-emerald-400 font-mono mt-0.5">
                ${runSummary.bestNight.revenue.toLocaleString()}
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
                ${runSummary.worstNight.revenue.toLocaleString()}
              </p>
              <p className="text-[10px] text-gray-500 mt-0.5">
                {runSummary.worstNight.attendance} attended
              </p>
            </div>
          )}
          {bestEvent && (
            <div className="p-2.5 bg-gray-900/40 border border-gray-800/30 rounded-lg">
              <p className="text-[10px] text-gray-500 uppercase">Best Moment</p>
              <p className="text-xs text-amber-300 mt-0.5 leading-tight">
                {bestEvent.title}
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
