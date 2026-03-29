// Property definitions for Broadway Tycoon.
// All balance numbers come from the GDD property table.

import type { Property, PropertyCondition } from '../../types';

/**
 * Construction cost modifiers by property condition.
 * Poor buildings cost more to build in; pristine ones cost less.
 */
export const CONDITION_COST_MODIFIERS: Record<PropertyCondition, number> = {
  poor: 1.5,
  fair: 1.25,
  good: 1.0,
  excellent: 0.9,
  pristine: 0.8,
};

/**
 * Renovation paths: what it costs and how long it takes
 * to upgrade a property from one condition to the next.
 */
export const RENOVATION_COSTS: { from: PropertyCondition; to: PropertyCondition; cost: number; days: number }[] = [
  { from: 'poor', to: 'fair', cost: 50_000, days: 10 },
  { from: 'fair', to: 'good', cost: 75_000, days: 7 },
];

/**
 * The five properties available for purchase at game start.
 * Sorted by price ascending (natural progression order).
 */
export const AVAILABLE_PROPERTIES: Property[] = [
  {
    id: 'dusty_loft',
    name: 'The Dusty Loft',
    address: '312 W 36th St',
    lot: 'small',
    cost: 250_000,
    gridSize: { width: 12, height: 8 },
    locationBonus: { attendance: 0, ticketPrice: 0 },
    condition: 'poor',
    constructionCostModifier: CONDITION_COST_MODIFIERS.poor,
    maxSeats: 150,
    unlockReputation: 0,
    rooms: [],
    purchased: false,
  },
  {
    id: 'midtown_fixer',
    name: 'Midtown Fixer',
    address: '228 W 47th St',
    lot: 'small',
    cost: 500_000,
    gridSize: { width: 14, height: 10 },
    locationBonus: { attendance: 0.05, ticketPrice: 0 },
    condition: 'fair',
    constructionCostModifier: CONDITION_COST_MODIFIERS.fair,
    maxSeats: 250,
    unlockReputation: 0,
    rooms: [],
    purchased: false,
  },
  {
    id: 'west_44th_classic',
    name: 'West 44th Classic',
    address: '256 W 44th St',
    lot: 'medium',
    cost: 1_200_000,
    gridSize: { width: 16, height: 12 },
    locationBonus: { attendance: 0.10, ticketPrice: 0.05 },
    condition: 'good',
    constructionCostModifier: CONDITION_COST_MODIFIERS.good,
    maxSeats: 400,
    unlockReputation: 25,
    rooms: [],
    purchased: false,
  },
  {
    id: 'times_square_palace',
    name: 'Times Square Palace',
    address: '1515 Broadway',
    lot: 'large',
    cost: 3_000_000,
    gridSize: { width: 20, height: 14 },
    locationBonus: { attendance: 0.20, ticketPrice: 0.10 },
    condition: 'excellent',
    constructionCostModifier: CONDITION_COST_MODIFIERS.excellent,
    maxSeats: 800,
    unlockReputation: 50,
    rooms: [],
    purchased: false,
  },
  {
    id: 'broadway_crown',
    name: 'The Broadway Crown',
    address: '225 W 44th St',
    lot: 'large',
    cost: 8_000_000,
    gridSize: { width: 24, height: 16 },
    locationBonus: { attendance: 0.30, ticketPrice: 0.15 },
    condition: 'pristine',
    constructionCostModifier: CONDITION_COST_MODIFIERS.pristine,
    maxSeats: 1200,
    unlockReputation: 80,
    rooms: [],
    purchased: false,
  },
];
