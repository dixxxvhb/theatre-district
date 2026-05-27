// LitterLayer — renders litter spots as small brown dots scattered on tiles.
// Updated when street.litter changes; sits between ground and decoration.

import { Container, Graphics } from 'pixi.js';
import { TILE } from '../../data/constants';
import { PALETTE } from '../assets/palette';
import { gridToScreen } from '../coords';
import { LAYER } from '../depth';
import type { StreetLitter } from '../../../types';

export class LitterLayer {
  readonly container = new Container();
  private graphics = new Graphics();

  constructor() {
    this.container.label = 'LitterLayer';
    this.container.addChild(this.graphics);
    this.graphics.zIndex = LAYER.GROUND + 5; // above ground, below decoration
  }

  draw(litter: StreetLitter[]): void {
    const g = this.graphics;
    g.clear();
    if (litter.length === 0) return;
    const halfW = TILE.ISO_WIDTH / 2;
    const halfH = TILE.ISO_HEIGHT / 2;

    for (const l of litter) {
      const screen = gridToScreen(l.x, l.y);
      const cx = screen.x + halfW;
      const cy = screen.y + halfH;
      // Scatter `amount` little dots in a deterministic pattern around the tile center
      const dots = Math.min(8, l.amount * 2);
      for (let i = 0; i < dots; i++) {
        const angle = (i * 137.5) * (Math.PI / 180); // golden-angle scatter
        const r = 10 + (i % 3) * 10;
        const px = cx + Math.cos(angle) * r;
        const py = cy + Math.sin(angle) * r * 0.5; // squashed for iso
        g.circle(px, py, 2 + (i % 2)).fill({ color: PALETTE.coal, alpha: 0.85 });
      }
    }
  }

  destroy(): void {
    this.graphics.destroy();
    this.container.destroy();
  }
}
