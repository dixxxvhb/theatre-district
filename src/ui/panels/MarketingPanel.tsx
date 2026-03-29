// Marketing panel: launch campaigns, view buzz meter, manage active campaigns
import { useGameStore } from '../../store/gameStore';
import { MARKETING_OPTIONS, createCampaign } from '../../game/systems/MarketingSystem';
import type { MarketingCampaignState } from '../../types';

export function MarketingPanel() {
  const cash = useGameStore((s) => s.economy.cash);
  const shows = useGameStore((s) => s.shows);
  const activeShowId = useGameStore((s) => s.activeShowId);
  const crew = useGameStore((s) => s.crew);
  const campaigns = useGameStore((s) => s.activeMarketingCampaigns);
  const day = useGameStore((s) => s.time.day);
  const addMarketingCampaign = useGameStore((s) => s.addMarketingCampaign);
  const removeCash = useGameStore((s) => s.removeCash);
  const updateShow = useGameStore((s) => s.updateShow);

  const activeShow = shows.find((s) => s.id === activeShowId);
  if (!activeShow) return null;

  const hasPublicist = crew.some((c) => c.role === 'publicist' && c.hired);
  const buzzScore = activeShow.buzzScore;

  const handleLaunchCampaign = (optionIndex: number) => {
    const option = MARKETING_OPTIONS[optionIndex];
    if (cash < option.cost) return;

    const campaign = createCampaign(option, hasPublicist, day);
    const campaignState: MarketingCampaignState = {
      id: campaign.id,
      type: campaign.type,
      label: campaign.label,
      cost: campaign.cost,
      buzzGain: campaign.buzzGain,
      duration: campaign.duration,
      daysRemaining: campaign.daysRemaining,
      startDay: campaign.startDay,
    };

    addMarketingCampaign(campaignState);
    removeCash(option.cost, 'marketing', `${option.label} campaign`);

    // Apply buzz gain immediately
    const newBuzz = Math.min(100, activeShow.buzzScore + campaign.buzzGain);
    updateShow(activeShow.id, { buzzScore: newBuzz });
  };

  const buzzColor = buzzScore > 66 ? 'from-amber-500 to-yellow-300' :
                    buzzScore > 33 ? 'from-orange-500 to-amber-400' :
                                     'from-red-600 to-orange-500';

  return (
    <div className="w-72 bg-gray-950/95 border-l border-amber-900/30 flex flex-col overflow-y-auto">
      <div className="p-4 border-b border-gray-800/40">
        <h2
          className="text-amber-200 text-sm font-bold tracking-wide"
          style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
        >
          Marketing
        </h2>
        <p className="text-gray-500 text-xs mt-1">{activeShow.title}</p>
      </div>

      {/* Buzz Meter */}
      <div className="p-4 border-b border-gray-800/30">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-gray-400 uppercase tracking-wider">Buzz</span>
          <span className="text-sm font-mono text-amber-300">{Math.round(buzzScore)}/100</span>
        </div>
        <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
          <div
            className={`h-full bg-gradient-to-r ${buzzColor} rounded-full transition-all duration-300`}
            style={{ width: `${buzzScore}%` }}
          />
        </div>
        {hasPublicist && (
          <p className="text-xs text-emerald-500 mt-1">+15% effectiveness (Publicist)</p>
        )}
      </div>

      {/* Campaign Options */}
      <div className="p-4 border-b border-gray-800/30">
        <h3 className="text-xs text-gray-400 uppercase tracking-wider mb-3">Launch Campaign</h3>
        <div className="space-y-2">
          {MARKETING_OPTIONS.map((option, i) => {
            const canAfford = cash >= option.cost;
            const effectiveBuzz = hasPublicist
              ? Math.round(option.buzzGain * 1.15)
              : option.buzzGain;

            return (
              <button
                key={option.type}
                onClick={() => handleLaunchCampaign(i)}
                disabled={!canAfford}
                className={`w-full text-left p-2.5 rounded-lg border transition-all ${
                  canAfford
                    ? 'bg-gray-900/60 border-gray-700/40 hover:border-amber-700/50 hover:bg-gray-800/60 cursor-pointer'
                    : 'bg-gray-900/30 border-gray-800/20 opacity-40 cursor-not-allowed'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs text-amber-200 font-medium">{option.label}</span>
                  <span className="text-xs text-gray-400 font-mono">${option.cost.toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-[10px] text-emerald-400">+{effectiveBuzz} buzz</span>
                  <span className="text-[10px] text-gray-500">{option.duration} days</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Campaigns */}
      <div className="p-4">
        <h3 className="text-xs text-gray-400 uppercase tracking-wider mb-3">
          Active Campaigns ({campaigns.length})
        </h3>
        {campaigns.length === 0 ? (
          <p className="text-xs text-gray-600 italic">No active campaigns</p>
        ) : (
          <div className="space-y-2">
            {campaigns.map((c) => {
              const progress = ((c.duration - c.daysRemaining) / c.duration) * 100;
              return (
                <div
                  key={c.id}
                  className="p-2 bg-gray-900/40 border border-gray-800/30 rounded-lg"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-300">{c.label}</span>
                    <span className="text-[10px] text-gray-500">{c.daysRemaining}d left</span>
                  </div>
                  <div className="h-1 bg-gray-800 rounded-full mt-1.5 overflow-hidden">
                    <div
                      className="h-full bg-amber-700/60 rounded-full transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
