// Marketing system: campaigns, buzz calculation, and decay
import type { MarketingOption } from '../../types';

export interface MarketingCampaign {
  id: string;
  type: MarketingOption;
  label: string;
  cost: number;
  buzzGain: number;
  duration: number;       // total days
  daysRemaining: number;  // days left
  startDay: number;
}

export interface MarketingDefinition {
  type: MarketingOption;
  label: string;
  cost: number;
  buzzGain: number;
  duration: number;
}

export const MARKETING_OPTIONS: MarketingDefinition[] = [
  { type: 'social_media',  label: 'Social Media',  cost: 1_000,  buzzGain: 5,  duration: 7 },
  { type: 'poster',        label: 'Poster',         cost: 2_000,  buzzGain: 8,  duration: 14 },
  { type: 'newspaper_ad',  label: 'Newspaper Ad',   cost: 3_000,  buzzGain: 10, duration: 14 },
  { type: 'radio_ad',      label: 'Radio Ad',       cost: 5_000,  buzzGain: 15, duration: 21 },
  { type: 'billboard',     label: 'Billboard',      cost: 10_000, buzzGain: 20, duration: 30 },
  { type: 'tv_ad',         label: 'TV Ad',          cost: 15_000, buzzGain: 30, duration: 28 },
];

const MAX_BUZZ = 100;
const BUZZ_DECAY_PER_DAY = 1;

/**
 * Create a new marketing campaign.
 */
export function createCampaign(
  definition: MarketingDefinition,
  hasPublicist: boolean,
  currentDay: number,
): MarketingCampaign {
  const buzzMod = hasPublicist ? 1.15 : 1.0;
  return {
    id: crypto.randomUUID(),
    type: definition.type,
    label: definition.label,
    cost: definition.cost,
    buzzGain: Math.round(definition.buzzGain * buzzMod),
    duration: definition.duration,
    daysRemaining: definition.duration,
    startDay: currentDay,
  };
}

/**
 * Process daily marketing tick: decay buzz, tick campaign durations.
 * Returns updated buzz and campaigns.
 */
export function processMarketingDay(
  currentBuzz: number,
  campaigns: MarketingCampaign[],
): { buzz: number; campaigns: MarketingCampaign[]; expiredCampaigns: MarketingCampaign[] } {
  // Natural buzz decay
  let buzz = Math.max(0, currentBuzz - BUZZ_DECAY_PER_DAY);

  // Tick campaigns
  const activeCampaigns: MarketingCampaign[] = [];
  const expiredCampaigns: MarketingCampaign[] = [];

  for (const campaign of campaigns) {
    const remaining = campaign.daysRemaining - 1;
    if (remaining <= 0) {
      expiredCampaigns.push(campaign);
    } else {
      activeCampaigns.push({ ...campaign, daysRemaining: remaining });
    }
  }

  // Buzz from active campaigns is already applied at launch time
  // Clamp buzz
  buzz = Math.min(MAX_BUZZ, Math.max(0, buzz));

  return { buzz, campaigns: activeCampaigns, expiredCampaigns };
}

/**
 * Calculate buzz gain from launching a campaign, clamped to MAX_BUZZ.
 */
export function applyBuzzGain(currentBuzz: number, gain: number): number {
  return Math.min(MAX_BUZZ, currentBuzz + gain);
}
