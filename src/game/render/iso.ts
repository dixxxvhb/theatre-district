// Isometric projection math. 2:1 diamonds, grid → world pixels.
// (x grows east along the street, y grows south across it.)

import { ISO } from '../config/balance';

export interface WorldPos {
  wx: number;
  wy: number;
}

/** Center of tile (x, y) in world space. */
export function gridToWorld(x: number, y: number): WorldPos {
  return {
    wx: (x - y) * (ISO.TILE_WIDTH / 2),
    wy: (x + y) * (ISO.TILE_HEIGHT / 2),
  };
}

/** Inverse projection; returns fractional grid coords (floor for the tile). */
export function worldToGrid(wx: number, wy: number): { gx: number; gy: number } {
  const halfW = ISO.TILE_WIDTH / 2;
  const halfH = ISO.TILE_HEIGHT / 2;
  return {
    gx: (wx / halfW + wy / halfH) / 2,
    gy: (wy / halfH - wx / halfW) / 2,
  };
}

/** World-space bounding box of a w×h grid, with padding. */
export function gridBounds(cols: number, rows: number, pad = 0) {
  const corners = [
    gridToWorld(0, 0),
    gridToWorld(cols - 1, 0),
    gridToWorld(0, rows - 1),
    gridToWorld(cols - 1, rows - 1),
  ];
  const xs = corners.map((c) => c.wx);
  const ys = corners.map((c) => c.wy);
  return {
    minX: Math.min(...xs) - ISO.TILE_WIDTH / 2 - pad,
    maxX: Math.max(...xs) + ISO.TILE_WIDTH / 2 + pad,
    minY: Math.min(...ys) - ISO.TILE_HEIGHT / 2 - pad,
    maxY: Math.max(...ys) + ISO.TILE_HEIGHT / 2 + pad,
  };
}
