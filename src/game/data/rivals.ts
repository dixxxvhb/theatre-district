import type { RivalTheater, ShowGenre } from '../../types';

interface RivalConfig {
  personality: 'upstart' | 'corporate' | 'legacy';
  namePool: string[];
  reputation: [number, number];
  cash: [number, number];
  preferredGenres: ShowGenre[];
  budgetRange: [number, number];
  showInterval: [number, number];
  marketingRate: number;
  criticCap: number;
  appearsAtAct: number;
}

export const RIVAL_CONFIGS: RivalConfig[] = [
  {
    personality: 'upstart',
    namePool: ['The Fringe Collective', 'Off-Center Stage', 'The Little Engine', 'Rogue Players'],
    reputation: [20, 35],
    cash: [100_000, 200_000],
    preferredGenres: ['experimental', 'play', 'one_person_show'],
    budgetRange: [30_000, 80_000],
    showInterval: [25, 40],
    marketingRate: 2,
    criticCap: 95,
    appearsAtAct: 2,
  },
  {
    personality: 'corporate',
    namePool: ['Sterling Productions', 'Apex Entertainment', 'Gilded Stage Inc.', 'Paramount Players'],
    reputation: [40, 55],
    cash: [500_000, 1_000_000],
    preferredGenres: ['musical', 'revival'],
    budgetRange: [150_000, 400_000],
    showInterval: [30, 50],
    marketingRate: 8,
    criticCap: 70,
    appearsAtAct: 3,
  },
  {
    personality: 'legacy',
    namePool: ['The Belmont Theatre', 'The Grand Monarch', 'Astor Playhouse', 'The Crown Theatre'],
    reputation: [60, 75],
    cash: [800_000, 1_500_000],
    preferredGenres: ['play', 'musical'],
    budgetRange: [200_000, 500_000],
    showInterval: [35, 55],
    marketingRate: 5,
    criticCap: 95,
    appearsAtAct: 4,
  },
];

export function createRival(config: RivalConfig): RivalTheater {
  const name = config.namePool[Math.floor(Math.random() * config.namePool.length)];
  const [minRep, maxRep] = config.reputation;
  const [minCash, maxCash] = config.cash;

  return {
    id: `rival_${config.personality}`,
    name,
    personality: config.personality,
    reputation: minRep + Math.floor(Math.random() * (maxRep - minRep)),
    cash: minCash + Math.floor(Math.random() * (maxCash - minCash)),
    currentShow: null,
    buzz: 0,
    showHistory: [],
    appearsAtAct: config.appearsAtAct,
    active: false,
  };
}

export function createAllRivals(): RivalTheater[] {
  return RIVAL_CONFIGS.map(createRival);
}

const SHOW_TITLE_PARTS = {
  adjectives: ['Neon', 'Crimson', 'Hollow', 'Silver', 'Broken', 'Burning', 'Velvet', 'Midnight', 'Golden', 'Fallen'],
  nouns: ['Dreams', 'Curtains', 'Shadows', 'Lights', 'Bones', 'Crown', 'Silence', 'Thunder', 'Mirrors', 'Stars'],
};

export function generateRivalShowTitle(): string {
  const adj = SHOW_TITLE_PARTS.adjectives[Math.floor(Math.random() * SHOW_TITLE_PARTS.adjectives.length)];
  const noun = SHOW_TITLE_PARTS.nouns[Math.floor(Math.random() * SHOW_TITLE_PARTS.nouns.length)];
  return `${adj} ${noun}`;
}
