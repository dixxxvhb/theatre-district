// CrowdRenderer — ParticleContainer for the iso street crowd.
//
// Pre-allocates one Particle per agent slot (MAX_AGENTS), parked off-screen
// when inactive. Each frame, sync x/y/alpha/tint from the CrowdSystem's
// typed arrays. No per-frame allocation; this is the perf-critical path
// once the crowd is dense.
//
// PixiJS v8 ParticleContainer differs from v7's: pass dynamicProperties
// to declare which fields update per frame. position + alpha + color all
// update; scale + rotation are static.

import { Container, Graphics, ParticleContainer, Particle, type Texture, type Application } from 'pixi.js';
import { TILE } from '../../data/constants';
import { LAYER } from '../depth';
import { PALETTE } from '../assets/palette';
import { AGENT_STATE, MAX_AGENTS, getCrowdState } from '../../systems/CrowdSystem';

const STATE_TINT: Record<number, number> = {
  [AGENT_STATE.WANDERING]: 0xfaf3e8,  // ivory / "Stage Door bone"
  [AGENT_STATE.SPENDING]:  PALETTE.filament,
  [AGENT_STATE.LEAVING]:   PALETTE.dust,
};

export class CrowdRenderer {
  readonly container = new Container();
  private particleContainer: ParticleContainer | null = null;
  private particles: Particle[] = [];
  private texture: Texture | null = null;

  constructor() {
    this.container.label = 'CrowdRenderer';
    // Containers default to z 0; we want crowd above ground + buildings
    // — but use container.zIndex on the parent (StreetView sortable).
    this.container.zIndex = LAYER.PROP + 1;
  }

  /** One-time init — requires the PixiJS Application to generate the agent texture. */
  init(app: Application): void {
    // Tiny 4x4 white dot. Tint per state.
    const g = new Graphics();
    g.circle(4, 4, 3).fill({ color: 0xffffff });
    this.texture = app.renderer.generateTexture({ target: g });
    g.destroy();

    this.particleContainer = new ParticleContainer({
      dynamicProperties: {
        position: true,
        scale: false,
        color: true,
      },
    });
    this.container.addChild(this.particleContainer);

    // Pre-allocate the particle pool. All start parked off-screen with alpha 0.
    for (let i = 0; i < MAX_AGENTS; i++) {
      const p = new Particle({
        texture: this.texture,
        x: -10000,
        y: -10000,
        tint: 0xffffff,
        alpha: 0,
      });
      this.particles.push(p);
      this.particleContainer.addParticle(p);
    }
  }

  /** Per-tick sync — call from the engine ticker after CrowdSystem.tick. */
  sync(): void {
    const state = getCrowdState();
    const halfW = TILE.ISO_WIDTH / 2;
    const halfH = TILE.ISO_HEIGHT / 2;
    for (let i = 0; i < MAX_AGENTS; i++) {
      const p = this.particles[i];
      if (!p) continue;
      if (!state.active[i]) {
        // Hide via alpha (dynamicProperties.color includes alpha).
        if (p.alpha !== 0) {
          p.alpha = 0;
          p.x = -10000;
          p.y = -10000;
        }
        continue;
      }
      // Fractional grid coord → iso screen
      const gx = state.posX[i];
      const gy = state.posY[i];
      const sx = (gx - gy) * halfW + halfW;     // tile center x
      const sy = (gx + gy) * halfH + halfH;     // tile center y
      p.x = sx;
      // Lift agents slightly off the ground so they don't disappear into building bases.
      p.y = sy - 8;
      p.tint = STATE_TINT[state.state[i]] ?? 0xffffff;
      p.alpha = 0.95;
    }
  }

  destroy(): void {
    this.particleContainer?.destroy();
    this.texture?.destroy();
    this.particles = [];
    this.particleContainer = null;
    this.container.destroy();
  }
}
