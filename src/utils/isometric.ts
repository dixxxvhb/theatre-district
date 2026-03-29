// Isometric projection math utilities

export interface ScreenPos {
  x: number;
  y: number;
}

export interface GridPos {
  x: number;
  y: number;
}

/**
 * Convert grid coordinates to screen (pixel) coordinates in isometric projection.
 */
export function gridToScreen(
  gridX: number,
  gridY: number,
  tileWidth: number,
  tileHeight: number,
): ScreenPos {
  return {
    x: (gridX - gridY) * (tileWidth / 2),
    y: (gridX + gridY) * (tileHeight / 2),
  };
}

/**
 * Convert screen (pixel) coordinates to grid coordinates in isometric projection.
 * Returns fractional grid coords — caller should Math.floor() for cell lookup.
 */
export function screenToGrid(
  screenX: number,
  screenY: number,
  tileWidth: number,
  tileHeight: number,
): GridPos {
  const halfW = tileWidth / 2;
  const halfH = tileHeight / 2;
  return {
    x: Math.floor((screenX / halfW + screenY / halfH) / 2),
    y: Math.floor((screenY / halfH - screenX / halfW) / 2),
  };
}
