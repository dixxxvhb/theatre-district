// Z-sort math for the iso street scene. Tall sprites (marquees, awnings, lamps)
// get explicit layer offsets so they sort above their base tile.

export const LAYER = {
  GROUND: 0,        // sidewalk, street
  FOOTPRINT: 10,    // building base, lot outline
  WALL: 20,         // building walls / facades
  PROP: 30,         // decoration (lamps, benches, trees)
  AWNING: 40,       // theatre awning, restaurant overhangs
  ROOF: 50,         // roofs, signage
  MARQUEE: 60,      // marquee lights, blinking signs
  UI_OVERLAY: 100,  // buzz heatmap, hover, selection
} as const;

const TILE_STRIDE = 1_000;

/**
 * zIndex priority. Higher = drawn on top.
 * Manhattan distance from origin sorts back-to-front; layer offset breaks ties for tall props.
 */
export function zIndex(gx: number, gy: number, layer: number): number {
  return (gx + gy) * TILE_STRIDE + layer;
}
