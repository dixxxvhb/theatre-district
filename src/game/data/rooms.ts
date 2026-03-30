// Room definitions for Broadway Tycoon.
// Every room type the player can build, with its base stats.

import type { RoomType, RoomDefinition } from '../../types';

/**
 * Complete room catalog. Keys match RoomType union values.
 * Colors are chosen for clear visual distinction on the floor plan.
 *
 * minSize = absolute smallest the player can place/drag
 * defaultSize = what click-to-place uses (the "standard" size)
 * baseCost is for the defaultSize; smaller rooms cost less, larger cost more.
 */
export const ROOM_DEFINITIONS: Record<RoomType, RoomDefinition> = {
  lobby: {
    type: 'lobby',
    name: 'Lobby',
    description: 'The grand entrance where patrons gather before the show.',
    minSize: { width: 2, height: 2 },
    defaultSize: { width: 3, height: 3 },
    baseCost: 15_000,
    buildDays: 3,
    required: true,
    color: '#E8D5B7',  // warm beige
  },
  box_office: {
    type: 'box_office',
    name: 'Box Office',
    description: 'Where tickets are sold and will-call is managed.',
    minSize: { width: 1, height: 1 },
    defaultSize: { width: 2, height: 2 },
    baseCost: 8_000,
    buildDays: 2,
    required: true,
    color: '#B8D4E3',  // soft blue
  },
  seating: {
    type: 'seating',
    name: 'Seating',
    description: 'The house — rows of seats facing the stage.',
    minSize: { width: 2, height: 2 },
    defaultSize: { width: 4, height: 4 },
    baseCost: 25_000,
    buildDays: 5,
    required: true,
    color: '#C62828',  // theater red
  },
  stage: {
    type: 'stage',
    name: 'Stage',
    description: 'The performance area. The heart of every theater.',
    minSize: { width: 2, height: 2 },
    defaultSize: { width: 4, height: 3 },
    baseCost: 30_000,
    buildDays: 5,
    required: true,
    color: '#5D4037',  // dark wood
  },
  backstage: {
    type: 'backstage',
    name: 'Backstage',
    description: 'Behind the curtain — crew staging and quick changes.',
    minSize: { width: 2, height: 1 },
    defaultSize: { width: 3, height: 3 },
    baseCost: 20_000,
    buildDays: 4,
    required: true,
    color: '#455A64',  // blue-gray
  },
  dressing_room: {
    type: 'dressing_room',
    name: 'Dressing Room',
    description: 'Where cast members prepare and get into character.',
    minSize: { width: 1, height: 1 },
    defaultSize: { width: 2, height: 3 },
    baseCost: 12_000,
    buildDays: 3,
    required: false,
    color: '#F48FB1',  // pink
  },
  orchestra_pit: {
    type: 'orchestra_pit',
    name: 'Orchestra Pit',
    description: 'Sunken area for live musicians. Essential for musicals.',
    minSize: { width: 2, height: 1 },
    defaultSize: { width: 3, height: 2 },
    baseCost: 18_000,
    buildDays: 4,
    required: false,
    color: '#7E57C2',  // purple
  },
  rehearsal_hall: {
    type: 'rehearsal_hall',
    name: 'Rehearsal Hall',
    description: 'Dedicated space for rehearsals. Speeds up show preparation.',
    minSize: { width: 2, height: 2 },
    defaultSize: { width: 4, height: 4 },
    baseCost: 22_000,
    buildDays: 5,
    required: false,
    color: '#66BB6A',  // green
  },
  vip_lounge: {
    type: 'vip_lounge',
    name: 'VIP Lounge',
    description: 'An exclusive space for high-ticket patrons. Boosts premium revenue.',
    minSize: { width: 2, height: 2 },
    defaultSize: { width: 3, height: 3 },
    baseCost: 35_000,
    buildDays: 4,
    required: false,
    color: '#FFD54F',  // gold
  },
  concession: {
    type: 'concession',
    name: 'Concession Stand',
    description: 'Drinks and snacks for intermission. Generates extra revenue per show.',
    minSize: { width: 1, height: 1 },
    defaultSize: { width: 2, height: 2 },
    baseCost: 10_000,
    buildDays: 2,
    required: false,
    color: '#FF8A65',  // orange
  },
  storage: {
    type: 'storage',
    name: 'Storage Room',
    description: 'Props, costumes, and set pieces need somewhere to live.',
    minSize: { width: 1, height: 1 },
    defaultSize: { width: 2, height: 2 },
    baseCost: 5_000,
    buildDays: 1,
    required: false,
    color: '#8D6E63',  // brown
  },
  office: {
    type: 'office',
    name: 'Office',
    description: 'Administrative headquarters. Unlocks business features.',
    minSize: { width: 1, height: 1 },
    defaultSize: { width: 2, height: 2 },
    baseCost: 8_000,
    buildDays: 2,
    required: false,
    color: '#78909C',  // steel gray
  },
  tech_booth: {
    type: 'tech_booth',
    name: 'Tech Booth',
    description: 'Lighting and sound control center. Improves production quality.',
    minSize: { width: 1, height: 1 },
    defaultSize: { width: 2, height: 2 },
    baseCost: 15_000,
    buildDays: 3,
    required: false,
    color: '#26A69A',  // teal
  },
  green_room: {
    type: 'green_room',
    name: 'Green Room',
    description: 'Cast and crew lounge. Boosts morale during long runs.',
    minSize: { width: 2, height: 1 },
    defaultSize: { width: 3, height: 2 },
    baseCost: 12_000,
    buildDays: 3,
    required: false,
    color: '#81C784',  // light green
  },
  restrooms: {
    type: 'restrooms',
    name: 'Restrooms',
    description: 'Essential patron amenity. Lack of restrooms hurts reviews.',
    minSize: { width: 1, height: 1 },
    defaultSize: { width: 2, height: 2 },
    baseCost: 6_000,
    buildDays: 2,
    required: false,
    color: '#90CAF9',  // light blue
  },
};

/** Room types that must be built before a theater can open. */
export const REQUIRED_ROOMS: RoomType[] = Object.values(ROOM_DEFINITIONS)
  .filter((r) => r.required)
  .map((r) => r.type);
