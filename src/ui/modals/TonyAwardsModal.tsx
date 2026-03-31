import { useState, useEffect } from 'react';
import { useGameStore } from '../../store/gameStore';
import { pushToast } from '../components/NotificationToast';

interface Props {
  showId: string;
  showTitle: string;
  onClose: () => void;
}

const CATEGORIES = ['Best Musical', 'Best Play', 'Best Direction', 'Best Performance'];

export function TonyAwardsModal({ showId, showTitle, onClose }: Props) {
  const [revealedIndex, setRevealedIndex] = useState(-1);
  const [results, setResults] = useState<boolean[]>([]);

  useEffect(() => {
    const show = useGameStore.getState().shows.find((s) => s.id === showId);
    const quality = show?.quality ?? 50;
    const winChance = 0.3 + (quality / 100) * 0.3;
    setResults(CATEGORIES.map(() => Math.random() < winChance));
  }, [showId]);

  useEffect(() => {
    if (revealedIndex < CATEGORIES.length - 1) {
      const timer = setTimeout(() => setRevealedIndex((i) => i + 1), 2000);
      return () => clearTimeout(timer);
    }
  }, [revealedIndex]);

  useEffect(() => {
    const timer = setTimeout(() => setRevealedIndex(0), 1000);
    return () => clearTimeout(timer);
  }, []);

  const wins = results.filter(Boolean).length;

  const handleClose = () => {
    if (wins > 0) {
      useGameStore.getState().awardTony(showId);
      pushToast(`"${showTitle}" wins ${wins} Tony Award${wins > 1 ? 's' : ''}!`, 'info');
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
      <div className="bg-gradient-to-b from-gray-900 to-gray-950 border border-amber-700/30 rounded-lg p-8 max-w-md w-full mx-4 text-center">
        <h2 className="text-xl font-bold text-amber-300 mb-1" style={{ fontFamily: 'Georgia, serif' }}>
          The Tony Awards
        </h2>
        <p className="text-sm text-gray-400 mb-6">And the nominees are...</p>

        <div className="space-y-3 mb-6">
          {CATEGORIES.map((cat, i) => (
            <div
              key={cat}
              className={`p-3 rounded border transition-all duration-500 ${
                i <= revealedIndex
                  ? results[i]
                    ? 'border-amber-600 bg-amber-900/20'
                    : 'border-gray-700 bg-gray-800/30'
                  : 'border-gray-800 bg-gray-900/50'
              }`}
            >
              <div className="text-xs text-gray-400 uppercase tracking-wider">{cat}</div>
              {i <= revealedIndex && (
                <div className={`text-sm font-bold mt-1 ${results[i] ? 'text-amber-300' : 'text-gray-500'}`}>
                  {results[i] ? `"${showTitle}" WINS!` : 'Not this time...'}
                </div>
              )}
            </div>
          ))}
        </div>

        {revealedIndex >= CATEGORIES.length - 1 && (
          <button
            onClick={handleClose}
            className="px-6 py-2 bg-amber-800 hover:bg-amber-700 text-white rounded-lg text-sm font-semibold transition-colors cursor-pointer"
          >
            {wins > 0 ? `Accept ${wins} Award${wins > 1 ? 's' : ''}` : 'Return to Theater'}
          </button>
        )}
      </div>
    </div>
  );
}
