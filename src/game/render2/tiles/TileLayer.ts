// Street-layer ground tiles. Procedural sidewalk diamonds; Kenney atlas swap in Session 2.

import { Container, Graphics } from 'pixi.js';
import { TILE } from '../../data/constants';
import { PALETTE, STREET_PALETTE } from '../assets/palette';
import { gridToScreen } from '../coords';
import { LAYER } from '../depth';

export interface GridBounds {
  minX: number;
  maxX: number; // inclusive
  minY: number;
  maxY: number; // inclusive
}

/**
 * TileLayer draws the ground plane of the street: sidewalk on owned lots,
 * empty-lot dirt elsewhere. Hover + selection overlays are separate Graphics
 * so they redraw without rebuilding the whole ground.
 */
export class TileLayer {
  readonly container = new Container();
  private graphics = new Graphics();
  private hoverGraphics = new Graphics();
  private selectionGraphics = new Graphics();

  constructor() {
    this.container.label = 'TileLayer';
    this.container.addChild(this.graphics);
    this.container.addChild(this.hoverGraphics);
    this.container.addChild(this.selectionGraphics);
    this.graphics.zIndex = LAYER.GROUND;
    this.hoverGraphics.zIndex = LAYER.GROUND + 1;
    this.selectionGraphics.zIndex = LAYER.GROUND + 2;
  }

  /**
   * Draw the ground for a rectangular range of grid cells.
   * `isOwned(gx, gy)` decides whether the tile reads as sidewalk (owned) or empty-lot (unowned).
   */
  drawGround(bounds: GridBounds, isOwned: (gx: number, gy: number) => boolean): void {
    this.graphics.clear();
    for (let gy = bounds.minY; gy <= bounds.maxY; gy++) {
      for (let gx = bounds.minX; gx <= bounds.maxX; gx++) {
        const checker = (gx + gy) % 2 === 0;
        const owned = isOwned(gx, gy);
        const color = owned
          ? (checker ? STREET_PALETTE.sidewalk : STREET_PALETTE.sidewalkAlt)
          : STREET_PALETTE.emptyLot;
        this.fillDiamond(this.graphics, gx, gy, color, 1);
        this.strokeDiamond(this.graphics, gx, gy, STREET_PALETTE.grid, 0.45, 1);
        // Owned tiles get a subtle inner panel seam — reads as concrete slab edges
        if (owned) {
          this.drawSidewalkDetail(gx, gy);
        }
      }
    }
  }

  /** Inner panel seam + occasional sidewalk crack / manhole pattern. */
  private drawSidewalkDetail(gx: number, gy: number): void {
    const g = this.graphics;
    const screen = gridToScreen(gx, gy);
    const halfW = TILE.ISO_WIDTH / 2;
    const halfH = TILE.ISO_HEIGHT / 2;
    const cx = screen.x + halfW;
    const cy = screen.y + halfH;
    // Inner panel: smaller diamond inset 20% from edges
    const inset = 0.78;
    const ihW = halfW * inset;
    const ihH = halfH * inset;
    g.moveTo(cx, cy - ihH).lineTo(cx + ihW, cy).lineTo(cx, cy + ihH).lineTo(cx - ihW, cy).closePath();
    g.stroke({ color: STREET_PALETTE.outline, alpha: 0.18, width: 1 });

    // Deterministic "crack" on tiles where (gx*7 + gy*13) % 11 === 0
    if (((gx * 7 + gy * 13) % 11) === 0) {
      g.moveTo(cx - 30, cy - 5).lineTo(cx - 10, cy + 2).lineTo(cx + 6, cy - 4).lineTo(cx + 28, cy + 3);
      g.stroke({ color: STREET_PALETTE.outline, alpha: 0.25, width: 1 });
    }
    // Manhole on tiles where (gx*5 + gy*9) % 17 === 0
    if (((gx * 5 + gy * 9) % 17) === 0) {
      g.ellipse(cx, cy, 12, 6).fill({ color: STREET_PALETTE.road, alpha: 0.6 });
      g.ellipse(cx, cy, 12, 6).stroke({ color: STREET_PALETTE.outline, alpha: 0.5, width: 1 });
    }
  }

  drawHover(gx: number | null, gy: number | null): void {
    this.hoverGraphics.clear();
    if (gx === null || gy === null) return;
    this.fillDiamond(this.hoverGraphics, gx, gy, PALETTE.cream, 0.18);
    this.strokeDiamond(this.hoverGraphics, gx, gy, PALETTE.cream, 0.6, 2);
  }

  drawSelection(gx: number | null, gy: number | null): void {
    this.selectionGraphics.clear();
    if (gx === null || gy === null) return;
    this.fillDiamond(this.selectionGraphics, gx, gy, PALETTE.brass, 0.25);
    this.strokeDiamond(this.selectionGraphics, gx, gy, PALETTE.brass, 0.9, 2);
  }

  private fillDiamond(g: Graphics, gx: number, gy: number, color: number, alpha: number): void {
    const { x, y } = gridToScreen(gx, gy);
    const halfW = TILE.ISO_WIDTH / 2;
    const halfH = TILE.ISO_HEIGHT / 2;
    g.moveTo(x + halfW, y);
    g.lineTo(x + TILE.ISO_WIDTH, y + halfH);
    g.lineTo(x + halfW, y + TILE.ISO_HEIGHT);
    g.lineTo(x, y + halfH);
    g.closePath();
    g.fill({ color, alpha });
  }

  private strokeDiamond(g: Graphics, gx: number, gy: number, color: number, alpha: number, width: number): void {
    const { x, y } = gridToScreen(gx, gy);
    const halfW = TILE.ISO_WIDTH / 2;
    const halfH = TILE.ISO_HEIGHT / 2;
    g.moveTo(x + halfW, y);
    g.lineTo(x + TILE.ISO_WIDTH, y + halfH);
    g.lineTo(x + halfW, y + TILE.ISO_HEIGHT);
    g.lineTo(x, y + halfH);
    g.closePath();
    g.stroke({ color, alpha, width });
  }
}
