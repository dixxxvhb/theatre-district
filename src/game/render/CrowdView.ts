// Crowd rendering — a pooled set of silhouette sprites mirroring the sim's
// typed arrays. Sprites live INSIDE the depth-sorted object layer so people
// walk in front of and behind buildings correctly (z from continuous grid
// position). Pool is pre-allocated; per-frame work is position/visibility.

import { Container, Sprite, Texture } from 'pixi.js';
import { Baker } from './kit/bake';
import { TUNGSTEN } from './kit/palette';
import { AgentState, crowd } from '../sim/crowd';
import { CROWD } from '../config/balance';
import { worldToGrid } from './iso';
import { prefersReducedMotion } from './kit/atmosphere';

const ROW_Z = 1000;

// Muted body colors — reads as a crowd, not confetti.
const BODY_COLORS = [0x2a2f3e, 0x39303c, 0x2e3a38, 0x3a3430];

export function bakeFigures(baker: Baker): Texture[] {
  return BODY_COLORS.map((color, v) =>
    baker.bake(`figure-${v}`, (g) => {
      // Small silhouette with a warm rim along the head and shoulder.
      g.ellipse(4, 14, 2.6, 4).fill({ color });
      g.circle(4, 7, 2.4).fill({ color });
      g.circle(3.4, 6.2, 2.2).stroke({ color: TUNGSTEN.glow, width: 0.8, alpha: 0.5 });
      g.ellipse(4, 17.6, 3, 1).fill({ color: 0x000000, alpha: 0.3 }); // contact shadow
    }),
  );
}

export class CrowdView {
  private sprites: Sprite[] = [];
  private animate = !prefersReducedMotion();

  constructor(objectsC: Container, figures: Texture[]) {
    for (let i = 0; i < CROWD.MAX_AGENTS; i++) {
      const s = new Sprite(figures[i % figures.length]);
      s.anchor.set(0.5, 0.95);
      s.visible = false;
      objectsC.addChild(s);
      this.sprites.push(s);
    }
  }

  /** Per render frame. Walk bob is render-only — never touches the sim. */
  sync(elapsedMs: number): void {
    for (let i = 0; i < this.sprites.length; i++) {
      const sprite = this.sprites[i];
      const state = crowd.state[i];
      if (state === AgentState.OFF || state === AgentState.WATCHING) {
        sprite.visible = false;
        continue;
      }
      sprite.visible = true;
      const moving = state === AgentState.WALKING || state === AgentState.CROSSING || state === AgentState.LEAVING;
      const bob = this.animate && moving ? Math.abs(Math.sin(elapsedMs / 90 + crowd.bobPhase[i])) * 2 : 0;
      sprite.position.set(crowd.posX[i], crowd.posY[i] - bob);
      const { gx, gy } = worldToGrid(crowd.posX[i], crowd.posY[i]);
      sprite.zIndex = gy * ROW_Z + gx;
    }
  }
}

/** Nearest visible agent within radius of a world point; -1 if none. */
export function agentAt(wx: number, wy: number, radius = 16): number {
  let best = -1;
  let bestD = radius * radius;
  for (let i = 0; i < CROWD.MAX_AGENTS; i++) {
    const st = crowd.state[i];
    if (st === AgentState.OFF || st === AgentState.WATCHING) continue;
    const dx = crowd.posX[i] - wx;
    const dy = crowd.posY[i] - wy;
    const d = dx * dx + dy * dy;
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  return best;
}
