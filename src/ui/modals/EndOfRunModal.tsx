// End of run summary modal: styled as a Broadway playbill
import { useGameStore } from '../../store/gameStore';

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
    <div className="flex items-center gap-1 justify-center">
      {Array.from({ length: 5 }, (_, i) => (
        <span
          key={i}
          className={`text-2xl ${i < count ? 'text-amber-400' : 'text-gray-700'}`}
          style={{ fontFamily: 'Georgia, serif' }}
        >
          {i < count ? '\u2605' : '\u2606'}
        </span>
      ))}
    </div>
  );
}

function getStarRating(summary: { profit: number; averageAttendancePercent: number; totalPerformances: number }): number {
  let stars = 1;
  if (summary.averageAttendancePercent > 40) stars++;
  if (summary.averageAttendancePercent > 65) stars++;
  if (summary.profit > 0) stars++;
  if (summary.profit > 50000 && summary.totalPerformances > 10) stars++;
  return Math.min(5, stars);
}

export function EndOfRunModal() {
  const runSummary = useGameStore((s) => s.runSummary);
  const clearRunSummary = useGameStore((s) => s.clearRunSummary);
  const theaterName = useGameStore((s) => s.theaterName);
  const activeShowId = useGameStore((s) => s.activeShowId);
  const tonyNominations = useGameStore((s) => s.campaign.tonyNominations);

  if (!runSummary) return null;

  const isProfit = runSummary.profit >= 0;
  const stars = getStarRating(runSummary);
  const isTonyNominated = activeShowId ? tonyNominations.includes(activeShowId) : false;

  // Determine quality for critic quote
  const estimatedQuality = Math.min(100, Math.round(
    runSummary.averageAttendancePercent * 0.6 + (runSummary.profit > 0 ? 30 : 10) + (stars * 2)
  ));
  const critic = getCriticQuote(estimatedQuality, runSummary.showTitle);

  const handleNewProduction = () => {
    useGameStore.getState().clearRunSummary();
    useGameStore.getState().setPhase('production');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="w-[480px] bg-gray-950 border-2 border-amber-800/60 rounded-sm shadow-2xl overflow-hidden end-of-run-enter">
        {/* Playbill Header */}
        <div className="bg-gradient-to-b from-amber-950/50 to-gray-950 border-b border-amber-800/40 py-8 px-6 text-center">
          <p className="text-[10px] text-amber-600 uppercase tracking-[0.3em] mb-3">The Playbill</p>
          <h2
            className="text-3xl text-amber-100 mb-2"
            style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic' }}
          >
            {runSummary.showTitle}
          </h2>
          <p className="text-xs text-gray-400" style={{ fontFamily: 'Georgia, serif' }}>
            Played at {theaterName || 'The Theater'}
          </p>
          <p className="text-[10px] text-gray-500 mt-1">
            {runSummary.totalPerformances} performances over {runSummary.runDays} days
          </p>

          {isTonyNominated && (
            <div className="inline-block mt-3 px-3 py-1 border border-amber-600 rounded-full bg-amber-900/30">
              <span className="text-[10px] text-amber-300 uppercase tracking-wider font-bold">
                Tony Nominated
              </span>
            </div>
          )}
        </div>

        {/* Critic Quote */}
        <div className="px-6 pt-5 pb-4">
          <blockquote className="border-l-2 border-amber-700/40 pl-4">
            <p
              className="text-sm text-gray-300 leading-relaxed"
              style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic' }}
            >
              {critic.quote}
            </p>
            <p className="text-[10px] text-gray-500 mt-1.5 uppercase tracking-wider">
              -- {critic.publication}
            </p>
          </blockquote>
        </div>

        {/* Critic Score as Stars */}
        <div className="px-6 pb-4 text-center">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Critic Score</p>
          <StarDisplay count={stars} />
        </div>

        {/* Revenue & Profit */}
        <div className="px-6 pb-4 grid grid-cols-2 gap-3">
          <div className="p-3 bg-gray-900/40 border border-gray-800/30 rounded-lg text-center">
            <p className="text-[10px] text-gray-500 uppercase tracking-wider">Total Revenue</p>
            <p className="text-xl font-mono font-bold text-amber-400 mt-0.5">
              ${runSummary.totalRevenue.toLocaleString()}
            </p>
          </div>
          <div className="p-3 bg-gray-900/40 border border-gray-800/30 rounded-lg text-center">
            <p className="text-[10px] text-gray-500 uppercase tracking-wider">Total Expenses</p>
            <p className="text-xl font-mono font-bold text-gray-400 mt-0.5">
              ${runSummary.totalExpenses.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Profit/Loss */}
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
              {isProfit ? '+' : '-'}${Math.abs(runSummary.profit).toLocaleString()}
            </p>
          </div>
        </div>

        {/* Attendance & Reputation */}
        <div className="px-6 pb-4 grid grid-cols-2 gap-3">
          <div className="p-2.5 bg-gray-900/40 border border-gray-800/30 rounded-lg text-center">
            <p className="text-[10px] text-gray-500 uppercase">Avg. Attendance</p>
            <p className={`text-lg font-mono font-bold mt-0.5 ${
              runSummary.averageAttendancePercent > 60 ? 'text-emerald-400' : 'text-red-400'
            }`}>
              {runSummary.averageAttendancePercent}%
            </p>
          </div>
          <div className="p-2.5 bg-gray-900/40 border border-gray-800/30 rounded-lg text-center">
            <p className="text-[10px] text-gray-500 uppercase">Reputation</p>
            <p className={`text-lg font-mono font-bold mt-0.5 ${
              runSummary.reputationChange >= 0 ? 'text-emerald-400' : 'text-red-400'
            }`}>
              {runSummary.reputationChange >= 0 ? '+' : ''}{runSummary.reputationChange}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="p-6 border-t border-gray-800/30 flex gap-3">
          <button
            onClick={clearRunSummary}
            className="flex-1 py-3 px-4 bg-gray-800/60 border border-gray-700/50 rounded-lg text-gray-300 text-sm font-medium hover:bg-gray-800 transition-all cursor-pointer"
          >
            Return to Building
          </button>
          <button
            onClick={handleNewProduction}
            className="flex-1 py-3 px-4 bg-gradient-to-r from-amber-900/60 to-amber-800/40 border border-amber-700/50 rounded-lg text-amber-200 text-sm font-medium hover:from-amber-900/80 hover:to-amber-800/60 transition-all cursor-pointer"
          >
            Start New Production
          </button>
        </div>
      </div>
    </div>
  );
}
