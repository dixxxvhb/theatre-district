// Almanac (H) — every teach card the player has seen, plus the eras list.
// Press H any time to re-read.

import { ERAS } from '../game/data/eras';
import { TEACH_CARDS } from '../game/data/teachCards';
import { useTDStore } from '../store/store';

export function Almanac({ onClose }: { onClose: () => void }) {
  const seen = useTDStore((s) => s.seenTeachCards);
  const era = useTDStore((s) => s.street.era);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/65" onClick={onClose}>
      <div
        className="w-[40rem] max-h-[80vh] overflow-y-auto rounded-lg border border-amber-900/40 bg-[#f2e8d5] p-5 text-gray-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-baseline justify-between border-b-2 border-double border-gray-700 pb-2">
          <h2 className="text-2xl" style={{ fontFamily: 'Georgia, serif' }}>
            Almanac
          </h2>
          <button onClick={onClose} className="rounded border border-amber-900/40 bg-white/60 px-2 py-0.5 text-xs hover:bg-white">
            Close
          </button>
        </div>

        <h3 className="mt-4 text-xs uppercase tracking-widest text-amber-800">Eras of the street</h3>
        <ol className="mt-2 space-y-1.5 text-sm">
          {ERAS.map((e, i) => (
            <li key={e.index} className={i === era ? 'font-semibold' : i < era ? 'text-gray-500' : 'text-gray-400'}>
              <span className="font-mono text-xs text-amber-800">{i + 1}.</span> {e.name} — <span className="italic">{e.subtitle}</span>
            </li>
          ))}
        </ol>

        <h3 className="mt-5 text-xs uppercase tracking-widest text-amber-800">Notes for the producer</h3>
        <ul className="mt-2 space-y-3">
          {TEACH_CARDS.filter((c) => seen.includes(c.id)).map((c) => (
            <li key={c.id} className="border-b border-gray-300/70 pb-2 last:border-0">
              <div className="text-sm font-semibold" style={{ fontFamily: 'Georgia, serif' }}>
                {c.title}
              </div>
              <div className="text-sm text-gray-700">{c.body}</div>
            </li>
          ))}
          {seen.length === 0 && <li className="text-sm text-gray-600">Notes will collect here as you encounter new systems.</li>}
        </ul>
      </div>
    </div>
  );
}
