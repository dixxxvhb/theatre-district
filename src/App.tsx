// Theatre District — app shell.
// Street-first: title screen → the street, with the Production Desk and
// build palette arriving in later sessions. The legacy Broadway Tycoon
// shell was replaced in Session 1; its show-production systems return
// through the Production Desk in Session 5.

import { useCallback, useEffect, useState } from 'react';
import { DistrictCanvas, type PeepThought } from './game/render/DistrictCanvas';
import { calendarLabel, dayPhase } from './game/sim/calendar';
import type { Speed } from './game/sim/clock';
import { resetSims } from './game/sim/runtime';
import { mostRecentSave } from './store/saves';
import { useTDStore } from './store/store';
import { BuildPalette } from './ui/BuildPalette';
import { NotificationToast } from './ui/components/NotificationToast';
import { SelectionCard } from './ui/SelectionCard';
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
          onClick={() => {
            resetSims();
            newGame(name);
          }}
          className="w-64 rounded border border-amber-700 bg-amber-950/60 px-4 py-2 text-amber-100 hover:bg-amber-900/60"
        >
          New District
        </button>
        {hasSave && (
          <button
            onClick={() => {
              const state = mostRecentSave();
              if (state) {
                resetSims();
                hydrate(state);
              }
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
        <BuildButton />
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

function BuildButton() {
  const paletteOpen = useTDStore((s) => s.ui.paletteOpen);
  const togglePalette = useTDStore((s) => s.togglePalette);
  return (
    <button
      onClick={togglePalette}
      title="B"
      className={`rounded px-2 py-1 text-xs ${
        paletteOpen ? 'bg-amber-800 text-amber-100' : 'border border-gray-700 text-gray-400 hover:bg-gray-800'
      }`}
    >
      Build
    </button>
  );
}

export default function App() {
  const initialized = useTDStore((s) => s.initialized);
  const paletteOpen = useTDStore((s) => s.ui.paletteOpen);
  const [savesOpen, setSavesOpen] = useState(false);
  const [hoverBuzz, setHoverBuzz] = useState<string | null>(null);
  const [thought, setThought] = useState<PeepThought | null>(null);
  const onHoverBuzz = useCallback((label: string | null) => setHoverBuzz(label), []);
  const onThought = useCallback((t: PeepThought) => {
    setThought(t);
    window.setTimeout(() => setThought((cur) => (cur === t ? null : cur)), 3200);
  }, []);

  // Global keyboard: Space pause · 1/2/3 speeds · B build · Tab buzz · Esc cancel.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const s = useTDStore.getState();
      if (e.code === 'Space') {
        e.preventDefault();
        s.togglePause();
      } else if (e.key === '1') s.setSpeed('normal');
      else if (e.key === '2') s.setSpeed('fast');
      else if (e.key === '3') s.setSpeed('ultra');
      else if (e.key === 'b' || e.key === 'B') s.togglePalette();
      else if (e.key === 'Tab') {
        e.preventDefault();
        s.toggleBuzzOverlay();
      } else if (e.key === 'Escape') {
        if (s.ui.tool) s.setTool(null);
        else if (s.ui.selectedId) s.select(null);
      }
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
        <DistrictCanvas onHoverBuzz={onHoverBuzz} onThought={onThought} />
        {paletteOpen && <BuildPalette />}
        <SelectionCard />
        {hoverBuzz !== null && (
          <div className="pointer-events-none absolute top-2 left-1/2 z-20 -translate-x-1/2 rounded border border-amber-900/40 bg-gray-950/90 px-2 py-1 font-mono text-xs text-amber-200">
            Buzz {hoverBuzz}
          </div>
        )}
        {thought && (
          <div
            className="pointer-events-none absolute z-30 max-w-56 -translate-x-1/2 -translate-y-full rounded-lg border border-amber-900/40 bg-[#f2e8d5] px-3 py-1.5 text-xs text-gray-900 shadow-xl"
            style={{ left: thought.sx, top: thought.sy - 14, fontFamily: 'Georgia, serif' }}
          >
            {thought.text}
            <div className="absolute left-1/2 top-full h-0 w-0 -translate-x-1/2 border-x-6 border-t-6 border-x-transparent border-t-[#f2e8d5]" />
          </div>
        )}
      </div>
      {savesOpen && <SaveMenu onClose={() => setSavesOpen(false)} />}
      <NotificationToast />
      {devEnabled() && <DevPanel />}
    </div>
  );
}
