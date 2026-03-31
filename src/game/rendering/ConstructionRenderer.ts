import { Graphics } from 'pixi.js';
import type { Room } from '../../types';

/**
 * Draw construction stage visuals for a room under construction.
 * 4 stages: Foundation (0-25%), Framing (25-50%), Finishing (50-75%), Complete transition (75-100%)
 */
export function renderConstruction(
  g: Graphics,
  room: Room,
  pixelX: number,
  pixelY: number,
  pixelW: number,
  pixelH: number,
  totalBuildDays: number,
  animTime: number,
): void {
  if (!room.isConstructing) return;

  const progress = 1 - room.constructionDaysLeft / Math.max(1, totalBuildDays);
  const stage = Math.floor(progress * 4); // 0-3

  switch (stage) {
    case 0: drawFoundation(g, pixelX, pixelY, pixelW, pixelH, animTime); break;
    case 1: drawFraming(g, pixelX, pixelY, pixelW, pixelH, animTime); break;
    case 2: drawFinishing(g, pixelX, pixelY, pixelW, pixelH, progress, animTime); break;
    default: drawAlmostDone(g, pixelX, pixelY, pixelW, pixelH, animTime); break;
  }
}

function drawFoundation(g: Graphics, x: number, y: number, w: number, h: number, t: number): void {
  // Bare outline
  g.setStrokeStyle({ width: 1, color: 0xffdd57, alpha: 0.5 });
  g.rect(x + 1, y + 1, w - 2, h - 2);
  g.stroke();

  // Construction tape (yellow/black diagonal lines)
  g.setStrokeStyle({ width: 1, color: 0xffdd57, alpha: 0.3 + Math.sin(t * 0.003) * 0.1 });
  const step = 6;
  for (let i = -h; i < w; i += step) {
    g.moveTo(Math.max(x, x + i), Math.max(y, y - i));
    g.lineTo(Math.min(x + w, x + i + h), Math.min(y + h, y + h));
  }
  g.stroke();

  // Debris dots
  for (let i = 0; i < 4; i++) {
    const dx = x + 3 + (i * 7) % (w - 6);
    const dy = y + 3 + (i * 5) % (h - 6);
    g.circle(dx, dy, 0.5).fill({ color: 0x8b8b83, alpha: 0.4 });
  }
}

function drawFraming(g: Graphics, x: number, y: number, w: number, h: number, t: number): void {
  // Wall outlines appearing
  g.setStrokeStyle({ width: 1, color: 0xa0a0a0, alpha: 0.5 });
  g.rect(x + 2, y + 2, w - 4, h - 4);
  g.stroke();

  // Scaffolding (cross-hatched rectangles)
  g.setStrokeStyle({ width: 0.5, color: 0xffdd57, alpha: 0.4 });
  g.rect(x + 3, y + 3, 4, h - 6);
  g.rect(x + w - 7, y + 3, 4, h - 6);
  // Cross braces
  g.moveTo(x + 3, y + 3).lineTo(x + 7, y + h - 3);
  g.moveTo(x + 7, y + 3).lineTo(x + 3, y + h - 3);
  g.stroke();

  // Worker figures
  const workerAlpha = 0.5 + Math.sin(t * 0.004) * 0.2;
  g.circle(x + w * 0.4, y + h * 0.5, 1.5).fill({ color: 0xffdd57, alpha: workerAlpha });
  g.circle(x + w * 0.6, y + h * 0.4, 1.5).fill({ color: 0xffdd57, alpha: workerAlpha });
}

function drawFinishing(g: Graphics, x: number, y: number, w: number, h: number, progress: number, _t: number): void {
  // Walls filled (partial opacity based on progress)
  const wallAlpha = (progress - 0.5) * 2; // 0 to 1 across this stage
  g.rect(x + 1, y + 1, w - 2, h - 2).fill({ color: 0x4a4a4a, alpha: wallAlpha * 0.3 });

  // Paint swatches
  g.rect(x + w * 0.3, y + 3, 4, 3).fill({ color: 0xcc0000, alpha: wallAlpha * 0.4 });
  g.rect(x + w * 0.5, y + 3, 4, 3).fill({ color: 0x0066cc, alpha: wallAlpha * 0.4 });
}

function drawAlmostDone(g: Graphics, x: number, y: number, w: number, h: number, t: number): void {
  // Transition flash
  const flash = Math.sin(t * 0.005) * 0.5 + 0.5;
  g.rect(x, y, w, h).fill({ color: 0xffffff, alpha: flash * 0.1 });
}
