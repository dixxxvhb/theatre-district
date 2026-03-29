import { useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { getMostRecentSave, hasSaves } from '../../store/saveManager';
import { pushToast } from '../components/NotificationToast';

export function MainMenu() {
  const initGame = useGameStore((s) => s.initGame);
  const loadState = useGameStore((s) => s.loadState);
  const [showNameInput, setShowNameInput] = useState(false);
  const [theaterName, setTheaterName] = useState('');
  const [showHowToPlay, setShowHowToPlay] = useState(false);

  const hasSaveData = hasSaves();

  const handleNewGame = () => {
    setShowNameInput(true);
  };

  const handleStartGame = () => {
    const name = theaterName.trim() || 'The Majestic';
    initGame(name);
  };

  const handleContinue = () => {
    const state = getMostRecentSave();
    if (state) {
      loadState(state);
      pushToast('Game loaded!', 'success');
    } else {
      pushToast('No save found', 'error');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleStartGame();
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-gray-950 relative overflow-hidden">
      {/* Curtain effect */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Left curtain */}
        <div
          className="absolute left-0 top-0 bottom-0 w-24"
          style={{
            background:
              'linear-gradient(to right, #3d0a1e 0%, #5c1132 40%, transparent 100%)',
          }}
        />
        {/* Right curtain */}
        <div
          className="absolute right-0 top-0 bottom-0 w-24"
          style={{
            background:
              'linear-gradient(to left, #3d0a1e 0%, #5c1132 40%, transparent 100%)',
          }}
        />
        {/* Top valance */}
        <div
          className="absolute top-0 left-0 right-0 h-16"
          style={{
            background:
              'linear-gradient(to bottom, #3d0a1e 0%, #5c1132 60%, transparent 100%)',
          }}
        />
        {/* Spotlight glow */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full opacity-10"
          style={{
            background:
              'radial-gradient(circle, #d4a574 0%, transparent 70%)',
          }}
        />
      </div>

      {/* Title */}
      <div className="relative z-10 text-center mb-12">
        <h1
          className="text-6xl md:text-8xl font-bold tracking-widest mb-2"
          style={{
            fontFamily: 'Georgia, "Times New Roman", serif',
            color: '#d4a574',
            textShadow:
              '0 0 40px rgba(212,165,116,0.3), 0 4px 8px rgba(0,0,0,0.5)',
          }}
        >
          BROADWAY
        </h1>
        <h2
          className="text-4xl md:text-6xl font-bold tracking-[0.3em]"
          style={{
            fontFamily: 'Georgia, "Times New Roman", serif',
            color: '#b8860b',
            textShadow:
              '0 0 30px rgba(184,134,11,0.3), 0 2px 4px rgba(0,0,0,0.5)',
          }}
        >
          TYCOON
        </h2>
        <div
          className="mt-4 h-px w-64 mx-auto"
          style={{
            background:
              'linear-gradient(to right, transparent, #d4a574, transparent)',
          }}
        />
        <p className="mt-3 text-gray-500 text-sm tracking-widest uppercase">
          Build Your Theater Empire
        </p>
      </div>

      {/* Menu buttons */}
      <div className="relative z-10 flex flex-col gap-3 w-72">
        {!showNameInput ? (
          <>
            <MenuButton onClick={handleNewGame} primary>
              New Game
            </MenuButton>

            {hasSaveData && (
              <MenuButton onClick={handleContinue}>Continue</MenuButton>
            )}

            <MenuButton onClick={() => setShowHowToPlay(true)}>
              How to Play
            </MenuButton>
          </>
        ) : (
          <div className="flex flex-col gap-4">
            <label className="text-gray-400 text-sm text-center">
              Name your theater
            </label>
            <input
              type="text"
              value={theaterName}
              onChange={(e) => setTheaterName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="The Majestic"
              maxLength={30}
              autoFocus
              className="bg-gray-900/80 border border-amber-900/40 text-amber-100 text-center text-lg py-3 px-4 rounded-lg focus:outline-none focus:border-amber-600/60 placeholder-gray-600"
            />
            <MenuButton onClick={handleStartGame} primary>
              Begin
            </MenuButton>
            <MenuButton onClick={() => setShowNameInput(false)}>
              Back
            </MenuButton>
          </div>
        )}
      </div>

      {/* How to Play modal */}
      {showHowToPlay && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-gray-900/95 border border-amber-900/40 rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
            <h3
              className="text-xl font-bold mb-4"
              style={{ color: '#d4a574' }}
            >
              How to Play
            </h3>
            <div className="text-gray-300 text-sm space-y-3">
              <p>
                <span className="text-amber-400 font-semibold">1. Buy a Property</span>
                {' '} -- Choose your theater location. Start small and work your way up.
              </p>
              <p>
                <span className="text-amber-400 font-semibold">2. Build Rooms</span>
                {' '} -- Place rooms on your floor plan. You need at least a Lobby, Box Office, Seating, Stage, and Backstage to open.
              </p>
              <p>
                <span className="text-amber-400 font-semibold">3. Produce Shows</span>
                {' '} -- Hire cast and crew, rehearse, and open your show to the public.
              </p>
              <p>
                <span className="text-amber-400 font-semibold">4. Grow</span>
                {' '} -- Earn revenue, build reputation, expand your theater, and become a Broadway legend.
              </p>
            </div>
            <div className="mt-4 text-xs text-gray-500 space-y-1">
              <p>Pan: Drag or WASD / Arrow keys</p>
              <p>Zoom: Scroll wheel</p>
              <p>Toggle view: V key</p>
              <p>Speed: 1, 2, 3 keys</p>
              <p>Pause: Space bar</p>
              <p>Save/Load: Escape key</p>
            </div>
            <button
              onClick={() => setShowHowToPlay(false)}
              className="mt-5 w-full py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Version */}
      <div className="absolute bottom-4 text-gray-700 text-xs">v0.2.0</div>
    </div>
  );
}

function MenuButton({
  children,
  onClick,
  primary = false,
}: {
  children: React.ReactNode;
  onClick: () => void;
  primary?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`py-3 px-6 rounded-lg text-lg tracking-wider font-semibold transition-all cursor-pointer border ${
        primary
          ? 'bg-amber-900/30 border-amber-700/50 text-amber-200 hover:bg-amber-900/50 hover:border-amber-600/60 active:bg-amber-900/70'
          : 'bg-gray-900/60 border-gray-700/40 text-gray-300 hover:bg-gray-800/80 hover:text-gray-100 active:bg-gray-700/80'
      }`}
      style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
    >
      {children}
    </button>
  );
}
