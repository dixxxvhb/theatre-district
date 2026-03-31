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
import { OpeningNightModal } from './ui/modals/OpeningNightModal';
import { SaveLoadModal } from './ui/modals/SaveLoadModal';
import { RunDashboard } from './ui/panels/RunDashboard';
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

/** Tiny keyboard shortcut badge */
function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-block bg-gray-800 border border-gray-600 rounded px-1 py-px text-[10px] font-mono text-gray-400 leading-tight ml-1">
      {children}
    </span>
  );
}

const SPEED_KEYS: Record<string, string> = {
  paused: 'Space',
  normal: '1',
  fast: '2',
  ultra: '3',
};

/** Secondary status row shown during rehearsal/running phases */
function StatusBar() {
  const currentPhase = useGameStore((s) => s.ui.currentPhase);
  const shows = useGameStore((s) => s.shows);
  const activeShowId = useGameStore((s) => s.activeShowId);
  const performanceHistory = useGameStore((s) => s.performanceHistory);
  const runDay = useGameStore((s) => s.runDay);

  const activeShow = shows.find((s) => s.id === activeShowId);

  if (currentPhase !== 'rehearsal' && currentPhase !== 'running') return null;
  if (!activeShow) return null;

  // Buzz bar color
  const buzz = Math.round(activeShow.buzzScore);
  const buzzColor =
    buzz > 60 ? 'from-amber-500 to-yellow-300' :
    buzz > 30 ? 'from-orange-500 to-amber-400' :
               'from-red-600 to-orange-500';

  // Quality color
  const quality = activeShow.quality;
  const qualityColor =
    quality > 80 ? 'text-amber-300' :
    quality > 60 ? 'text-emerald-400' :
    quality > 40 ? 'text-orange-400' :
                   'text-red-400';

  // Last performance
  const lastPerf = performanceHistory.length > 0
    ? performanceHistory[performanceHistory.length - 1]
    : null;

  return (
    <div className="h-7 bg-gray-950/80 border-b border-gray-800/30 flex items-center gap-4 px-4 text-xs">
      {/* Buzz meter */}
      <div className="flex items-center gap-2">
        <span className="text-gray-500 uppercase tracking-wider text-[10px]">Buzz</span>
        <div className="w-20 h-2 bg-gray-800 rounded-full overflow-hidden">
          <div
            className={`h-full bg-gradient-to-r ${buzzColor} rounded-full transition-all`}
            style={{ width: `${buzz}%` }}
          />
        </div>
        <span className="text-amber-300 font-mono text-[11px] w-5 text-right">{buzz}</span>
      </div>

      {/* Show quality (during running) */}
      {currentPhase === 'running' && (
        <div className="flex items-center gap-1.5">
          <span className="text-gray-500 uppercase tracking-wider text-[10px]">Quality</span>
          <span className={`font-mono text-[11px] font-bold ${qualityColor}`}>{quality}</span>
        </div>
      )}

      {/* Run counter or rehearsal progress */}
      {currentPhase === 'running' ? (
        <div className="flex items-center gap-1.5">
          <span className="text-gray-500 text-[10px]">Day</span>
          <span className="text-gray-300 font-mono text-[11px]">{runDay}</span>
          <span className="text-gray-600 text-[10px]">of run</span>
        </div>
      ) : (
        <div className="flex items-center gap-1.5">
          <span className="text-gray-500 uppercase tracking-wider text-[10px]">Rehearsal</span>
          <span className="text-amber-300 font-mono text-[11px]">{Math.round(activeShow.rehearsalProgress)}%</span>
        </div>
      )}

      {/* Last night attendance (running) */}
      {currentPhase === 'running' && lastPerf && (
        <div className="flex items-center gap-1.5">
          <span className="text-gray-500 text-[10px]">Last night</span>
          <span className="text-gray-300 font-mono text-[11px]">
            {lastPerf.attendance}/{lastPerf.capacity}
          </span>
          <span className={`font-mono text-[10px] ${
            lastPerf.capacity > 0 && (lastPerf.attendance / lastPerf.capacity) > 0.7
              ? 'text-emerald-400'
              : 'text-orange-400'
          }`}>
            ({lastPerf.capacity > 0 ? Math.round((lastPerf.attendance / lastPerf.capacity) * 100) : 0}%)
          </span>
        </div>
      )}
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
  const isRenovating = useGameStore((s) => s.ui.isRenovating);

  const dateStr = getFormattedDate(day);
  const phaseLabel = PHASE_LABELS[currentPhase] ?? currentPhase;

  return (
    <>
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
                <Kbd>{SPEED_KEYS[opt.value]}</Kbd>
              </button>
            );
          })}
        </div>

        {currentPhase !== 'menu' && currentPhase !== 'property_select' && currentPhase !== 'building' && (
          <button
            onClick={() => useGameStore.getState().toggleRenovate()}
            className={`px-3 py-1 text-xs rounded border transition-colors cursor-pointer ${
              isRenovating
                ? 'bg-amber-900/60 border-amber-600 text-amber-300'
                : 'bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700'
            }`}
          >
            Renovate
          </button>
        )}

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
            <Kbd>V</Kbd>
          </button>

          <button
            onClick={onMenuClick}
            className="px-3 py-1 text-xs rounded bg-gray-800 border border-gray-700 text-gray-300 hover:bg-gray-700 hover:text-white transition-colors cursor-pointer"
            title="Save/Load (Esc)"
          >
            Menu
            <Kbd>Esc</Kbd>
          </button>
        </div>
      </div>
      <StatusBar />
    </>
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

function PhaseTransitionOverlay() {
  return <div className="phase-transition" />;
}

function App() {
  const currentPhase = useGameStore((s) => s.ui.currentPhase);
  const activeShowId = useGameStore((s) => s.activeShowId);
  const events = useGameStore((s) => s.events);
  const initialized = useGameStore((s) => s.initialized);
  const isPaused = useGameStore((s) => s.time.isPaused);
  const isRenovating = useGameStore((s) => s.ui.isRenovating);
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
          } else if (state.ui.isRenovating) {
            state.toggleRenovate();
            break;
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

        case 'r':
        case 'R':
          if (state.initialized && state.ui.currentPhase !== 'menu' && state.ui.currentPhase !== 'property_select' && state.ui.currentPhase !== 'building') {
            state.toggleRenovate();
          }
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
        {showTransition && <PhaseTransitionOverlay />}
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
        {showTransition && <PhaseTransitionOverlay />}
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
          {showTransition && <PhaseTransitionOverlay />}
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
        {isRenovating && (
          <div className="absolute inset-0 z-40 flex">
            <div className="flex-1 bg-black/30" onClick={() => useGameStore.getState().toggleRenovate()} />
            <div className="w-80 bg-gray-950 border-l border-gray-800 shadow-2xl overflow-hidden flex flex-col">
              <div className="flex items-center justify-between p-3 border-b border-gray-800">
                <span className="text-sm font-bold text-amber-300">Renovate</span>
                <span className="text-[10px] text-amber-500/80">1.5x rush pricing</span>
                <button
                  onClick={() => useGameStore.getState().toggleRenovate()}
                  className="text-gray-500 hover:text-white text-xs cursor-pointer"
                >
                  Close
                </button>
              </div>
              <BuildPanel />
            </div>
          </div>
        )}
        {showSaveLoad && <SaveLoadModal onClose={handleCloseMenu} />}
        {showTransition && <PhaseTransitionOverlay />}
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
        {isRenovating && (
          <div className="absolute inset-0 z-40 flex">
            <div className="flex-1 bg-black/30" onClick={() => useGameStore.getState().toggleRenovate()} />
            <div className="w-80 bg-gray-950 border-l border-gray-800 shadow-2xl overflow-hidden flex flex-col">
              <div className="flex items-center justify-between p-3 border-b border-gray-800">
                <span className="text-sm font-bold text-amber-300">Renovate</span>
                <span className="text-[10px] text-amber-500/80">1.5x rush pricing</span>
                <button
                  onClick={() => useGameStore.getState().toggleRenovate()}
                  className="text-gray-500 hover:text-white text-xs cursor-pointer"
                >
                  Close
                </button>
              </div>
              <BuildPanel />
            </div>
          </div>
        )}
        {showSaveLoad && <SaveLoadModal onClose={handleCloseMenu} />}
        {showTransition && <PhaseTransitionOverlay />}
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
        <OpeningNightModal />
        {isRenovating && (
          <div className="absolute inset-0 z-40 flex">
            <div className="flex-1 bg-black/30" onClick={() => useGameStore.getState().toggleRenovate()} />
            <div className="w-80 bg-gray-950 border-l border-gray-800 shadow-2xl overflow-hidden flex flex-col">
              <div className="flex items-center justify-between p-3 border-b border-gray-800">
                <span className="text-sm font-bold text-amber-300">Renovate</span>
                <span className="text-[10px] text-amber-500/80">1.5x rush pricing</span>
                <button
                  onClick={() => useGameStore.getState().toggleRenovate()}
                  className="text-gray-500 hover:text-white text-xs cursor-pointer"
                >
                  Close
                </button>
              </div>
              <BuildPanel />
            </div>
          </div>
        )}
        {showSaveLoad && <SaveLoadModal onClose={handleCloseMenu} />}
        {showTransition && <PhaseTransitionOverlay />}
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
          <RunDashboard />
        </div>
        {hasUnresolvedEvent && <EventModal />}
        {isRenovating && (
          <div className="absolute inset-0 z-40 flex">
            <div className="flex-1 bg-black/30" onClick={() => useGameStore.getState().toggleRenovate()} />
            <div className="w-80 bg-gray-950 border-l border-gray-800 shadow-2xl overflow-hidden flex flex-col">
              <div className="flex items-center justify-between p-3 border-b border-gray-800">
                <span className="text-sm font-bold text-amber-300">Renovate</span>
                <span className="text-[10px] text-amber-500/80">1.5x rush pricing</span>
                <button
                  onClick={() => useGameStore.getState().toggleRenovate()}
                  className="text-gray-500 hover:text-white text-xs cursor-pointer"
                >
                  Close
                </button>
              </div>
              <BuildPanel />
            </div>
          </div>
        )}
        {showSaveLoad && <SaveLoadModal onClose={handleCloseMenu} />}
        {showTransition && <PhaseTransitionOverlay />}
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
      {showTransition && <PhaseTransitionOverlay />}
      <NotificationToast />
    </div>
  );
}

export default App;
