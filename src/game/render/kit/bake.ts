// Bake-to-texture pipeline (architecture rule #5): procedural Graphics are
// drawn ONCE at boot and baked to textures. Sprites reference the bakes;
// nothing redraws vector geometry per frame.

import { Container, Graphics, Renderer, RenderTexture, Texture } from 'pixi.js';

export class Baker {
  private cache = new Map<string, Texture>();

  constructor(private renderer: Renderer) {}

  /**
   * Bake a draw callback to a texture, cached by key. The callback draws into
   * a fresh container at origin; bounds are taken from the drawn content.
   */
  bake(key: string, draw: (g: Graphics, c: Container) => void): Texture {
    const hit = this.cache.get(key);
    if (hit) return hit;

    const container = new Container();
    const g = new Graphics();
    container.addChild(g);
    draw(g, container);

    const texture = this.renderer.generateTexture({
      target: container,
      resolution: 2, // crisp under zoom up to MAX_ZOOM 2.5
      antialias: true,
    });
    container.destroy({ children: true });
    this.cache.set(key, texture);
    return texture;
  }

  /** Bake from raw pixel drawing (Canvas2D) — used for noise/grain. */
  bakeCanvas(key: string, width: number, height: number, paint: (ctx: CanvasRenderingContext2D) => void): Texture {
    const hit = this.cache.get(key);
    if (hit) return hit;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;
    paint(ctx);
    const texture = Texture.from(canvas);
    this.cache.set(key, texture);
    return texture;
  }

  destroy(): void {
    for (const tex of this.cache.values()) {
      if (tex !== Texture.EMPTY) tex.destroy(true);
    }
    this.cache.clear();
  }
}

/** A soft radial light texture (bright center → transparent edge), baked by
 *  stacking falloff circles — used by every glow pool on the light layer. */
export function bakeRadialLight(baker: Baker, key: string, radius: number, color: number): Texture {
  return baker.bake(key, (g) => {
    const steps = 24;
    for (let i = steps; i >= 1; i--) {
      const r = (radius * i) / steps;
      const a = Math.pow(1 - i / steps, 2) * 0.16;
      g.circle(radius, radius, r).fill({ color, alpha: a });
    }
    // Hot center.
    g.circle(radius, radius, radius * 0.12).fill({ color: 0xffffff, alpha: 0.35 });
  });
}

// Re-export for callers that only need types.
export type { Texture, RenderTexture };
