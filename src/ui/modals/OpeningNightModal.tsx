import { useGameStore } from '../../store/gameStore';

export function OpeningNightModal() {
  const showModal = useGameStore((s) => s.showOpeningNightModal);
  const dismissOpeningNight = useGameStore((s) => s.dismissOpeningNight);
  const shows = useGameStore((s) => s.shows);
  const activeShowId = useGameStore((s) => s.activeShowId);
  const castMembers = useGameStore((s) => s.castMembers);

  const activeShow = shows.find((s) => s.id === activeShowId);

  if (!showModal || !activeShow) return null;

  const genreLabels: Record<string, string> = {
    musical: 'Musical',
    play: 'Play',
    revival: 'Revival',
    experimental: 'Experimental',
    one_person_show: 'One-Person Show',
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/90 backdrop-blur-md">
      {/* Spotlight effect */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 40% 50% at 50% 40%, rgba(251, 191, 36, 0.08) 0%, transparent 70%)',
        }}
      />

      <div className="relative flex flex-col items-center text-center max-w-lg px-8">
        {/* Genre badge */}
        <div
          className="opening-night-badge mb-6 px-4 py-1 rounded-full border border-amber-700/40 bg-amber-950/30 text-amber-400 text-xs uppercase tracking-[0.2em]"
        >
          {genreLabels[activeShow.genre] ?? activeShow.genre}
        </div>

        {/* Main title */}
        <h1
          className="opening-night-title text-5xl text-amber-200 tracking-wide leading-tight"
          style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
        >
          Opening Night
        </h1>

        {/* Show title */}
        <h2
          className="opening-night-subtitle mt-4 text-2xl text-amber-100/80 italic"
          style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
        >
          {activeShow.title}
        </h2>

        {/* Divider */}
        <div className="opening-night-divider mt-8 mb-8 w-48 h-px bg-gradient-to-r from-transparent via-amber-600/50 to-transparent" />

        {/* Stats row */}
        <div className="opening-night-stats flex gap-8 mb-10">
          <div className="flex flex-col items-center">
            <span className="text-xs text-gray-500 uppercase tracking-wider mb-1">Quality</span>
            <span className="text-2xl font-mono text-amber-300 font-bold">{activeShow.quality}</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-xs text-gray-500 uppercase tracking-wider mb-1">Buzz</span>
            <span className="text-2xl font-mono text-amber-300 font-bold">{Math.round(activeShow.buzzScore)}</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-xs text-gray-500 uppercase tracking-wider mb-1">Cast</span>
            <span className="text-2xl font-mono text-amber-300 font-bold">{castMembers.length}</span>
          </div>
        </div>

        {/* CTA button */}
        <button
          onClick={dismissOpeningNight}
          className="opening-night-button px-10 py-4 bg-gradient-to-r from-amber-800/80 to-amber-700/60 border border-amber-600/60 rounded-lg text-amber-100 text-lg tracking-wide hover:from-amber-700/90 hover:to-amber-600/70 hover:border-amber-500/70 transition-all cursor-pointer shadow-lg shadow-amber-900/30"
          style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
        >
          Ring Up the Curtain
        </button>
      </div>
    </div>
  );
}
