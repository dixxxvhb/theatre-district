// BuildingSprite — placeholder iso-extruded box for a placed street building.
// Real Kenney-sourced facades land in Session 2.5/3 (asset pipeline already
// scaffolded; just need the textures dropped in).
//
// Each kind picks its color from BUILDING_PALETTE and its height from a
// per-kind table here. zIndex is computed from the back-most footprint tile.

import { Container, Graphics } from 'pixi.js';
import type { PlacedBuilding } from '../../../types';
import { TILE } from '../../data/constants';
import { BUILDING_PALETTE, PALETTE } from '../assets/palette';
import { gridToScreen } from '../coords';
import { LAYER, zIndex } from '../depth';

/** Height in pixels per building kind. Provisional — playtest tunes. */
const KIND_HEIGHT: Record<string, number> = {
  theatre:    180,
  restaurant: 110,
  cart:        70,
  placeholder: 80,
};

export class BuildingSprite {
  readonly container = new Container();
  private graphics = new Graphics();
  building: PlacedBuilding;

  constructor(building: PlacedBuilding) {
    this.building = building;
    this.container.label = `bld-${building.kind}-${building.id.slice(-4)}`;
    this.container.addChild(this.graphics);
    this.draw();
    this.applyZ();
  }

  update(building: PlacedBuilding): void {
    this.building = building;
    this.draw();
    this.applyZ();
  }

  private draw(): void {
    const g = this.graphics;
    g.clear();

    const { kind, position, footprint, constructionDaysLeft } = this.building;
    const palette = BUILDING_PALETTE[kind] ?? BUILDING_PALETTE.placeholder;
    const baseHeight = KIND_HEIGHT[kind] ?? KIND_HEIGHT.placeholder;
    // Foundation/framed/finished derived from constructionDaysLeft:
    //   built (0) → full height, full color
    //   framed (>0 but recent) → mid height, lighter
    //   foundation (just placed) → flat outline only
    const stage = constructionDaysLeft === 0 ? 'finished'
      : constructionDaysLeft < 3 ? 'framed'
      : 'foundation';

    const { width: w, height: h } = footprint;
    const { x: gx, y: gy } = position;

    // Footprint corners in screen space (tile-center adjusted).
    const halfW = TILE.ISO_WIDTH / 2;
    const halfH = TILE.ISO_HEIGHT / 2;
    const adjust = (p: { x: number; y: number }) => ({ x: p.x + halfW, y: p.y + halfH });
    const A = adjust(gridToScreen(gx, gy));               // back
    const B = adjust(gridToScreen(gx + w, gy));           // right
    const C = adjust(gridToScreen(gx + w, gy + h));       // front
    const D = adjust(gridToScreen(gx, gy + h));           // left

    // Foundation: just outline the footprint
    if (stage === 'foundation') {
      g.moveTo(A.x, A.y).lineTo(B.x, B.y).lineTo(C.x, C.y).lineTo(D.x, D.y).closePath();
      g.fill({ color: palette.trim, alpha: 0.4 });
      g.stroke({ color: PALETTE.ink, width: 2, alpha: 0.9 });
      return;
    }

    const heightPx = stage === 'framed' ? baseHeight * 0.55 : baseHeight;

    // Right wall (light face)
    g.moveTo(B.x, B.y)
      .lineTo(C.x, C.y)
      .lineTo(C.x, C.y - heightPx)
      .lineTo(B.x, B.y - heightPx)
      .closePath();
    g.fill({ color: palette.wall, alpha: 1 });
    g.stroke({ color: PALETTE.ink, width: 1.5, alpha: 0.85 });

    // Left wall (shadow face)
    g.moveTo(D.x, D.y)
      .lineTo(C.x, C.y)
      .lineTo(C.x, C.y - heightPx)
      .lineTo(D.x, D.y - heightPx)
      .closePath();
    // Mix wall with coal for shadow tone
    g.fill({ color: shadowOf(palette.wall), alpha: 1 });
    g.stroke({ color: PALETTE.ink, width: 1.5, alpha: 0.85 });

    // Roof (top diamond)
    g.moveTo(A.x, A.y - heightPx)
      .lineTo(B.x, B.y - heightPx)
      .lineTo(C.x, C.y - heightPx)
      .lineTo(D.x, D.y - heightPx)
      .closePath();
    g.fill({ color: stage === 'framed' ? PALETTE.dust : palette.roof, alpha: 1 });
    g.stroke({ color: PALETTE.ink, width: 1.5, alpha: 0.85 });

    // Framed: hatch lines on roof to suggest skeleton
    if (stage === 'framed') {
      const steps = 6;
      for (let i = 1; i < steps; i++) {
        const t = i / steps;
        const x1 = A.x + (B.x - A.x) * t;
        const y1 = A.y + (B.y - A.y) * t - heightPx;
        const x2 = D.x + (C.x - D.x) * t;
        const y2 = D.y + (C.y - D.y) * t - heightPx;
        g.moveTo(x1, y1).lineTo(x2, y2);
        g.stroke({ color: palette.trim, width: 1, alpha: 0.6 });
      }
    }

    // Finished: marquee strip on theatres
    if (stage === 'finished' && kind === 'theatre') {
      const stripH = 14;
      const stripY = -heightPx + 8;
      g.moveTo(A.x, A.y + stripY)
        .lineTo(B.x, B.y + stripY)
        .lineTo(B.x, B.y + stripY + stripH)
        .lineTo(A.x, A.y + stripY + stripH)
        .closePath();
      g.fill({ color: palette.trim, alpha: 1 });
      g.stroke({ color: PALETTE.ink, width: 1, alpha: 0.85 });
    }
  }

  private applyZ(): void {
    const { position, footprint } = this.building;
    // Back-most tile of the footprint defines z; back tiles draw under front
    this.container.zIndex = zIndex(
      position.x + footprint.width - 1,
      position.y + footprint.height - 1,
      LAYER.WALL,
    );
  }

  destroy(): void {
    this.graphics.destroy();
    this.container.destroy();
  }
}

/** Mix a color with coal (PALETTE.coal) for shadow tone. ~50% blend. */
function shadowOf(color: number): number {
  const r1 = (color >> 16) & 0xff;
  const g1 = (color >> 8) & 0xff;
  const b1 = color & 0xff;
  const r2 = (PALETTE.coal >> 16) & 0xff;
  const g2 = (PALETTE.coal >> 8) & 0xff;
  const b2 = PALETTE.coal & 0xff;
  const r = Math.round(r1 * 0.55 + r2 * 0.45);
  const gOut = Math.round(g1 * 0.55 + g2 * 0.45);
  const b = Math.round(b1 * 0.55 + b2 * 0.45);
  return (r << 16) | (gOut << 8) | b;
}
