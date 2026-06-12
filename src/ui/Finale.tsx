// The District Gala — Era 5 finale. Plays once when the player enters Era 5
// (the District), ceremonially recapping their run with archetype recognitions
// (Impresario / Mogul / Streetmaker) derived from how they actually played.

import { useEffect, useState } from 'react';
import { useTDStore } from '../store/store';

function archetypeOf(state: ReturnType<typeof useTDStore.getState>) {
  // Streetmaker: most decorations and amenities.
  const decorations = state.street.decorations.length;
  const amenities = state.street.buildings.filter((b) => !b.kind.startsWith('theatre_')).length;
  const streetScore = decorations * 1 + amenities * 3;
  // Mogul: total gross and theatre count.
  const gross = Object.values(state.productions).reduce((n, p) => n + p.gross, 0);
  const theatres = state.street.buildings.filter((b) => b.kind.startsWith('theatre_')).length;
  const mogulScore = gross / 1000 + theatres * 30;
  // Impresario: high-quality shows + critic raves.
  const raves = Object.values(state.productions).reduce(
    (n, p) => n + (p.reviews?.filter((r) => r.stars >= 4).length ?? 0),
    0,
  );
  const avgQuality = Object.values(state.productions).reduce((n, p) => n + p.quality, 0) / Math.max(1, Object.keys(state.productions).length);
  const impresarioScore = avgQuality * 0.7 + raves * 12;

  const scores = [
    { name: 'The Impresario', score: impresarioScore, line: 'Theatre — not as enterprise, but as the thing it is.' },
    { name: 'The Mogul', score: mogulScore, line: 'A district that pays for itself many times over.' },
    { name: 'The Streetmaker', score: streetScore, line: 'A block that’s a destination on its own — show or no show.' },
  ];
  scores.sort((a, b) => b.score - a.score);
  return scores[0];
}

export function Finale() {
  const era = useTDStore((s) => s.street.era);
  const finalePlayed = useTDStore((s) => s.finalePlayed);
  const markPlayed = useTDStore((s) => s.markFinalePlayed);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (era === 4 && !finalePlayed) setOpen(true);
  }, [era, finalePlayed]);

  if (!open) return null;
  const state = useTDStore.getState();
  const winner = archetypeOf(state);
  const grossTotal = Object.values(state.productions).reduce((n, p) => n + p.gross, 0);
  const showCount = Object.keys(state.productions).length;

  const close = () => {
    markPlayed();
    setOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85">
      <div className="w-[36rem] rounded-lg border border-amber-700 bg-[#1a1320] p-8 text-amber-100 shadow-2xl">
        <div className="text-center">
          <div className="text-[10px] uppercase tracking-[0.4em] text-amber-700">The District Gala</div>
          <h2 className="mt-1 text-3xl" style={{ fontFamily: 'Georgia, serif' }}>
            Lights up.
          </h2>
          <p className="mt-3 text-sm text-gray-400">
            The marquees ignite together for the first time as one. The street is no longer the Dark Block, the Strip, or the Destination.
            It’s a District. The city knows it by name.
          </p>
        </div>

        <div className="mt-6 rounded border border-amber-900/40 bg-[#0e0b14] p-4 text-center">
          <div className="text-[10px] uppercase tracking-widest text-amber-700">You played as</div>
          <div className="mt-1 text-2xl text-amber-200" style={{ fontFamily: 'Georgia, serif' }}>
            {winner.name}
          </div>
          <div className="mt-1 text-sm italic text-gray-300">{winner.line}</div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs text-gray-400">
          <div>
            <div className="text-amber-200 text-base font-mono">{showCount}</div>
            <div>Shows produced</div>
          </div>
          <div>
            <div className="text-amber-200 text-base font-mono">${grossTotal.toLocaleString()}</div>
            <div>Lifetime gross</div>
          </div>
          <div>
            <div className="text-amber-200 text-base font-mono">{state.time.day}</div>
            <div>Days at the helm</div>
          </div>
        </div>

        <p className="mt-5 text-center text-xs text-gray-500">
          Freeplay continues — the street keeps living. The marquees stay lit.
        </p>
        <button
          onClick={close}
          className="mt-3 w-full rounded border border-amber-700 bg-amber-950/70 py-2 text-sm hover:bg-amber-900/60"
        >
          Take a bow
        </button>
      </div>
    </div>
  );
}
