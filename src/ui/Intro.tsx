// Authored opening — three short steps to first opening night. Skippable
// (sets cash + restores playhouse + commissions the first show).

import { useState } from 'react';
import { useTDStore } from '../store/store';

export function Intro() {
  const introCompleted = useTDStore((s) => s.introCompleted);
  const initialized = useTDStore((s) => s.initialized);
  const markComplete = useTDStore((s) => s.markIntroComplete);
  const [step, setStep] = useState(0);

  if (!initialized || introCompleted) return null;

  const STEPS = [
    {
      title: 'Welcome to the Dark Block',
      body: 'One street, north to south. One derelict playhouse you inherited. $50,000. Most of the lamps don’t work. We’ll fix that.',
      action: 'Begin',
    },
    {
      title: 'Click your playhouse',
      body: 'Selecting a building shows its card. Yours says "derelict." That’s your first move: Restore for $15,000. The marquee lights up and the buzz flips from blight to glow.',
      action: 'Got it',
    },
    {
      title: 'Open Build (B) and dress the street',
      body: 'Place a couple of streetlamps and a lights swag, then click your playhouse → Production Desk to commission a show. The pipeline goes commission → cast → rehearse → previews → opening night.',
      action: 'I’m ready',
    },
  ];

  const card = STEPS[step];

  const skip = () => markComplete();
  const next = () => {
    if (step >= STEPS.length - 1) markComplete();
    else setStep(step + 1);
  };

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80">
      <div className="w-[28rem] rounded-lg border border-amber-900/40 bg-[#0e0b14] p-6 text-amber-100 shadow-2xl">
        <div className="text-[10px] uppercase tracking-[0.3em] text-amber-700">
          A short walk-through ({step + 1}/{STEPS.length})
        </div>
        <h2 className="mt-1 text-2xl" style={{ fontFamily: 'Georgia, serif' }}>
          {card.title}
        </h2>
        <p className="mt-3 text-sm text-gray-300">{card.body}</p>
        <div className="mt-5 flex items-center justify-between">
          <button onClick={skip} className="text-xs text-gray-500 underline hover:text-gray-300">
            Skip intro
          </button>
          <button
            onClick={next}
            className="rounded border border-amber-700 bg-amber-950/70 px-4 py-1.5 text-sm hover:bg-amber-900/60"
          >
            {card.action}
          </button>
        </div>
      </div>
    </div>
  );
}
