// The Daily Playbill — the game's recap voice. Newspaper-styled panel with
// the last few entries: openings, reviews, events, closings. Toggled from
// the top bar.

import { useTDStore } from '../store/store';

export function Playbill({ onClose }: { onClose: () => void }) {
  const entries = useTDStore((s) => s.playbill);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/65" onClick={onClose}>
      <div
        className="w-[34rem] max-h-[75vh] overflow-y-auto rounded-lg border border-amber-900/40 bg-[#f2e8d5] p-5 text-gray-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-baseline justify-between border-b-2 border-double border-gray-700 pb-2">
          <h2 className="text-2xl tracking-tight" style={{ fontFamily: 'Georgia, serif' }}>
            The Daily Playbill
          </h2>
          <button
            onClick={onClose}
            className="rounded border border-amber-900/40 bg-white/60 px-2 py-0.5 text-xs hover:bg-white"
          >
            Close
          </button>
        </div>
        {entries.length === 0 ? (
          <p className="mt-4 text-sm text-gray-600">A quiet day on the street. Tomorrow will write itself.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {entries.map((e, i) => (
              <li key={`${e.day}-${i}`} className="border-b border-gray-300/70 pb-3 last:border-0">
                <div className="text-[10px] uppercase tracking-widest text-amber-800">Day {e.day}</div>
                <div className="text-base font-semibold leading-tight" style={{ fontFamily: 'Georgia, serif' }}>
                  {e.headline}
                </div>
                {e.lines.map((l, j) => (
                  <div key={j} className="mt-1 text-sm text-gray-700">
                    {l}
                  </div>
                ))}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
