// Weather visuals — rain streaks + ground reflection sheen, heat shimmer.
// Lightweight: a particle pool for rain, one alpha-modulated overlay for
// reflections. Respects prefers-reduced-motion (rain stays static, heat off).

import { Container, Graphics, Sprite } from 'pixi.js';
import type { TextureKit } from './textures';
import { prefersReducedMotion } from './atmosphere';

const RAIN_DROPS = 140;

export class WeatherFX {
  readonly container = new Container();
  /** Wet-street sheen — sits between ground and objects when rain is on. */
  readonly reflectionSheen = new Graphics();
  private rainSprites: Sprite[] = [];
  private rainSpeeds: number[] = [];
  private active: 'clear' | 'rain' | 'heat' = 'clear';
  private animate = !prefersReducedMotion();

  constructor(kit: TextureKit, private width: () => number, private height: () => number) {
    for (let i = 0; i < RAIN_DROPS; i++) {
      const s = new Sprite(kit.particle);
      s.anchor.set(0.5);
      s.width = 1.5;
      s.height = 8;
      s.alpha = 0.55;
      s.tint = 0xa5b8d6;
      s.visible = false;
      this.container.addChild(s);
      this.rainSprites.push(s);
      this.rainSpeeds.push(6 + Math.random() * 4);
    }
    this.reflectionSheen.visible = false;
  }

  setWeather(w: 'clear' | 'rain' | 'heat'): void {
    this.active = w;
    const rainOn = w === 'rain';
    for (const s of this.rainSprites) s.visible = rainOn;
    this.reflectionSheen.visible = rainOn;
    if (rainOn) {
      // Re-randomize positions when rain starts.
      const W = this.width();
      const H = this.height();
      for (const s of this.rainSprites) {
        s.position.set(Math.random() * W, Math.random() * H);
      }
      // Render the sheen once — a soft horizontal band of light blue with
      // varying alpha. (Multiplied by world tint so it deepens at night.)
      const g = this.reflectionSheen;
      g.clear();
      g.rect(-2000, -200, 6000, 2000).fill({ color: 0x7a98c2, alpha: 0.18 });
    } else {
      this.reflectionSheen.clear();
    }
  }

  update(dtMs: number): void {
    if (this.active !== 'rain' || !this.animate) return;
    const W = this.width();
    const H = this.height();
    for (let i = 0; i < this.rainSprites.length; i++) {
      const s = this.rainSprites[i];
      const speed = this.rainSpeeds[i] * (dtMs / 16);
      s.position.x -= speed * 0.6;
      s.position.y += speed;
      if (s.position.y > H + 10) {
        s.position.y = -10;
        s.position.x = Math.random() * (W + 200);
      }
      if (s.position.x < -20) s.position.x = W + 20;
    }
  }
}
