// Session 1 placeholder street renderer — flat diamonds colored by tile kind
// so topology, camera, and era growth are visually verifiable. Session 2's
// Marquee Noir rendering kit replaces this entirely.
//
// Redraws only when the era (street length) changes — never per frame.

import { Container, Graphics } from 'pixi.js';
import { STREET, ISO } from '../config/balance';
import { columnsForEra, tileKind, type TileKind } from '../street/topology';
import { gridToWorld } from './iso';

const KIND_COLORS: Record<TileKind, number> = {
  lot_north: 0x141a2a,
  sidewalk_north: 0x2b2f3d,
  road: 0x1d2029,
  sidewalk_south: 0x2b2f3d,
  lot_south: 0x141a2a,
};

export class DebugStreetView {
  readonly container = new Container();
  private tiles = new Graphics();
  private drawnEra = -1;

  constructor() {
    this.container.addChild(this.tiles);
  }

  draw(eraIndex: number): void {
    if (eraIndex === this.drawnEra) return;
    this.drawnEra = eraIndex;

    const cols = columnsForEra(eraIndex);
    const g = this.tiles;
    g.clear();

    const hw = ISO.TILE_WIDTH / 2;
    const hh = ISO.TILE_HEIGHT / 2;

    for (let y = 0; y < STREET.TOTAL_ROWS; y++) {
      for (let x = 0; x < cols; x++) {
        const { wx, wy } = gridToWorld(x, y);
        g.moveTo(wx, wy - hh)
          .lineTo(wx + hw, wy)
          .lineTo(wx, wy + hh)
          .lineTo(wx - hw, wy)
          .closePath()
          .fill({ color: KIND_COLORS[tileKind(y)] })
          .stroke({ color: 0x232838, width: 1, alpha: 0.6 });
      }
    }
  }
}
