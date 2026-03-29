// Show data: name generation, archetypes, and show factory
import type { Show, ShowGenre, ShowArchetype, ShowArchetypeName, ShowRole } from '../../types';

// ---- Word pools for title generation ----

const ADJECTIVES = [
  'Crimson', 'Endless', 'Velvet', 'Golden', 'Shattered', 'Burning',
  'Silent', 'Midnight', 'Wicked', 'Radiant', 'Broken', 'Electric',
  'Haunted', 'Scarlet', 'Fallen', 'Starless', 'Bitter', 'Stolen',
  'Hidden', 'Savage', 'Tender', 'Reckless', 'Phantom', 'Emerald',
  'Hollow', 'Twilight', 'Sacred', 'Restless', 'Untamed', 'Fading',
];

const NOUNS = [
  'Sunset', 'Boulevard', 'Mirror', 'Kingdom', 'Waltz', 'Requiem',
  'Garden', 'Masquerade', 'Shadow', 'Curtain', 'Overture', 'Legacy',
  'Tempest', 'Lullaby', 'Promise', 'Soliloquy', 'Reverie', 'Elegy',
  'Mirage', 'Canticle', 'Nocturne', 'Crescendo', 'Rhapsody', 'Aria',
  'Labyrinth', 'Cascade', 'Silhouette', 'Dream', 'Midnight', 'Encore',
];

const PLACES = [
  'Broadway', 'Harlem', 'Paris', 'Vienna', 'Havana', 'Montmartre',
  'Venice', 'Cairo', 'Babylon', 'Constantinople', 'Soho', 'Kyoto',
  'Marrakech', 'Buenos Aires', 'Savannah',
];

const NAMES = [
  'Eleanor', 'Marcus', 'Josephine', 'Dominic', 'Vivian', 'Theodore',
  'Celeste', 'Raphael', 'Beatrice', 'Lorenzo', 'Isadora', 'Solomon',
  'Adelaide', 'Cassius', 'Delilah', 'Ambrose', 'Cordelia', 'Valentine',
  'Rosalind', 'Octavius',
];

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInRange(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ---- Title templates ----

type TitleTemplate = () => string;

const TITLE_TEMPLATES: TitleTemplate[] = [
  // "Adjective Noun"
  () => `${randomFrom(ADJECTIVES)} ${randomFrom(NOUNS)}`,
  // "The Noun of Place"
  () => `The ${randomFrom(NOUNS)} of ${randomFrom(PLACES)}`,
  // "Name's Noun"
  () => `${randomFrom(NAMES)}'s ${randomFrom(NOUNS)}`,
  // "The Adjective Noun"
  () => `The ${randomFrom(ADJECTIVES)} ${randomFrom(NOUNS)}`,
  // "Noun in Place"
  () => `${randomFrom(NOUNS)} in ${randomFrom(PLACES)}`,
  // "Name & the Noun"
  () => `${randomFrom(NAMES)} & the ${randomFrom(NOUNS)}`,
  // Single dramatic word
  () => `${randomFrom(NOUNS)}!`,
];

export function generateShowTitle(): string {
  return randomFrom(TITLE_TEMPLATES)();
}

// ---- Archetypes ----

export const SHOW_ARCHETYPES: Record<ShowArchetypeName, ShowArchetype> = {
  crowd_pleaser: {
    name: 'crowd_pleaser',
    label: 'Crowd Pleaser',
    scriptQualityRange: [40, 70],
    appealRange: [70, 95],
    complexityRange: [1, 2],
    castSizeRange: [5, 10],
    budgetRange: [50_000, 150_000],
  },
  critics_darling: {
    name: 'critics_darling',
    label: "Critics' Darling",
    scriptQualityRange: [70, 95],
    appealRange: [30, 60],
    complexityRange: [3, 4],
    castSizeRange: [4, 8],
    budgetRange: [80_000, 200_000],
  },
  big_spectacle: {
    name: 'big_spectacle',
    label: 'Big Spectacle',
    scriptQualityRange: [50, 80],
    appealRange: [60, 85],
    complexityRange: [4, 5],
    castSizeRange: [8, 15],
    budgetRange: [150_000, 400_000],
  },
  intimate_chamber: {
    name: 'intimate_chamber',
    label: 'Intimate Chamber',
    scriptQualityRange: [60, 85],
    appealRange: [40, 65],
    complexityRange: [2, 3],
    castSizeRange: [3, 5],
    budgetRange: [30_000, 80_000],
  },
  dark_horse: {
    name: 'dark_horse',
    label: 'Dark Horse',
    scriptQualityRange: [20, 95],
    appealRange: [20, 90],
    complexityRange: [1, 5],
    castSizeRange: [3, 12],
    budgetRange: [40_000, 250_000],
  },
  safe_bet: {
    name: 'safe_bet',
    label: 'Safe Bet',
    scriptQualityRange: [50, 65],
    appealRange: [65, 80],
    complexityRange: [2, 3],
    castSizeRange: [5, 8],
    budgetRange: [60_000, 120_000],
  },
};

const ARCHETYPE_NAMES = Object.keys(SHOW_ARCHETYPES) as ShowArchetypeName[];
const GENRES: ShowGenre[] = ['musical', 'play', 'revival', 'experimental'];

// ---- Role generation ----

const LEAD_ROLE_NAMES = [
  'The Protagonist', 'The Hero', 'The Dreamer', 'The Outcast',
  'The Lover', 'The Rebel', 'The Visionary', 'The Stranger',
];

const SUPPORTING_ROLE_NAMES = [
  'The Confidant', 'The Mentor', 'The Rival', 'The Friend',
  'The Narrator', 'The Guardian', 'The Trickster', 'The Sage',
];

function generateRoles(castSize: number): ShowRole[] {
  const roles: ShowRole[] = [];
  const numLeads = Math.max(1, Math.floor(castSize * 0.2));
  const numSupporting = Math.max(1, Math.floor(castSize * 0.3));
  const numEnsemble = Math.max(1, castSize - numLeads - numSupporting);

  const usedLeads = new Set<string>();
  for (let i = 0; i < numLeads; i++) {
    let name: string;
    do {
      name = randomFrom(LEAD_ROLE_NAMES);
    } while (usedLeads.has(name) && usedLeads.size < LEAD_ROLE_NAMES.length);
    usedLeads.add(name);
    roles.push({
      id: crypto.randomUUID(),
      name,
      type: 'lead',
      castMemberId: null,
    });
  }

  const usedSupporting = new Set<string>();
  for (let i = 0; i < numSupporting; i++) {
    let name: string;
    do {
      name = randomFrom(SUPPORTING_ROLE_NAMES);
    } while (usedSupporting.has(name) && usedSupporting.size < SUPPORTING_ROLE_NAMES.length);
    usedSupporting.add(name);
    roles.push({
      id: crypto.randomUUID(),
      name,
      type: 'supporting',
      castMemberId: null,
    });
  }

  for (let i = 0; i < numEnsemble; i++) {
    roles.push({
      id: crypto.randomUUID(),
      name: `Ensemble ${i + 1}`,
      type: 'ensemble',
      castMemberId: null,
    });
  }

  return roles;
}

// ---- Show factory ----

export function generateShow(genre?: ShowGenre): Show {
  const selectedGenre = genre ?? randomFrom(GENRES);
  const archetype = SHOW_ARCHETYPES[randomFrom(ARCHETYPE_NAMES)];
  const scriptQuality = randomInRange(...archetype.scriptQualityRange);
  const audienceAppeal = randomInRange(...archetype.appealRange);
  const complexity = randomInRange(...archetype.complexityRange);
  const idealCastSize = randomInRange(...archetype.castSizeRange);
  const idealBudget = randomInRange(
    Math.floor(archetype.budgetRange[0] / 1000) * 1000,
    Math.floor(archetype.budgetRange[1] / 1000) * 1000,
  );

  const rehearsalDays = 14 + complexity * 5 + Math.floor(idealCastSize / 3);

  return {
    id: crypto.randomUUID(),
    title: generateShowTitle(),
    genre: selectedGenre,
    archetype: archetype.name,
    scriptQuality,
    audienceAppeal,
    complexity,
    idealCastSize,
    idealBudget,
    commissioned: false,
    commissionDeliveryDay: null,
    roles: generateRoles(idealCastSize),
    quality: 0,
    rehearsalProgress: 0,
    rehearsalDaysTotal: rehearsalDays,
    rehearsalDaysCompleted: 0,
    isRehearsing: false,
    isRunning: false,
    openingNight: null,
    closingNight: null,
    totalRevenue: 0,
    totalPerformances: 0,
    averageAttendance: 0,
    criticScore: null,
    buzzScore: 0,
  };
}
