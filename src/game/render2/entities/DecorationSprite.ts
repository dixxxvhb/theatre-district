// DecorationSprite — single-tile procedural prop (lamp, tree, bench, etc.).
// Pure Graphics, no textures. Procedural enough that real Kenney sprites
// can drop in later without API changes.

import { Container, Graphics } from 'pixi.js';
import type { PlacedDecoration } from '../../../types';
import { TILE } from '../../data/constants';
import { DECOR_PALETTE, PALETTE } from '../assets/palette';
import { gridToScreen } from '../coords';
import { LAYER, zIndex } from '../depth';

export class DecorationSprite {
  readonly container = new Container();
  private graphics = new Graphics();
  decoration: PlacedDecoration;

  constructor(decoration: PlacedDecoration) {
    this.decoration = decoration;
    this.container.label = `dec-${decoration.kind}-${decoration.id.slice(-4)}`;
    this.container.addChild(this.graphics);
    this.draw();
    this.applyZ();
  }

  update(decoration: PlacedDecoration): void {
    this.decoration = decoration;
    this.draw();
    this.applyZ();
  }

  private draw(): void {
    const g = this.graphics;
    g.clear();

    const { kind, position } = this.decoration;
    const palette = DECOR_PALETTE[kind] ?? DECOR_PALETTE.lamp;

    // Tile center
    const screen = gridToScreen(position.x, position.y);
    const cx = screen.x + TILE.ISO_WIDTH / 2;
    const cy = screen.y + TILE.ISO_HEIGHT / 2;

    switch (kind) {
      case 'lamp':
        // Cast-iron pole with decorative collar + glowing globe
        g.rect(cx - 3, cy - 80, 6, 80).fill({ color: palette.primary });
        g.rect(cx - 6, cy - 60, 12, 4).fill({ color: palette.primary });   // mid-shaft collar
        g.rect(cx - 8, cy - 90, 16, 4).fill({ color: palette.primary });   // top bracket
        g.circle(cx, cy - 95, 10).fill({ color: palette.accent });          // bulb
        g.circle(cx, cy - 95, 18).fill({ color: palette.accent, alpha: 0.35 }); // halo inner
        g.circle(cx, cy - 95, 26).fill({ color: palette.accent, alpha: 0.15 }); // halo outer
        break;
      case 'tree': {
        // Trunk + 3 stacked diamond canopy
        g.rect(cx - 4, cy - 30, 8, 30).fill({ color: palette.accent });
        for (let i = 0; i < 3; i++) {
          const yOff = -50 - i * 28;
          const r = 26 - i * 4;
          g.moveTo(cx, cy + yOff - r).lineTo(cx + r, cy + yOff).lineTo(cx, cy + yOff + r).lineTo(cx - r, cy + yOff).closePath();
          g.fill({ color: palette.primary });
          g.stroke({ color: PALETTE.ink, width: 1, alpha: 0.6 });
        }
        break;
      }
      case 'fountain': {
        // Two-tier basin (lower iso diamond + upper smaller diamond) + spout + water shimmer
        const bw = 80;
        const bh = 40;
        // Lower basin
        g.moveTo(cx, cy - bh / 2).lineTo(cx + bw / 2, cy).lineTo(cx, cy + bh / 2).lineTo(cx - bw / 2, cy).closePath();
        g.fill({ color: palette.primary });
        g.stroke({ color: PALETTE.ink, width: 1.5, alpha: 0.85 });
        // Water sheen inside basin
        g.moveTo(cx, cy - bh / 2 + 6).lineTo(cx + bw / 2 - 8, cy).lineTo(cx, cy + bh / 2 - 6).lineTo(cx - bw / 2 + 8, cy).closePath();
        g.fill({ color: PALETTE.midnight, alpha: 0.55 });
        // Upper smaller basin
        const ubw = 40, ubh = 20;
        g.moveTo(cx, cy - 24 - ubh / 2).lineTo(cx + ubw / 2, cy - 24).lineTo(cx, cy - 24 + ubh / 2).lineTo(cx - ubw / 2, cy - 24).closePath();
        g.fill({ color: palette.primary });
        g.stroke({ color: PALETTE.ink, width: 1, alpha: 0.85 });
        // Central spout column + droplets
        g.rect(cx - 2, cy - 50, 4, 28).fill({ color: palette.accent });
        g.circle(cx, cy - 52, 4).fill({ color: palette.accent });
        g.circle(cx - 8, cy - 38, 2).fill({ color: PALETTE.bone, alpha: 0.7 });
        g.circle(cx + 8, cy - 36, 2).fill({ color: PALETTE.bone, alpha: 0.7 });
        g.circle(cx - 4, cy - 30, 1.5).fill({ color: PALETTE.bone, alpha: 0.6 });
        g.circle(cx + 4, cy - 30, 1.5).fill({ color: PALETTE.bone, alpha: 0.6 });
        break;
      }
      case 'bench': {
        g.rect(cx - 30, cy - 8, 60, 8).fill({ color: palette.primary });
        g.rect(cx - 30, cy - 16, 60, 4).fill({ color: palette.accent });
        // Legs
        g.rect(cx - 28, cy, 4, 14).fill({ color: palette.primary });
        g.rect(cx + 24, cy, 4, 14).fill({ color: palette.primary });
        break;
      }
      case 'poster': {
        g.rect(cx - 16, cy - 60, 32, 50).fill({ color: palette.primary });
        g.stroke({ color: palette.accent, width: 2 });
        g.rect(cx - 2, cy - 12, 4, 16).fill({ color: PALETTE.coal });
        break;
      }
      case 'string_lights': {
        // Slung line across top of tile w/ bulbs
        const span = TILE.ISO_WIDTH * 0.7;
        const yTop = cy - 50;
        for (let i = 0; i < 6; i++) {
          const t = i / 5;
          const x = cx - span / 2 + t * span;
          const sag = Math.sin(t * Math.PI) * 8;
          g.circle(x, yTop + sag, 4).fill({ color: palette.primary });
          g.circle(x, yTop + sag, 6).fill({ color: palette.primary, alpha: 0.4 });
        }
        // Hanging line
        g.moveTo(cx - span / 2, yTop);
        for (let i = 1; i <= 6; i++) {
          const t = i / 6;
          const x = cx - span / 2 + t * span;
          const sag = Math.sin(t * Math.PI) * 8;
          g.lineTo(x, yTop + sag);
        }
        g.stroke({ color: palette.accent, width: 1, alpha: 0.7 });
        break;
      }
    }
  }

  private applyZ(): void {
    const { position } = this.decoration;
    this.container.zIndex = zIndex(position.x, position.y, LAYER.PROP);
  }

  destroy(): void {
    this.graphics.destroy();
    this.container.destroy();
  }
}
