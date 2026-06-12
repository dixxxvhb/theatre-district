// Street/Theatre event modal — auto-pausing (the store pauses when an event
// lands). Playbill-styled like the director-decision modal.

import { eventById } from '../../game/sim/events';
import { useTDStore } from '../../store/store';

export function EventModal() {
  const pending = useTDStore((s) => s.pendingEvent);
  const resolve = useTDStore((s) => s.resolveEvent);

  if (!pending) return null;
  const event = eventById(pending.eventId);
  if (!event) return null;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/75">
      <div className="w-[30rem] rounded-lg border border-amber-900/50 bg-[#f2e8d5] p-5 text-gray-900 shadow-2xl">
        <div className="text-[10px] uppercase tracking-[0.3em] text-amber-800">
          {event.scope === 'street' ? 'On the street' : 'At the stage door'}
        </div>
        <h3 className="mt-1 text-xl" style={{ fontFamily: 'Georgia, serif' }}>
          {event.title}
        </h3>
        <p className="mt-2 text-sm text-gray-700">{event.description}</p>
        <div className="mt-4 space-y-2">
          {event.choices.map((c, i) => (
            <button
              key={i}
              onClick={() => resolve(i)}
              className="block w-full rounded border border-amber-900/40 bg-white/60 p-3 text-left hover:bg-white"
            >
              <div className="text-sm font-semibold">{c.text}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
