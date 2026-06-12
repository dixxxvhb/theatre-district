// Atmosphere — sky backdrop, film grain, and steam particles.
// Sky and grain are screen-space (stage level, unaffected by camera); steam
// lives in world space. Everything respects prefers-reduced-motion.

import { Container, Sprite, TilingSprite } from 'pixi.js';
import type { TextureKit } from './textures';
import type { Grade } from './palette';
import { hash2 } from './textures';

export function prefersReducedMotion(): boolean {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

// ---------------------------------------------------------------------------
// Sky — two stacked sprites, tinted per frame. Zero redraws: the gradient is
// a baked alpha ramp; color movement is pure tint.
// ---------------------------------------------------------------------------
export class Sky {
  readonly container = new Container();
  private top: Sprite;
  private horizon: Sprite;

  constructor(kit: TextureKit) {
    this.top = new Sprite(kit.white);
    this.horizon = new Sprite(kit.skyGradient);
    this.container.addChild(this.top, this.horizon);
  }

  update(grade: Grade, width: number, height: number): void {
    this.top.tint = grade.skyTop;
    this.top.width = width;
    this.top.height = height;
    // Horizon glow hugs the top of the frame (the city behind the street)
    // and fades downward — flipped ramp, capped to the upper 40%.
    this.horizon.tint = grade.skyHorizon;
    this.horizon.width = width;
    this.horizon.height = height * 0.4;
    this.horizon.scale.y = -Math.abs(this.horizon.scale.y);
    this.horizon.position.set(0, height * 0.4);
    this.horizon.alpha = 0.7;
  }
}

// ---------------------------------------------------------------------------
// Film grain — one tiling sprite, offset-jittered a few times a second.
// Static under reduced motion.
// ---------------------------------------------------------------------------
export class Grain {
  readonly sprite: TilingSprite;
  private elapsed = 0;
  private animate: boolean;

  constructor(kit: TextureKit) {
    this.sprite = new TilingSprite({ texture: kit.grain, width: 64, height: 64 });
    this.sprite.alpha = 0.5; // texture itself is near-transparent
    this.animate = !prefersReducedMotion();
  }

  update(dtMs: number, width: number, height: number): void {
    this.sprite.width = width;
    this.sprite.height = height;
    if (!this.animate) return;
    this.elapsed += dtMs;
    if (this.elapsed > 90) {
      this.elapsed = 0;
      this.sprite.tilePosition.set(Math.random() * 128, Math.random() * 128);
    }
  }
}

// ---------------------------------------------------------------------------
// Steam — pooled wisps rising from grates. World-space, normal blend, so the
// world grade tints it correctly day and night.
// ---------------------------------------------------------------------------
interface Wisp {
  sprite: Sprite;
  age: number;
  life: number;
  vx: number;
  vy: number;
  originX: number;
  originY: number;
}

const WISPS_PER_EMITTER = 5;

export class Steam {
  readonly container = new Container();
  private wisps: Wisp[] = [];
  private enabled: boolean;

  constructor(private kit: TextureKit) {
    this.enabled = !prefersReducedMotion();
  }

  setEmitters(positions: Array<{ wx: number; wy: number }>): void {
    this.container.removeChildren().forEach((c) => c.destroy());
    this.wisps = [];
    if (!this.enabled) return;

    positions.forEach((pos, e) => {
      for (let i = 0; i < WISPS_PER_EMITTER; i++) {
        const sprite = new Sprite(this.kit.particle);
        sprite.anchor.set(0.5);
        sprite.alpha = 0;
        this.container.addChild(sprite);
        const life = 2600 + hash2(e, i) * 1800;
        this.wisps.push({
          sprite,
          life,
          age: hash2(i, e) * life, // desynchronize
          vx: 2 + hash2(e * 3, i) * 4,
          vy: -14 - hash2(i * 5, e) * 8,
          originX: pos.wx,
          originY: pos.wy,
        });
      }
    });
  }

  update(dtMs: number): void {
    for (const w of this.wisps) {
      w.age += dtMs;
      if (w.age >= w.life) w.age = 0;
      const t = w.age / w.life;
      const dt = w.age / 1000;
      w.sprite.position.set(w.originX + w.vx * dt + Math.sin(dt * 2.2) * 3, w.originY + w.vy * dt);
      w.sprite.alpha = 0.16 * Math.sin(Math.PI * t);
      const s = 1 + t * 2.4;
      w.sprite.scale.set(s);
    }
  }
}
