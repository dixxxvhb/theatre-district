// Isometric coordinate math for the street layer.
// Single source of truth for grid <-> screen.
// Street is single-plane; interior elevation lives in the theatre modal layer.

import { TILE } from '../data/constants';

export interface ScreenPos { x: number; y: number; }
export interface GridPos { x: number; y: number; }

/** Grid cell (gx, gy) to screen pixel position of the tile's top-center corner. */
export function gridToScreen(gx: number, gy: number): ScreenPos {
  const halfW = TILE.ISO_WIDTH / 2;
  const halfH = TILE.ISO_HEIGHT / 2;
  return {
    x: (gx - gy) * halfW,
    y: (gx + gy) * halfH,
  };
}

/** Inverse of gridToScreen. Returns fractional coords — caller should Math.floor() for lookup. */
export function screenToGrid(sx: number, sy: number): GridPos {
  const halfW = TILE.ISO_WIDTH / 2;
  const halfH = TILE.ISO_HEIGHT / 2;
  return {
    x: Math.floor((sx / halfW + sy / halfH) / 2),
    y: Math.floor((sy / halfH - sx / halfW) / 2),
  };
}

/**
 * Footprint anchor: which screen point a rectangular tile area's "front bottom"
 * should sit at. Used for placing building sprites and procedural geometry.
 * The front-most tile of a (gx, gy)-anchored (w, h) block is at (gx + w - 1, gy + h - 1).
 */
export function footprintAnchor(gx: number, gy: number, w: number, h: number): ScreenPos {
  const front = gridToScreen(gx + w - 1, gy + h - 1);
  return { x: front.x, y: front.y + TILE.ISO_HEIGHT };
}
