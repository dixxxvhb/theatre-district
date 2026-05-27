// BuzzOverlay — toggleable heat-map of street.buzzField.
// Single Graphics layer at LAYER.UI_OVERLAY. Gold = high, dark = low.
//
// Color interpolation: piecewise across (negative)→ink/coal, (zero)→dust,
// (positive)→brass→filament. Matches the Stage Door palette.

import { Container, Graphics } from 'pixi.js';
import { TILE } from '../../data/constants';
import { PALETTE } from '../assets/palette';
import { gridToScreen } from '../coords';
import { LAYER } from '../depth';
import type { GridBounds } from '../tiles/TileLayer';

export class BuzzOverlay {
  readonly container = new Container();
  private graphics = new Graphics();
  private visible = false;

  constructor() {
    this.container.label = 'BuzzOverlay';
    this.container.addChild(this.graphics);
    this.graphics.zIndex = LAYER.UI_OVERLAY;
    this.container.visible = false;
  }

  setVisible(show: boolean): void {
    this.visible = show;
    this.container.visible = show;
  }

  /** Redraw the heat-map for the given bounds + field. No-op if hidden. */
  draw(bounds: GridBounds, field: Float32Array, width: number, height: number): void {
    if (!this.visible) return;
    const g = this.graphics;
    g.clear();
    if (field.length === 0) return;

    // Symmetric normalization: scale by max absolute value so both
    // positive and negative readouts visualize at similar magnitude.
    let maxAbs = 0;
    for (let i = 0; i < field.length; i++) {
      const v = Math.abs(field[i]);
      if (v > maxAbs) maxAbs = v;
    }
    if (maxAbs === 0) return; // nothing emits

    const halfW = TILE.ISO_WIDTH / 2;
    const halfH = TILE.ISO_HEIGHT / 2;
    for (let gy = bounds.minY; gy <= bounds.maxY; gy++) {
      for (let gx = bounds.minX; gx <= bounds.maxX; gx++) {
        const idx = (gx - bounds.minX) + (gy - bounds.minY) * width;
        const v = field[idx] ?? 0;
        if (v === 0) continue;
        const norm = v / maxAbs;       // -1..1
        const { color, alpha } = colorFor(norm);
        const screen = gridToScreen(gx, gy);
        const x = screen.x;
        const y = screen.y;
        g.moveTo(x + halfW, y);
        g.lineTo(x + TILE.ISO_WIDTH, y + halfH);
        g.lineTo(x + halfW, y + TILE.ISO_HEIGHT);
        g.lineTo(x, y + halfH);
        g.closePath();
        g.fill({ color, alpha });
      }
    }
    // height arg kept for API symmetry (callers pass it; may grow into
    // bounds-clamped guards later). Mark as used.
    void height;
  }

  destroy(): void {
    this.graphics.destroy();
    this.container.destroy();
  }
}

/**
 * Map normalized buzz [-1..1] to (color, alpha).
 *   negative → coal/ink (dark wash, low alpha)
 *   ~zero    → invisible (alpha 0)
 *   positive → brass → filament (gold glow), alpha scales with magnitude
 */
function colorFor(norm: number): { color: number; alpha: number } {
  if (norm > 0) {
    // brass → filament interpolation
    const t = Math.min(1, norm);
    const color = lerpColor(PALETTE.brass, PALETTE.filament, t);
    const alpha = 0.18 + 0.55 * t;
    return { color, alpha };
  } else {
    // coal → ink for negative (litter)
    const t = Math.min(1, -norm);
    const color = lerpColor(PALETTE.coal, PALETTE.ink, t);
    const alpha = 0.25 + 0.45 * t;
    return { color, alpha };
  }
}

function lerpColor(a: number, b: number, t: number): number {
  const ar = (a >> 16) & 0xff;
  const ag = (a >> 8) & 0xff;
  const ab = a & 0xff;
  const br = (b >> 16) & 0xff;
  const bg = (b >> 8) & 0xff;
  const bb = b & 0xff;
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bC = Math.round(ab + (bb - ab) * t);
  return (r << 16) | (g << 8) | bC;
}
