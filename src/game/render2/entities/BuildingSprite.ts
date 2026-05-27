// BuildingSprite v2 — procedural iso building with windows, awning,
// marquee bulbs, and lit-window glow at night phases.
//
// Still 100% Graphics — no textures. The detail is in the layering:
//   1. Left + right wall extrusions
//   2. Roof (slanted ridge instead of flat diamond)
//   3. Window rows (more on theatres than carts)
//   4. Awning strip on the front face
//   5. Door indicator
//   6. Marquee strip (theatre only) with rows of bulb dots
//   7. Construction stage gating (foundation/framed)
//
// Lit-window glow reads useGameStore.getState().street.dailyPhase to
// brighten windows during preshow / curtain / postshow.

import { Container, Graphics } from 'pixi.js';
import type { PlacedBuilding } from '../../../types';
import { TILE } from '../../data/constants';
import { BUILDING_PALETTE, PALETTE } from '../assets/palette';
import { gridToScreen } from '../coords';
import { LAYER, zIndex } from '../depth';
import { useGameStore } from '../../../store/gameStore';

/** Height in pixels per building kind. */
const KIND_HEIGHT: Record<string, number> = {
  theatre:    220,
  restaurant: 130,
  cart:        80,
  placeholder: 90,
};

/** Phases when windows light up. */
const LIT_PHASES = new Set(['preshow', 'curtain', 'postshow']);

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
    const stage = constructionDaysLeft === 0 ? 'finished'
      : constructionDaysLeft < 3 ? 'framed'
      : 'foundation';

    const { width: w, height: h } = footprint;
    const { x: gx, y: gy } = position;

    const halfW = TILE.ISO_WIDTH / 2;
    const halfH = TILE.ISO_HEIGHT / 2;
    const adjust = (p: { x: number; y: number }) => ({ x: p.x + halfW, y: p.y + halfH });
    const A = adjust(gridToScreen(gx, gy));             // back
    const B = adjust(gridToScreen(gx + w, gy));         // right
    const C = adjust(gridToScreen(gx + w, gy + h));     // front
    const D = adjust(gridToScreen(gx, gy + h));         // left

    if (stage === 'foundation') {
      g.moveTo(A.x, A.y).lineTo(B.x, B.y).lineTo(C.x, C.y).lineTo(D.x, D.y).closePath();
      g.fill({ color: palette.trim, alpha: 0.4 });
      g.stroke({ color: PALETTE.ink, width: 2, alpha: 0.9 });
      return;
    }

    const heightPx = stage === 'framed' ? baseHeight * 0.55 : baseHeight;
    const lit = stage === 'finished' && LIT_PHASES.has(useGameStore.getState().street.dailyPhase);

    // ---- Right wall (light face) ----
    g.moveTo(B.x, B.y)
      .lineTo(C.x, C.y)
      .lineTo(C.x, C.y - heightPx)
      .lineTo(B.x, B.y - heightPx)
      .closePath();
    g.fill({ color: palette.wall, alpha: 1 });
    g.stroke({ color: PALETTE.ink, width: 1.5, alpha: 0.85 });

    // ---- Left wall (shadow face) ----
    g.moveTo(D.x, D.y)
      .lineTo(C.x, C.y)
      .lineTo(C.x, C.y - heightPx)
      .lineTo(D.x, D.y - heightPx)
      .closePath();
    g.fill({ color: shadowOf(palette.wall), alpha: 1 });
    g.stroke({ color: PALETTE.ink, width: 1.5, alpha: 0.85 });

    // ---- Windows on right wall (only for finished buildings) ----
    if (stage === 'finished' && kind !== 'cart') {
      this.drawWindowsOnWall(g, B, C, heightPx, kind, true /* lit-side */, lit, palette);
      this.drawWindowsOnWall(g, D, C, heightPx, kind, false /* shadow side */, lit, palette);
    }

    // ---- Roof: slanted ridge along long axis ----
    if (stage === 'finished') {
      const ridgeRise = kind === 'theatre' ? 18 : kind === 'restaurant' ? 12 : 6;
      const midBack = { x: (A.x + B.x) / 2, y: (A.y + B.y) / 2 - heightPx - ridgeRise };
      const midFront = { x: (D.x + C.x) / 2, y: (D.y + C.y) / 2 - heightPx - ridgeRise };
      // Left roof slope
      g.moveTo(A.x, A.y - heightPx)
        .lineTo(midBack.x, midBack.y)
        .lineTo(midFront.x, midFront.y)
        .lineTo(D.x, D.y - heightPx)
        .closePath();
      g.fill({ color: shadowOf(palette.roof), alpha: 1 });
      g.stroke({ color: PALETTE.ink, width: 1.5, alpha: 0.85 });
      // Right roof slope
      g.moveTo(B.x, B.y - heightPx)
        .lineTo(midBack.x, midBack.y)
        .lineTo(midFront.x, midFront.y)
        .lineTo(C.x, C.y - heightPx)
        .closePath();
      g.fill({ color: palette.roof, alpha: 1 });
      g.stroke({ color: PALETTE.ink, width: 1.5, alpha: 0.85 });
    } else {
      // framed: just flat roof outline
      g.moveTo(A.x, A.y - heightPx)
        .lineTo(B.x, B.y - heightPx)
        .lineTo(C.x, C.y - heightPx)
        .lineTo(D.x, D.y - heightPx)
        .closePath();
      g.fill({ color: PALETTE.dust, alpha: 0.45 });
      g.stroke({ color: PALETTE.ink, width: 1.5, alpha: 0.85 });

      // hatch lines for skeleton
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

    // ---- Awning strip + door on front wall (right side of front face) ----
    if (stage === 'finished') {
      const awningH = kind === 'theatre' ? 16 : 12;
      const awningTopY = -heightPx * 0.62;
      // Awning rectangle on the front (right wall in iso)
      const awningColor = palette.trim;
      g.moveTo(B.x, B.y + awningTopY)
        .lineTo(C.x, C.y + awningTopY)
        .lineTo(C.x, C.y + awningTopY + awningH)
        .lineTo(B.x, B.y + awningTopY + awningH)
        .closePath();
      g.fill({ color: awningColor, alpha: 0.95 });
      g.stroke({ color: PALETTE.ink, width: 1, alpha: 0.7 });

      // Door at the bottom of the front wall (toward C)
      const doorH = kind === 'cart' ? 24 : kind === 'restaurant' ? 36 : 48;
      const doorW = kind === 'cart' ? 14 : kind === 'restaurant' ? 22 : 30;
      const doorCx = (B.x + C.x) / 2 + doorW * 0.5;  // shift toward C
      const doorBaseY = (B.y + C.y) / 2;
      const doorTopY = doorBaseY - doorH;
      g.rect(doorCx - doorW / 2, doorTopY, doorW, doorH)
        .fill({ color: PALETTE.coal, alpha: 0.95 })
        .stroke({ color: PALETTE.ink, width: 1, alpha: 0.8 });
      // Door light slit when lit
      if (lit) {
        g.rect(doorCx - doorW / 2 + 2, doorTopY + 4, doorW - 4, 4)
          .fill({ color: PALETTE.filament, alpha: 0.85 });
      }
    }

    // ---- Theatre marquee (finished only) ----
    if (stage === 'finished' && kind === 'theatre') {
      const marqueeH = 22;
      const marqueeY = -heightPx + 6;
      g.moveTo(A.x, A.y + marqueeY)
        .lineTo(B.x, B.y + marqueeY)
        .lineTo(B.x, B.y + marqueeY + marqueeH)
        .lineTo(A.x, A.y + marqueeY + marqueeH)
        .closePath();
      g.fill({ color: palette.trim, alpha: 1 });
      g.stroke({ color: PALETTE.ink, width: 1, alpha: 0.85 });

      // Bulb dots along marquee (two rows)
      const bulbs = 10;
      const bulbColor = lit ? PALETTE.filament : PALETTE.brass;
      const bulbAlpha = lit ? 1 : 0.7;
      for (let i = 0; i < bulbs; i++) {
        const t = (i + 0.5) / bulbs;
        const x = A.x + (B.x - A.x) * t;
        const yTop = A.y + (B.y - A.y) * t + marqueeY + 5;
        const yBot = yTop + marqueeH - 10;
        g.circle(x, yTop, 2).fill({ color: bulbColor, alpha: bulbAlpha });
        g.circle(x, yBot, 2).fill({ color: bulbColor, alpha: bulbAlpha });
        // Tiny halo when lit
        if (lit) {
          g.circle(x, yTop, 4).fill({ color: bulbColor, alpha: 0.2 });
          g.circle(x, yBot, 4).fill({ color: bulbColor, alpha: 0.2 });
        }
      }
    }
  }

  /**
   * Draw a grid of window rectangles onto a wall plane defined by 2 base
   * corners + heightPx. `lightSide` = the wall facing camera (brighter
   * baseline); `lit` toggles the warm-bulb effect during night phases.
   */
  private drawWindowsOnWall(
    g: Graphics,
    base1: { x: number; y: number },
    base2: { x: number; y: number },
    heightPx: number,
    kind: string,
    lightSide: boolean,
    lit: boolean,
    palette: { wall: number; roof: number; trim: number },
  ): void {
    const rows = kind === 'theatre' ? 2 : 1;
    const cols = kind === 'theatre' ? 4 : kind === 'restaurant' ? 3 : 2;
    const wallTop = -heightPx;
    const wallBottom = 0;
    const topMargin = 30;
    const bottomMargin = kind === 'theatre' ? 40 : 30; // leave room for awning + door
    const wallHeight = (wallBottom - wallTop) - topMargin - bottomMargin;
    if (wallHeight <= 0) return;
    const winH = (wallHeight - (rows - 1) * 10) / rows * 0.7;
    const colSpacing = 1 / (cols + 1);

    for (let row = 0; row < rows; row++) {
      const rowY = wallTop + topMargin + row * (winH + 12);
      for (let col = 0; col < cols; col++) {
        const t = (col + 1) * colSpacing;
        const cx = base1.x + (base2.x - base1.x) * t;
        const cy = base1.y + (base2.y - base1.y) * t + rowY;
        const winW = kind === 'theatre' ? 14 : 12;
        const winColor = lit
          ? PALETTE.filament
          : (lightSide ? PALETTE.bone : PALETTE.dust);
        const winAlpha = lightSide ? 1 : 0.7;
        g.rect(cx - winW / 2, cy, winW, winH)
          .fill({ color: winColor, alpha: lit ? 0.9 : winAlpha })
          .stroke({ color: PALETTE.ink, width: 1, alpha: 0.7 });
        // Sash cross
        g.moveTo(cx, cy + 2).lineTo(cx, cy + winH - 2);
        g.stroke({ color: PALETTE.ink, width: 0.8, alpha: 0.6 });
        g.moveTo(cx - winW / 2 + 1, cy + winH / 2).lineTo(cx + winW / 2 - 1, cy + winH / 2);
        g.stroke({ color: PALETTE.ink, width: 0.8, alpha: 0.6 });
        // Glow halo at night
        if (lit) {
          g.rect(cx - winW / 2 - 3, cy - 3, winW + 6, winH + 6)
            .fill({ color: PALETTE.filament, alpha: 0.12 });
        }
      }
    }
    // Mark palette as used to silence TS unused
    void palette;
  }

  private applyZ(): void {
    const { position, footprint } = this.building;
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
