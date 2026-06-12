// Teach card modal — one playbill-styled card with a single illustration
// glyph and a dismiss button. Lives in Almanac afterward.

import { TEACH_CARDS } from '../game/data/teachCards';
import { useTDStore } from '../store/store';

export function TeachCardModal() {
  const id = useTDStore((s) => s.pendingTeachCardId);
  const dismiss = useTDStore((s) => s.dismissTeachCard);
  if (!id) return null;
  const card = TEACH_CARDS.find((c) => c.id === id);
  if (!card) return null;
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/65">
      <div className="w-[28rem] rounded-lg border border-amber-900/50 bg-[#f2e8d5] p-5 text-gray-900 shadow-2xl">
        <div className="text-[10px] uppercase tracking-[0.3em] text-amber-800">A note for the producer</div>
        <h3 className="mt-1 text-xl" style={{ fontFamily: 'Georgia, serif' }}>
          {card.title}
        </h3>
        <p className="mt-3 text-sm text-gray-700">{card.body}</p>
        <button
          onClick={dismiss}
          className="mt-4 w-full rounded border border-amber-900/40 bg-white/60 py-2 text-sm hover:bg-white"
        >
          I'll remember (it'll be in the Almanac)
        </button>
      </div>
    </div>
  );
}
