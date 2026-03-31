import { useGameStore } from '../../store/gameStore';

const GAME_OVER_MESSAGES: Record<string, { title: string; message: string }> = {
  bankruptcy: {
    title: 'The Lights Go Dark',
    message: 'The bills have piled up and the creditors are calling. Your theater closes its doors for the last time.',
  },
  reputation_death: {
    title: 'The Critics Have Spoken',
    message: 'Three consecutive flops have destroyed your reputation. No one will set foot in your theater again.',
  },
  outcompeted: {
    title: 'Stolen Spotlight',
    message: 'Your rivals have stolen the audience. With empty seats night after night, your theater goes dark.',
  },
};

export function GameOverModal() {
  const campaign = useGameStore((s) => s.campaign);
  const theaterName = useGameStore((s) => s.theaterName);
  const reputation = useGameStore((s) => s.reputation);
  const economy = useGameStore((s) => s.economy);

  if (!campaign.gameOver || !campaign.gameOverReason) return null;

  const content = GAME_OVER_MESSAGES[campaign.gameOverReason] ?? {
    title: 'Game Over',
    message: 'Your run has come to an end.',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90">
      <div className="bg-gray-950 border border-red-900/50 rounded-lg p-8 max-w-md w-full mx-4 text-center">
        <h1
          className="text-2xl font-bold text-red-400 mb-2"
          style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic' }}
        >
          {content.title}
        </h1>
        <p className="text-sm text-gray-400 mb-6">{content.message}</p>

        <div className="bg-gray-900 rounded p-4 mb-6 text-left space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Theater</span>
            <span className="text-white">{theaterName}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Shows Produced</span>
            <span className="text-white">{campaign.showCount}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Act Reached</span>
            <span className="text-white">{campaign.act} of 5</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Final Reputation</span>
            <span className="text-white">{reputation.score}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Final Balance</span>
            <span className={economy.cash >= 0 ? 'text-emerald-400' : 'text-red-400'}>
              ${economy.cash.toLocaleString()}
            </span>
          </div>
        </div>

        <button
          onClick={() => useGameStore.getState().resetGame()}
          className="px-6 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-sm font-semibold transition-colors cursor-pointer"
        >
          Return to Main Menu
        </button>
      </div>
    </div>
  );
}
