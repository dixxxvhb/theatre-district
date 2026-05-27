// Street-layer building + decoration definitions.
// Cost, footprint (in tiles), build days, simple description.
// Balance: starting cash $500k, tuning is provisional — playtest after
// Session 4 will inform real numbers.

import type { BuildingKind, DecorationKind, Size } from '../../types';

export interface BuildingDefinition {
  kind: BuildingKind;
  label: string;
  description: string;
  footprint: Size;
  cost: number;
  buildDays: number;
  /** Whether this building hosts a Theatre interior (opens click-into modal in Session 6). */
  isTheatre: boolean;
}

export interface DecorationDefinition {
  kind: DecorationKind;
  label: string;
  description: string;
  cost: number;
}

export const BUILDING_DEFINITIONS: Record<BuildingKind, BuildingDefinition> = {
  theatre: {
    kind: 'theatre',
    label: 'Theatre',
    description: 'A theatre. Click after construction to produce shows inside.',
    footprint: { width: 2, height: 2 },
    cost: 80_000,
    buildDays: 14,
    isTheatre: true,
  },
  restaurant: {
    kind: 'restaurant',
    label: 'Restaurant',
    description: 'Pre-show diners spend here. Boosts adjacent theatre buzz.',
    footprint: { width: 1, height: 2 },
    cost: 25_000,
    buildDays: 5,
    isTheatre: false,
  },
  cart: {
    kind: 'cart',
    label: 'Food Cart',
    description: 'Cheap, mobile. Catches post-show rush.',
    footprint: { width: 1, height: 1 },
    cost: 4_000,
    buildDays: 1,
    isTheatre: false,
  },
};

export const DECORATION_DEFINITIONS: Record<DecorationKind, DecorationDefinition> = {
  lamp:          { kind: 'lamp',          label: 'Street Lamp',    description: 'Warm light. Small buzz, no maintenance.', cost: 600  },
  tree:          { kind: 'tree',          label: 'Tree',           description: 'Green relief. Modest buzz.',              cost: 800  },
  fountain:      { kind: 'fountain',      label: 'Fountain',       description: 'Centerpiece. Larger buzz pull.',           cost: 6_000 },
  bench:         { kind: 'bench',         label: 'Bench',          description: 'Sitting spot. Tiny buzz.',                cost: 300  },
  poster:        { kind: 'poster',        label: 'Poster Kiosk',   description: 'Advertise your shows. Buzz to theatres.', cost: 1_500 },
  string_lights: { kind: 'string_lights', label: 'String Lights',  description: 'Festive. Boosts evening buzz.',           cost: 1_200 },
};

/** Per-plot acquisition cost. Scales with how big the street already is. */
export function plotAcquisitionCost(currentPlotCount: number): number {
  // Starting 24 plots are free; first acquired plot is $5k; price climbs gently.
  const beyondStarter = Math.max(0, currentPlotCount - 24);
  return 5_000 + beyondStarter * 500;
}
