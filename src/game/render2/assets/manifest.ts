// Asset manifest for the street-layer iso renderer.
//
// Source policy (per Theatre District prompt):
//   1. Kenney.nl CC0 isometric packs — primary
//   2. Style-consistent itch.io CC0 — only for gaps Kenney doesn't cover
//   3. Procedural in-code geometry — tile variants, lighting glows, marquee bulbs
//   NO AI-generated production art.
//
// Tile dimensions: 256×128 (Kenney isometric standard, locked in constants.ts).
//
// Session 1: manifest scaffold only — no atlas files loaded yet.
// Session 2: drop the Kenney packs under public/assets/kenney/ and fill in `bundles`.

import type { AssetsManifest } from 'pixi.js';

/**
 * PIXI.Assets manifest. Bundles are lazy-loaded by name (e.g.,
 * `await PIXI.Assets.loadBundle('street')`).
 *
 * Sub-bundles are split by what's needed in which session so we don't
 * preload everything at boot.
 */
export const ASSET_MANIFEST: AssetsManifest = {
  bundles: [
    {
      name: 'street-ground',
      // Sidewalk, road, empty-lot variants. Session 2.
      assets: [],
    },
    {
      name: 'buildings-theatre',
      // Marquees, facades, awnings, stage doors. Session 2.
      assets: [],
    },
    {
      name: 'buildings-amenity',
      // Restaurants, food carts. Session 2.
      assets: [],
    },
    {
      name: 'decoration',
      // Lamps, trees, benches, fountains, posters, string lights. Session 2.
      assets: [],
    },
    {
      name: 'people',
      // Crowd-particle sprites. Session 4 (ParticleContainer).
      assets: [],
    },
  ],
};

/** Bundle names — keep these in sync with the manifest. */
export const BUNDLE = {
  GROUND: 'street-ground',
  BUILDINGS_THEATRE: 'buildings-theatre',
  BUILDINGS_AMENITY: 'buildings-amenity',
  DECORATION: 'decoration',
  PEOPLE: 'people',
} as const;
export type BundleName = (typeof BUNDLE)[keyof typeof BUNDLE];
