import { useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { MarketingPanel } from './MarketingPanel';
import { RivalTicker } from '../components/RivalTicker';

const GENRE_COLORS: Record<string, string> = {
  musical: 'bg-purple-900/40 text-purple-300 border-purple-700/40',
  play: 'bg-blue-900/40 text-blue-300 border-blue-700/40',
  revival: 'bg-amber-900/40 text-amber-300 border-amber-700/40',
  experimental: 'bg-rose-900/40 text-rose-300 border-rose-700/40',
  one_person_show: 'bg-teal-900/40 text-teal-300 border-teal-700/40',
};

const GENRE_LABELS: Record<string, string> = {
  musical: 'Musical',
  play: 'Play',
  revival: 'Revival',
  experimental: 'Experimental',
  one_person_show: 'Solo',
};

function getPriceSensitivity(ticketPrice: number, quality: number, buzz: number): { label: string; color: string } {
  const sweetSpot = 40 + (quality * 0.6) + (buzz * 0.2);
  const diff = ticketPrice - sweetSpot;
  if (diff < -15) return { label: 'Underpriced', color: 'text-blue-400' };
  if (diff > 20) return { label: 'Overpriced', color: 'text-red-400' };
  return { label: 'Sweet Spot', color: 'text-emerald-400' };
}

export function RunDashboard() {
  const shows = useGameStore((s) => s.shows);
  const activeShowId = useGameStore((s) => s.activeShowId);
  const performanceHistory = useGameStore((s) => s.performanceHistory);
  const ticketPrice = useGameStore((s) => s.ticketPrice);
  const setTicketPrice = useGameStore((s) => s.setTicketPrice);
  const runDay = useGameStore((s) => s.runDay);
  const events = useGameStore((s) => s.events);
  const closeShow = useGameStore((s) => s.closeShow);
  const activeMarketingCampaigns = useGameStore((s) => s.activeMarketingCampaigns);
  const activeShow = shows.find((s) => s.id === activeShowId);
  const day = useGameStore((s) => s.time.day);
  const [showMarketingModal, setShowMarketingModal] = useState(false);

  if (!activeShow?.isRunning) return null;

  // Is today a dark day? (Monday = day % 7 === 1, using 0-indexed)
  const dayOfWeek = day % 7;
  const isDarkDay = dayOfWeek === 1; // Monday

  // Latest performance for "tonight"
  const latestPerf = performanceHistory.length > 0 ? performanceHistory[performanceHistory.length - 1] : null;

  // Totals
  const totalRevenue = performanceHistory.reduce((s, p) => s + p.revenue, 0);
  const totalExpenses = performanceHistory.reduce((s, p) => s + p.expenses, 0);
  const totalProfit = totalRevenue - totalExpenses;
  const avgAttendance = performanceHistory.length > 0
    ? performanceHistory.reduce((s, p) => s + (p.capacity > 0 ? p.attendance / p.capacity : 0), 0) / performanceHistory.length * 100
    : 0;

  // Recent events
  const recentEvents = events.filter((e) => e.resolved).slice(-3).reverse();

  // Quality bar color
  const qualityColor = activeShow.quality > 75 ? 'from-emerald-500 to-emerald-300'
    : activeShow.quality > 50 ? 'from-amber-500 to-amber-300'
    : 'from-red-500 to-red-400';

  // Buzz bar color
  const buzzColor = activeShow.buzzScore > 66 ? 'from-amber-500 to-yellow-300'
    : activeShow.buzzScore > 33 ? 'from-orange-500 to-amber-400'
    : 'from-red-600 to-orange-500';

  const priceSensitivity = getPriceSensitivity(ticketPrice, activeShow.quality, activeShow.buzzScore);

  // Close show handler
  const handleCloseShow = () => {
    if (!confirm('Are you sure you want to close this show?')) return;

    const sorted = [...performanceHistory].sort((a, b) => a.profit - b.profit);
    const bestNight = sorted.length > 0 ? sorted[sorted.length - 1] : null;
    const worstNight = sorted.length > 0 ? sorted[0] : null;

    const repChange = avgAttendance > 60
      ? Math.round(10 * (avgAttendance / 100))
      : -5;

    closeShow(activeShow.id, {
      showTitle: activeShow.title,
      totalPerformances: performanceHistory.length,
      totalRevenue,
      totalExpenses,
      profit: totalProfit,
      averageAttendancePercent: Math.round(avgAttendance),
      bestNight,
      worstNight,
      reputationChange: repChange,
      runDays: runDay,
    });
  };

  const genreStyle = GENRE_COLORS[activeShow.genre] ?? 'bg-gray-800/40 text-gray-300 border-gray-700/40';

  return (
    <>
      <div className="w-80 min-w-[320px] h-full bg-gray-950/95 border-l border-amber-900/30 flex flex-col overflow-y-auto run-dashboard-enter">
        {/* Section 1: Show Info */}
        <div className="p-4 border-b border-amber-800/20">
          <h2
            className="text-amber-200 text-sm font-bold tracking-wide"
            style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
          >
            {activeShow.title}
          </h2>
          <div className="flex items-center gap-2 mt-1.5">
            <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border ${genreStyle}`}>
              {GENRE_LABELS[activeShow.genre] ?? activeShow.genre}
            </span>
            <span className="text-xs text-gray-500">Day {runDay} of run</span>
          </div>

          {/* Quality meter */}
          <div className="mt-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-gray-500 uppercase tracking-wider">Quality</span>
              <span className="text-xs font-mono text-gray-300">{activeShow.quality}</span>
            </div>
            <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
              <div className={`h-full bg-gradient-to-r ${qualityColor} rounded-full transition-all`} style={{ width: `${activeShow.quality}%` }} />
            </div>
          </div>

          {/* Buzz meter */}
          <div className="mt-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-gray-500 uppercase tracking-wider">Buzz</span>
              <span className="text-xs font-mono text-gray-300">{Math.round(activeShow.buzzScore)}</span>
            </div>
            <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
              <div className={`h-full bg-gradient-to-r ${buzzColor} rounded-full transition-all`} style={{ width: `${activeShow.buzzScore}%` }} />
            </div>
          </div>
        </div>

        {/* Section 2: Tonight's Performance */}
        <div className="p-4 border-b border-amber-800/20">
          <h3 className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">
            {isDarkDay ? 'Dark Day' : "Tonight's Performance"}
          </h3>
          {isDarkDay ? (
            <p className="text-xs text-gray-600 italic">No Performance (Monday)</p>
          ) : latestPerf ? (
            <div className="space-y-2">
              {/* Attendance bar */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-400">Attendance</span>
                  <span className="text-xs font-mono text-gray-300">
                    {latestPerf.attendance}/{latestPerf.capacity}
                    <span className="text-gray-500 ml-1">
                      ({latestPerf.capacity > 0 ? Math.round(latestPerf.attendance / latestPerf.capacity * 100) : 0}%)
                    </span>
                  </span>
                </div>
                <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-amber-600 to-amber-400 rounded-full transition-all"
                    style={{ width: `${latestPerf.capacity > 0 ? (latestPerf.attendance / latestPerf.capacity * 100) : 0}%` }}
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <p className="text-[10px] text-gray-600">Revenue</p>
                  <p className="text-xs font-mono text-emerald-400">${latestPerf.revenue.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-600">Expenses</p>
                  <p className="text-xs font-mono text-red-400">${latestPerf.expenses.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-600">Profit</p>
                  <p className={`text-xs font-mono font-bold ${latestPerf.profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {latestPerf.profit >= 0 ? '+' : ''}${latestPerf.profit.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-xs text-gray-600 italic">Awaiting first performance...</p>
          )}
        </div>

        {/* Section 3: Run Totals */}
        <div className="p-4 border-b border-amber-800/20">
          <h3 className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">Run Totals</h3>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">Performances</span>
              <span className="text-xs font-mono text-gray-300 text-right">{performanceHistory.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">Total Revenue</span>
              <span
                className="text-sm font-mono font-bold text-right"
                style={{ color: '#d4a843' }}
              >
                ${totalRevenue.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">Total Expenses</span>
              <span className="text-xs font-mono text-red-400 text-right">${totalExpenses.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between pt-1 border-t border-gray-800/30">
              <span className="text-xs text-gray-400 font-medium">Net Profit</span>
              <span className={`text-sm font-mono font-bold text-right ${totalProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {totalProfit >= 0 ? '+' : ''}${totalProfit.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">Avg Attendance</span>
              <span className={`text-xs font-mono text-right ${avgAttendance > 60 ? 'text-emerald-400' : avgAttendance > 40 ? 'text-amber-400' : 'text-red-400'}`}>
                {Math.round(avgAttendance)}%
              </span>
            </div>
          </div>
        </div>

        {/* Section 4: Ticket Pricing */}
        <div className="p-4 border-b border-amber-800/20">
          <h3 className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">Ticket Pricing</h3>
          <div className="flex items-center justify-between mb-2">
            <button
              onClick={() => setTicketPrice(ticketPrice - 5)}
              className="w-8 h-8 flex items-center justify-center rounded bg-gray-800/60 border border-gray-700/40 text-gray-300 hover:bg-gray-700/60 hover:text-white transition-colors cursor-pointer text-sm font-mono"
            >
              -
            </button>
            <span className="text-xl font-mono text-amber-200 font-bold">${ticketPrice}</span>
            <button
              onClick={() => setTicketPrice(ticketPrice + 5)}
              className="w-8 h-8 flex items-center justify-center rounded bg-gray-800/60 border border-gray-700/40 text-gray-300 hover:bg-gray-700/60 hover:text-white transition-colors cursor-pointer text-sm font-mono"
            >
              +
            </button>
          </div>
          <div className="flex items-center justify-center">
            <span className={`text-[10px] uppercase tracking-wider ${priceSensitivity.color}`}>
              {priceSensitivity.label}
            </span>
          </div>
          <input
            type="range"
            min={20}
            max={150}
            step={5}
            value={ticketPrice}
            onChange={(e) => setTicketPrice(Number(e.target.value))}
            className="w-full accent-amber-500 mt-2"
          />
          <div className="flex justify-between text-[10px] text-gray-700 mt-0.5">
            <span>$20</span>
            <span>$150</span>
          </div>
        </div>

        {/* Section 5: Active Marketing */}
        <div className="p-4 border-b border-amber-800/20">
          <h3 className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">Active Marketing</h3>
          {activeMarketingCampaigns.length === 0 ? (
            <p className="text-xs text-gray-600 italic mb-2">No active campaigns</p>
          ) : (
            <div className="space-y-1.5 mb-2">
              {activeMarketingCampaigns.map((c) => (
                <div key={c.id} className="flex items-center justify-between text-xs py-1 px-2 bg-gray-900/40 rounded">
                  <span className="text-gray-300 truncate">{c.label}</span>
                  <span className="text-gray-500 font-mono ml-2">{c.daysRemaining}d</span>
                </div>
              ))}
            </div>
          )}
          <button
            onClick={() => setShowMarketingModal(true)}
            className="w-full py-2 px-3 bg-amber-950/30 border border-amber-800/30 rounded text-amber-300 text-xs hover:bg-amber-950/50 transition-colors cursor-pointer"
          >
            Launch Campaign
          </button>
        </div>

        {/* Section 6: Recent Events */}
        <div className="p-4 border-b border-amber-800/20">
          <h3 className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">Recent Events</h3>
          {recentEvents.length === 0 ? (
            <p className="text-xs text-gray-600 italic">No events yet</p>
          ) : (
            <div className="space-y-1">
              {recentEvents.map((e) => {
                const sevColor = e.severity === 'major' ? 'text-red-400' : e.severity === 'moderate' ? 'text-amber-400' : 'text-emerald-400';
                return (
                  <div key={e.id} className="text-xs py-0.5">
                    <span className={`${sevColor} mr-1`}>{'\u2022'}</span>
                    <span className="text-gray-400">{e.title}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Rival Ticker */}
        <RivalTicker />

        {/* Close Show */}
        <div className="p-4 mt-auto">
          <button
            onClick={handleCloseShow}
            className="w-full py-2.5 px-4 bg-red-950/30 border border-red-800/40 rounded-lg text-red-300 text-xs font-medium hover:bg-red-950/50 transition-all cursor-pointer"
          >
            Close Show
          </button>
        </div>
      </div>

      {/* Marketing modal overlay */}
      {showMarketingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="relative w-[380px] max-h-[80vh] overflow-y-auto bg-gray-950 border border-amber-900/30 rounded-xl shadow-2xl">
            <div className="flex items-center justify-between p-3 border-b border-gray-800/30">
              <h3
                className="text-sm text-amber-200 font-bold"
                style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
              >
                Launch Campaign
              </h3>
              <button
                onClick={() => setShowMarketingModal(false)}
                className="text-gray-500 hover:text-gray-300 text-lg cursor-pointer px-2"
              >
                x
              </button>
            </div>
            <MarketingPanel />
          </div>
        </div>
      )}
    </>
  );
}
