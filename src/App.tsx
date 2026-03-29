import { useEffect, useCallback, useState, useRef } from 'react';
import { useGameStore } from './store/gameStore';
import { GameCanvas } from './game/canvas/GameCanvas';
import { MainMenu } from './ui/layouts/MainMenu';
import { PropertySelect } from './ui/layouts/PropertySelect';
import { BuildPanel } from './ui/panels/BuildPanel';
import { StaffPanel } from './ui/panels/StaffPanel';
import { MarketingPanel } from './ui/panels/MarketingPanel';
import { ShowPickerModal } from './ui/modals/ShowPickerModal';
import { AuditionModal } from './ui/modals/AuditionModal';
import { EventModal } from './ui/modals/EventModal';
import { EndOfRunModal } from './ui/modals/EndOfRunModal';
import { SaveLoadModal } from './ui/modals/SaveLoadModal';
import { MoneyDisplay } from './ui/components/MoneyDisplay';
import { NotificationToast } from './ui/components/NotificationToast';
import { getFormattedDate } from './game/engine/TimeManager';
import { saveGame, AUTOSAVE_INTERVAL_MS, AUTOSAVE_SLOT_ID } from './store/saveManager';
import type { SpeedSetting, GamePhase } from './types';

const SPEED_OPTIONS: { value: SpeedSetting; label: string }[] = [
  { value: 'paused', label: '||' },
  { value: 'normal', label: '1x' },
  { value: 'fast', label: '2x' },
  { value: 'ultra', label: '4x' },
];

const PHASE_LABELS: Record<string, string> = {
  building: 'Build',
  production: 'Show & Crew',
  audition: 'Audition',
  rehearsal: 'Rehearsal',
  running: 'Running',
  summary: 'Summary',
};

const PHASE_FLOW: GamePhase[] = ['building', 'production', 'audition', 'rehearsal', 'running'];

function PhaseBreadcrumb() {
  const currentPhase = useGameStore((s) => s.ui.currentPhase);
  const idx = PHASE_FLOW.indexOf(currentPhase);
  if (idx < 0) return null;

  return (
    <div className="flex items-center gap-1 px-4 py-1.5 bg-gray-950/60 border-b border-gray-800/30">
      {PHASE_FLOW.map((phase, i) => {
        const isActive = phase === currentPhase;
        const isPast = i < idx;
        return (
          <div key={phase} className="flex items-center">
            {i > 0 && (
              <span className={`mx-1.5 text-[10px] ${isPast ? 'text-gray-600' : 'text-gray-800'}`}>
                &rsaquo;
              </span>
            )}
            <span
              className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full transition-all ${
                isActive
                  ? 'bg-amber-900/40 text-amber-300 border border-amber-700/40'
                  : isPast
                    ? 'text-emerald-600'
                    : 'text-gray-700'
              }`}
            >
              {PHASE_LABELS[phase] ?? phase}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function TopBar({ onMenuClick }: { onMenuClick: () => void }) {
  const theaterName = useGameStore((s) => s.theaterName);
  const day = useGameStore((s) => s.time.day);
  const speed = useGameStore((s) => s.time.speed);
  const isPaused = useGameStore((s) => s.time.isPaused);
  const currentPhase = useGameStore((s) => s.ui.currentPhase);
  const viewMode = useGameStore((s) => s.ui.viewMode);
  const setViewMode = useGameStore((s) => s.setViewMode);
  const setSpeed = useGameStore((s) => s.setSpeed);
  const togglePause = useGameStore((s) => s.togglePause);

  const dateStr = getFormattedDate(day);
  const phaseLabel = PHASE_LABELS[currentPhase] ?? currentPhase;

  return (
    <div className="h-12 bg-gray-950/90 border-b border-amber-900/30 flex items-center justify-between px-4 backdrop-blur-sm z-10 relative">
      <div className="flex items-center gap-4">
        <h1
          className="text-amber-200 text-lg tracking-wide"
          style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
        >
          {theaterName || 'Broadway Tycoon'}
        </h1>
        <span className="text-gray-400 text-xs font-mono">{dateStr}</span>
        <span className="text-gray-600 text-xs px-2 py-0.5 rounded bg-gray-900/60 border border-gray-800/40">
          {phaseLabel}
        </span>
      </div>

      <div className="flex items-center gap-1">
        {SPEED_OPTIONS.map((opt) => {
          const isActive =
            opt.value === 'paused'
              ? isPaused
              : speed === opt.value && !isPaused;
          return (
            <button
              key={opt.value}
              onClick={() => {
                if (opt.value === 'paused') {
                  togglePause();
                } else {
                  setSpeed(opt.value);
                }
              }}
              className={`px-2.5 py-1 text-xs rounded transition-all cursor-pointer border ${
                isActive
                  ? 'bg-amber-900/40 border-amber-700/50 text-amber-200'
                  : 'bg-gray-900/40 border-gray-800/40 text-gray-500 hover:text-gray-300 hover:border-gray-700/50'
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-4">
        <MoneyDisplay />

        <button
          onClick={() =>
            setViewMode(viewMode === 'floorplan' ? 'isometric' : 'floorplan')
          }
          className="px-3 py-1 text-xs rounded bg-gray-800 border border-gray-700 text-gray-300 hover:bg-gray-700 hover:text-white transition-colors cursor-pointer"
          title="Toggle view mode (V)"
        >
          {viewMode === 'floorplan' ? 'Floor Plan' : 'Isometric'}
        </button>

        <button
          onClick={onMenuClick}
          className="px-3 py-1 text-xs rounded bg-gray-800 border border-gray-700 text-gray-300 hover:bg-gray-700 hover:text-white transition-colors cursor-pointer"
          title="Save/Load (Esc)"
        >
          Menu
        </button>
      </div>
    </div>
  );
}

function TileInfo() {
  const selectedTile = useGameStore((s) => s.ui.selectedTile);
  const grid = useGameStore((s) => s.grid);
  const properties = useGameStore((s) => s.properties);
  const activePropertyId = useGameStore((s) => s.activePropertyId);
  const demolishRoom = useGameStore((s) => s.demolishRoom);
  const currentPhase = useGameStore((s) => s.ui.currentPhase);

  if (!selectedTile) return null;

  const cell = grid.cells[selectedTile.y * grid.width + selectedTile.x];
  if (!cell) return null;

  const activeProperty = properties.find((p) => p.id === activePropertyId);
  const room = cell.roomId
    ? activeProperty?.rooms.find((r) => r.id === cell.roomId)
    : null;

  return (
    <div className="absolute bottom-4 left-4 z-20 bg-gray-900/95 backdrop-blur-sm border border-amber-900/30 rounded-lg p-3 min-w-48 shadow-xl">
      <div className="text-xs text-gray-500 mb-1">
        Tile ({selectedTile.x}, {selectedTile.y})
      </div>

      {room ? (
        <>
          <div className="text-sm text-amber-200 font-semibold">{cell.roomType}</div>
          {room.isConstructing && (
            <div className="text-xs text-yellow-400 mt-1">
              Under construction ({room.constructionDaysLeft} days left)
            </div>
          )}
          {!room.isConstructing && (
            <div className="text-xs text-emerald-400 mt-1">Complete</div>
          )}
          {currentPhase === 'building' && (
            <button
              onClick={() => {
                if (confirm('Demolish this room? You get 40% refund.')) {
                  demolishRoom(room.id);
                }
              }}
              className="mt-2 text-xs px-2 py-1 bg-red-900/30 border border-red-800/40 text-red-300 rounded hover:bg-red-900/50 transition-colors cursor-pointer"
            >
              Demolish (40% refund)
            </button>
          )}
        </>
      ) : (
        <div className="text-sm text-gray-500">Empty</div>
      )}
    </div>
  );
}

function RehearsalOverlay() {
  const shows = useGameStore((s) => s.shows);
  const activeShowId = useGameStore((s) => s.activeShowId);
  const castMembers = useGameStore((s) => s.castMembers);
  const rehearsalLog = useGameStore((s) => s.rehearsalLog);
  const activeShow = shows.find((s) => s.id === activeShowId);

  if (!activeShow?.isRehearsing) return null;

  const progress = Math.round(activeShow.rehearsalProgress);
  const recentLogs = rehearsalLog.slice(-8);

  // Cast assigned to this show
  const assignedCast = castMembers.filter((c) =>
    activeShow.roles.some((r) => r.castMemberId === c.id),
  );

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-gray-950/95 backdrop-blur-sm border border-amber-900/30 rounded-xl p-5 w-[400px] max-h-[80vh] overflow-y-auto shadow-xl">
      <h3
        className="text-sm font-bold text-amber-200 mb-1"
        style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
      >
        Rehearsing: {activeShow.title}
      </h3>

      {/* Progress bar */}
      <div className="mt-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-gray-400 uppercase tracking-wider">Readiness</span>
          <span className="text-sm font-mono text-amber-300">{progress}%</span>
        </div>
        <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-amber-600 to-amber-400 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Day {activeShow.rehearsalDaysCompleted} / {activeShow.rehearsalDaysTotal}
        </p>
      </div>

      {/* Cast list */}
      {assignedCast.length > 0 && (
        <div className="mt-4">
          <h4 className="text-[10px] text-gray-400 uppercase tracking-wider mb-2">Cast</h4>
          <div className="grid grid-cols-2 gap-1.5">
            {assignedCast.map((c) => {
              const moraleColor = c.morale > 70 ? 'text-emerald-400' : c.morale > 40 ? 'text-amber-400' : 'text-red-400';
              return (
                <div key={c.id} className="flex items-center justify-between px-2 py-1 bg-gray-900/40 rounded text-xs">
                  <span className="text-gray-300 truncate">{c.name}</span>
                  <span className={`ml-1 ${moraleColor}`}>{c.morale}%</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Rehearsal log */}
      {recentLogs.length > 0 && (
        <div className="mt-4">
          <h4 className="text-[10px] text-gray-400 uppercase tracking-wider mb-2">Rehearsal Log</h4>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {recentLogs.map((entry) => {
              const typeColor = entry.type === 'breakthrough' ? 'text-emerald-400'
                : entry.type === 'conflict' ? 'text-amber-400'
                : entry.type === 'injury' ? 'text-red-400'
                : 'text-gray-400';
              return (
                <div key={entry.id} className="text-[11px] py-0.5">
                  <span className="text-gray-600 font-mono mr-1.5">D{entry.day}</span>
                  <span className={typeColor}>{entry.message}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function RunningDashboard() {
  const shows = useGameStore((s) => s.shows);
  const activeShowId = useGameStore((s) => s.activeShowId);
  const performanceHistory = useGameStore((s) => s.performanceHistory);
  const ticketPrice = useGameStore((s) => s.ticketPrice);
  const setTicketPrice = useGameStore((s) => s.setTicketPrice);
  const runDay = useGameStore((s) => s.runDay);
  const events = useGameStore((s) => s.events);
  const closeShow = useGameStore((s) => s.closeShow);
  const activeShow = shows.find((s) => s.id === activeShowId);
  if (!activeShow?.isRunning) return null;

  // Last 7 performances (skip dark days)
  const recentPerfs = performanceHistory.slice(-7);
  const maxRevInRecent = recentPerfs.length > 0
    ? Math.max(...recentPerfs.map((p) => p.revenue))
    : 1;

  // Totals
  const totalRevenue = performanceHistory.reduce((s, p) => s + p.revenue, 0);
  const totalExpenses = performanceHistory.reduce((s, p) => s + p.expenses, 0);
  const totalProfit = totalRevenue - totalExpenses;
  const avgAttendance = performanceHistory.length > 0
    ? performanceHistory.reduce((s, p) => s + (p.capacity > 0 ? p.attendance / p.capacity : 0), 0) / performanceHistory.length * 100
    : 0;

  // Recent events
  const recentEvents = events.filter((e) => e.resolved).slice(-5).reverse();

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

  const buzzColor = activeShow.buzzScore > 66 ? 'from-amber-500 to-yellow-300' :
                    activeShow.buzzScore > 33 ? 'from-orange-500 to-amber-400' :
                                                'from-red-600 to-orange-500';

  return (
    <div className="w-80 bg-gray-950/95 border-l border-amber-900/30 flex flex-col overflow-y-auto">
      {/* Show Info */}
      <div className="p-4 border-b border-gray-800/40">
        <h2
          className="text-amber-200 text-sm font-bold tracking-wide"
          style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
        >
          {activeShow.title}
        </h2>
        <p className="text-xs text-gray-500 mt-0.5">Day {runDay} of run</p>
      </div>

      {/* Stats */}
      <div className="p-4 border-b border-gray-800/30 grid grid-cols-2 gap-3">
        <MiniStat label="Quality" value={`${activeShow.quality}`} />
        <MiniStat label="Performances" value={`${performanceHistory.length}`} />
        <MiniStat label="Avg Attendance" value={`${Math.round(avgAttendance)}%`} color={avgAttendance > 60 ? 'text-emerald-400' : 'text-red-400'} />
        <MiniStat label="Total Revenue" value={`$${totalRevenue.toLocaleString()}`} color="text-emerald-400" />
      </div>

      {/* Buzz */}
      <div className="p-4 border-b border-gray-800/30">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-gray-400 uppercase tracking-wider">Buzz</span>
          <span className="text-xs font-mono text-amber-300">{Math.round(activeShow.buzzScore)}</span>
        </div>
        <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
          <div className={`h-full bg-gradient-to-r ${buzzColor} rounded-full transition-all`} style={{ width: `${activeShow.buzzScore}%` }} />
        </div>
      </div>

      {/* Revenue Chart */}
      <div className="p-4 border-b border-gray-800/30">
        <h3 className="text-[10px] text-gray-400 uppercase tracking-wider mb-2">Last 7 Performances</h3>
        {recentPerfs.length === 0 ? (
          <p className="text-xs text-gray-600 italic">No performances yet</p>
        ) : (
          <div className="flex items-end gap-1 h-16">
            {recentPerfs.map((p, i) => {
              const height = maxRevInRecent > 0 ? (p.revenue / maxRevInRecent) * 100 : 0;
              const isProfit = p.profit >= 0;
              return (
                <div
                  key={i}
                  className="flex-1 rounded-t"
                  style={{
                    height: `${Math.max(4, height)}%`,
                    background: isProfit
                      ? 'linear-gradient(to top, #065f46, #10b981)'
                      : 'linear-gradient(to top, #7f1d1d, #ef4444)',
                  }}
                  title={`$${p.revenue.toLocaleString()} rev / ${p.attendance} attended`}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Ticket Price */}
      <div className="p-4 border-b border-gray-800/30">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-gray-400 uppercase tracking-wider">Ticket Price</span>
          <span className="text-sm font-mono text-amber-200">${ticketPrice}</span>
        </div>
        <input
          type="range"
          min={20}
          max={150}
          step={5}
          value={ticketPrice}
          onChange={(e) => setTicketPrice(Number(e.target.value))}
          className="w-full accent-amber-500"
        />
        <div className="flex justify-between text-[10px] text-gray-600 mt-0.5">
          <span>$20</span>
          <span>$150</span>
        </div>
      </div>

      {/* Recent Events */}
      <div className="p-4 border-b border-gray-800/30">
        <h3 className="text-[10px] text-gray-400 uppercase tracking-wider mb-2">Recent Events</h3>
        {recentEvents.length === 0 ? (
          <p className="text-xs text-gray-600 italic">No events yet</p>
        ) : (
          <div className="space-y-1.5">
            {recentEvents.map((e) => {
              const sevColor = e.severity === 'major' ? 'text-red-400' : e.severity === 'moderate' ? 'text-amber-400' : 'text-emerald-400';
              return (
                <div key={e.id} className="text-xs py-1 border-b border-gray-800/20 last:border-0">
                  <span className={`${sevColor} mr-1`}>{'\u2022'}</span>
                  <span className="text-gray-300">{e.title}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

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
  );
}

function MiniStat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div>
      <p className="text-[10px] text-gray-500 uppercase tracking-wider">{label}</p>
      <p className={`text-sm font-mono font-bold ${color ?? 'text-gray-200'}`}>{value}</p>
    </div>
  );
}

function PhaseTransition({ phase }: { phase: string }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    setVisible(true);
    const timer = setTimeout(() => setVisible(false), 400);
    return () => clearTimeout(timer);
  }, [phase]);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[80] bg-gray-950 pointer-events-none transition-opacity duration-300"
      style={{ opacity: visible ? 0.6 : 0 }}
    />
  );
}

function App() {
  const currentPhase = useGameStore((s) => s.ui.currentPhase);
  const activeShowId = useGameStore((s) => s.activeShowId);
  const events = useGameStore((s) => s.events);
  const initialized = useGameStore((s) => s.initialized);
  const isPaused = useGameStore((s) => s.time.isPaused);
  const [showSaveLoad, setShowSaveLoad] = useState(false);
  const prevPhaseRef = useRef(currentPhase);
  const [showTransition, setShowTransition] = useState(false);

  // Check for unresolved choice events
  const hasUnresolvedEvent = events.some((e) => !e.resolved && e.choices.length > 1);

  // Phase transition effect
  useEffect(() => {
    if (prevPhaseRef.current !== currentPhase) {
      prevPhaseRef.current = currentPhase;
      setShowTransition(true);
      const timer = setTimeout(() => setShowTransition(false), 400);
      return () => clearTimeout(timer);
    }
  }, [currentPhase]);

  // Autosave timer
  useEffect(() => {
    if (!initialized || currentPhase === 'menu') return;

    const interval = setInterval(() => {
      const state = useGameStore.getState();
      if (!state.initialized || state.time.isPaused) return;
      const serializable = state.getSerializableState();
      saveGame(AUTOSAVE_SLOT_ID, serializable);
    }, AUTOSAVE_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [initialized, currentPhase]);

  // Pause when modals are open
  useEffect(() => {
    if ((showSaveLoad || hasUnresolvedEvent) && !isPaused && initialized) {
      useGameStore.getState().setSpeed('paused');
    }
  }, [showSaveLoad, hasUnresolvedEvent, isPaused, initialized]);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      const state = useGameStore.getState();

      switch (e.key) {
        case 'Escape':
          if (showSaveLoad) {
            setShowSaveLoad(false);
          } else if (state.ui.selectedRoomType) {
            state.selectRoomType(null);
          } else if (state.initialized && state.ui.currentPhase !== 'menu') {
            setShowSaveLoad(true);
          }
          break;

        case ' ':
          e.preventDefault();
          if (state.initialized && state.ui.currentPhase !== 'menu') {
            state.togglePause();
          }
          break;

        case '1':
          if (state.initialized) state.setSpeed('normal');
          break;
        case '2':
          if (state.initialized) state.setSpeed('fast');
          break;
        case '3':
          if (state.initialized) state.setSpeed('ultra');
          break;

        case 'v':
        case 'V':
          // Handled in GameCanvas already, but don't conflict
          break;

        case 'Delete':
        case 'Backspace':
          if (state.ui.currentPhase === 'building' && state.ui.selectedTile) {
            const cell = state.grid.cells[state.ui.selectedTile.y * state.grid.width + state.ui.selectedTile.x];
            if (cell?.roomId) {
              if (confirm('Demolish this room? You get 40% refund.')) {
                state.demolishRoom(cell.roomId);
              }
            }
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showSaveLoad]);

  const handleOpenMenu = useCallback(() => {
    setShowSaveLoad(true);
  }, []);

  const handleCloseMenu = useCallback(() => {
    setShowSaveLoad(false);
  }, []);

  // Menu screen
  if (currentPhase === 'menu') {
    return (
      <>
        <MainMenu />
        <NotificationToast />
      </>
    );
  }

  // Property selection screen
  if (currentPhase === 'property_select') {
    return (
      <>
        <PropertySelect />
        <NotificationToast />
      </>
    );
  }

  // Summary phase (end of run)
  if (currentPhase === 'summary') {
    return (
      <div className="w-full h-full flex flex-col bg-gray-950 overflow-hidden">
        <TopBar onMenuClick={handleOpenMenu} />
        <div className="flex-1 relative">
          <GameCanvas />
        </div>
        <EndOfRunModal />
        {showSaveLoad && <SaveLoadModal onClose={handleCloseMenu} />}
        {showTransition && <PhaseTransition phase={currentPhase} />}
        <NotificationToast />
      </div>
    );
  }

  // Building phase
  if (currentPhase === 'building') {
    return (
      <div className="w-full h-full flex flex-col bg-gray-950 overflow-hidden">
        <TopBar onMenuClick={handleOpenMenu} />
        <PhaseBreadcrumb />
        <div className="flex-1 flex relative">
          <div className="flex-1 relative">
            <GameCanvas />
            <TileInfo />
          </div>
          <BuildPanel />
        </div>
        {showSaveLoad && <SaveLoadModal onClose={handleCloseMenu} />}
        {showTransition && <PhaseTransition phase={currentPhase} />}
        <NotificationToast />
      </div>
    );
  }

  // Production phase
  if (currentPhase === 'production') {
    if (!activeShowId) {
      return (
        <div className="w-full h-full flex flex-col bg-gray-950 overflow-hidden">
          <TopBar onMenuClick={handleOpenMenu} />
          <PhaseBreadcrumb />
          <div className="flex-1 relative">
            <GameCanvas />
          </div>
          <ShowPickerModal />
          {showSaveLoad && <SaveLoadModal onClose={handleCloseMenu} />}
          {showTransition && <PhaseTransition phase={currentPhase} />}
          <NotificationToast />
        </div>
      );
    }

    return (
      <div className="w-full h-full flex flex-col bg-gray-950 overflow-hidden">
        <TopBar onMenuClick={handleOpenMenu} />
        <PhaseBreadcrumb />
        <div className="flex-1 flex relative">
          <div className="flex-1 relative">
            <GameCanvas />
            <TileInfo />
          </div>
          <StaffPanel />
        </div>
        {showSaveLoad && <SaveLoadModal onClose={handleCloseMenu} />}
        {showTransition && <PhaseTransition phase={currentPhase} />}
        <NotificationToast />
      </div>
    );
  }

  // Audition phase
  if (currentPhase === 'audition') {
    return (
      <div className="w-full h-full flex flex-col bg-gray-950 overflow-hidden">
        <TopBar onMenuClick={handleOpenMenu} />
        <PhaseBreadcrumb />
        <div className="flex-1 relative">
          <GameCanvas />
        </div>
        <AuditionModal />
        {showSaveLoad && <SaveLoadModal onClose={handleCloseMenu} />}
        {showTransition && <PhaseTransition phase={currentPhase} />}
        <NotificationToast />
      </div>
    );
  }

  // Rehearsal phase
  if (currentPhase === 'rehearsal') {
    return (
      <div className="w-full h-full flex flex-col bg-gray-950 overflow-hidden">
        <TopBar onMenuClick={handleOpenMenu} />
        <PhaseBreadcrumb />
        <div className="flex-1 flex relative">
          <div className="flex-1 relative">
            <GameCanvas />
            <RehearsalOverlay />
            <TileInfo />
          </div>
          <MarketingPanel />
        </div>
        {showSaveLoad && <SaveLoadModal onClose={handleCloseMenu} />}
        {showTransition && <PhaseTransition phase={currentPhase} />}
        <NotificationToast />
      </div>
    );
  }

  // Running phase
  if (currentPhase === 'running') {
    return (
      <div className="w-full h-full flex flex-col bg-gray-950 overflow-hidden">
        <TopBar onMenuClick={handleOpenMenu} />
        <PhaseBreadcrumb />
        <div className="flex-1 flex relative">
          <div className="flex-1 relative">
            <GameCanvas />
            <TileInfo />
          </div>
          <div className="flex flex-col">
            <RunningDashboard />
          </div>
        </div>
        {hasUnresolvedEvent && <EventModal />}
        {showSaveLoad && <SaveLoadModal onClose={handleCloseMenu} />}
        {showTransition && <PhaseTransition phase={currentPhase} />}
        <NotificationToast />
      </div>
    );
  }

  // All other phases: canvas + top bar
  return (
    <div className="w-full h-full flex flex-col bg-gray-950 overflow-hidden">
      <TopBar onMenuClick={handleOpenMenu} />
      <PhaseBreadcrumb />
      <div className="flex-1 relative">
        <GameCanvas />
        <TileInfo />
      </div>
      {showSaveLoad && <SaveLoadModal onClose={handleCloseMenu} />}
      {showTransition && <PhaseTransition phase={currentPhase} />}
      <NotificationToast />
    </div>
  );
}

export default App;
