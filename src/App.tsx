// Theatre District — app shell.
// Street-first: title screen → the street, with the Production Desk and
// build palette arriving in later sessions. The legacy Broadway Tycoon
// shell was replaced in Session 1; its show-production systems return
// through the Production Desk in Session 5.

import { useEffect, useState } from 'react';
import { DistrictCanvas } from './game/render/DistrictCanvas';
import { calendarLabel, dayPhase } from './game/sim/calendar';
import type { Speed } from './game/sim/clock';
import { mostRecentSave } from './store/saves';
import { useTDStore } from './store/store';
import { DevPanel, devEnabled } from './ui/dev/DevPanel';
import { SaveMenu } from './ui/SaveMenu';

const PHASE_LABELS: Record<string, string> = {
  quiet: 'Quiet afternoon',
  preshow: 'Pre-show',
  curtain: 'Curtain up',
  postshow: 'Post-show rush',
  winddown: 'Wind-down',
};

const SPEEDS: Array<{ key: Exclude<Speed, 'paused'>; label: string; hotkey: string }> = [
  { key: 'normal', label: '1x', hotkey: '1' },
  { key: 'fast', label: '2x', hotkey: '2' },
  { key: 'ultra', label: '4x', hotkey: '3' },
];

function TitleScreen() {
  const newGame = useTDStore((s) => s.newGame);
  const hydrate = useTDStore((s) => s.hydrate);
  const [name, setName] = useState('');
  const [hasSave] = useState(() => mostRecentSave() !== null);

  return (
    <div className="flex h-screen flex-col items-center justify-center bg-[#0a0d18] text-center">
      <h1
        className="text-7xl font-bold tracking-widest text-[#d4a574]"
        style={{ fontFamily: 'Georgia, serif', textShadow: '0 0 40px rgba(212,165,116,0.3)' }}
      >
        THEATRE
      </h1>
      <h2
        className="mt-1 text-5xl font-bold tracking-[0.3em] text-[#b8860b]"
        style={{ fontFamily: 'Georgia, serif' }}
      >
        DISTRICT
      </h2>
      <div className="mx-auto mt-6 h-px w-64 bg-gradient-to-r from-transparent via-[#d4a574] to-transparent" />
      <div className="mt-8 flex flex-col items-center gap-3">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name your district"
          className="w-64 rounded border border-amber-900/50 bg-gray-900/80 px-3 py-2 text-center text-amber-100 placeholder-gray-500 outline-none focus:border-amber-600"
        />
        <button
          onClick={() => newGame(name)}
          className="w-64 rounded border border-amber-700 bg-amber-950/60 px-4 py-2 text-amber-100 hover:bg-amber-900/60"
        >
          New District
        </button>
        {hasSave && (
          <button
            onClick={() => {
              const state = mostRecentSave();
              if (state) hydrate(state);
            }}
            className="w-64 rounded border border-gray-700 bg-gray-900/60 px-4 py-2 text-gray-300 hover:bg-gray-800"
          >
            Continue
          </button>
        )}
      </div>
    </div>
  );
}

function TopBar({ onOpenSaves }: { onOpenSaves: () => void }) {
  const districtName = useTDStore((s) => s.districtName);
  const day = useTDStore((s) => s.time.day);
  const phase = useTDStore((s) => dayPhase(s.time.tickOfDay));
  const cash = useTDStore((s) => s.economy.cash);
  const speed = useTDStore((s) => s.time.speed);
  const setSpeed = useTDStore((s) => s.setSpeed);
  const togglePause = useTDStore((s) => s.togglePause);

  return (
    <div className="relative z-10 flex h-12 items-center justify-between border-b border-amber-900/30 bg-gray-950/90 px-4 backdrop-blur-sm">
      <div className="flex items-center gap-4">
        <h1 className="text-lg tracking-wide text-amber-200" style={{ fontFamily: 'Georgia, serif' }}>
          {districtName}
        </h1>
        <span className="font-mono text-xs text-gray-400">{calendarLabel(day)}</span>
        <span className="rounded border border-gray-800/40 bg-gray-900/60 px-2 py-0.5 text-xs text-gray-500">
          {PHASE_LABELS[phase]}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <span className="font-mono text-sm text-amber-200">${cash.toLocaleString()}</span>
        <div className="flex items-center gap-1">
          <button
            onClick={togglePause}
            title="Space"
            className={`rounded px-2 py-1 text-xs ${
              speed === 'paused'
                ? 'bg-amber-800 text-amber-100'
                : 'border border-gray-700 text-gray-400 hover:bg-gray-800'
            }`}
          >
            {speed === 'paused' ? 'Paused' : 'Pause'}
          </button>
          {SPEEDS.map((s) => (
            <button
              key={s.key}
              onClick={() => setSpeed(s.key)}
              title={s.hotkey}
              className={`rounded px-2 py-1 text-xs ${
                speed === s.key
                  ? 'bg-amber-800 text-amber-100'
                  : 'border border-gray-700 text-gray-400 hover:bg-gray-800'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
        <button
          onClick={onOpenSaves}
          className="rounded border border-gray-700 px-2 py-1 text-xs text-gray-400 hover:bg-gray-800"
        >
          Saves
        </button>
      </div>
    </div>
  );
}

export default function App() {
  const initialized = useTDStore((s) => s.initialized);
  const [savesOpen, setSavesOpen] = useState(false);

  // Global keyboard: Space = pause toggle, 1/2/3 = speeds.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const { togglePause, setSpeed } = useTDStore.getState();
      if (e.code === 'Space') {
        e.preventDefault();
        togglePause();
      } else if (e.key === '1') setSpeed('normal');
      else if (e.key === '2') setSpeed('fast');
      else if (e.key === '3') setSpeed('ultra');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  if (!initialized) {
    return (
      <>
        <TitleScreen />
        {devEnabled() && <DevPanel />}
      </>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-[#0a0d18]">
      <TopBar onOpenSaves={() => setSavesOpen(true)} />
      <div className="relative flex-1">
        <DistrictCanvas />
      </div>
      {savesOpen && <SaveMenu onClose={() => setSavesOpen(false)} />}
      {devEnabled() && <DevPanel />}
    </div>
  );
}
