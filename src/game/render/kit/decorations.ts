// Decoration bakes — 12 placeable street-dressing kinds, each baked once.
// Conventions: each bake reports the offset from the TILE CENTER to the
// texture's top-left, plus optional emissive/light-pool/steam metadata the
// scene uses to wire the light layer and particle emitters.

import type { Texture } from 'pixi.js';
import { Baker, bakeRadialLight } from './bake';
import { FACADE, INK, NEON, SURFACE, TUNGSTEN } from './palette';
import type { DecorationKind } from '../../../types/td';

export interface DecorationBake {
  tex: Texture;
  /** Offset from tile center to texture top-left. */
  ox: number;
  oy: number;
  /** Light pool on the additive layer (offset from tile center). */
  light?: { dx: number; dy: number; scale: number; alpha: number; large?: boolean };
  /** Spawns a steam emitter at the tile. */
  steam?: boolean;
}

type G = import('pixi.js').Graphics;

const greens = { canopy: 0x2e4a38, canopyHi: 0x3c5c44, trunk: 0x4a3a2c };

function bake(baker: Baker, key: string, w: number, h: number, draw: (g: G) => void): Texture {
  return baker.bake(`deco-${key}`, (g) => {
    g.rect(0, 0, w, h).fill({ color: 0, alpha: 0.001 });
    draw(g);
  });
}

export function bakeDecorations(baker: Baker): Record<DecorationKind, DecorationBake> {
  return {
    street_lamp: {
      tex: bake(baker, 'lamp', 14, 88, (g) => {
        g.rect(5.5, 14, 2.5, 70).fill({ color: 0x3c4150 });
        g.rect(3, 82, 8, 4).fill({ color: 0x343948 });
        g.circle(7, 12, 5).fill({ color: TUNGSTEN.bulb, alpha: 0.95 });
        g.circle(7, 12, 6.5).stroke({ color: 0x3c4150, width: 1.5 });
      }),
      ox: -7,
      oy: -84,
      light: { dx: 0, dy: -72, scale: 1, alpha: 0.9 },
    },

    bench: {
      tex: bake(baker, 'bench', 34, 22, (g) => {
        g.poly([4, 10, 22, 1, 30, 5, 12, 14]).fill({ color: 0x4a3e30 });
        g.poly([4, 10, 12, 14, 12, 19, 4, 15]).fill({ color: 0x3a3026 });
        g.rect(5, 15, 2, 5).fill({ color: 0x2c2620 });
        g.rect(26, 7, 2, 5).fill({ color: 0x2c2620 });
      }),
      ox: -17,
      oy: -18,
    },

    planter: {
      tex: bake(baker, 'planter', 26, 24, (g) => {
        g.poly([3, 14, 13, 9, 23, 14, 13, 19]).fill({ color: 0x4c4456 });
        g.poly([3, 14, 13, 19, 13, 23, 3, 18]).fill({ color: 0x3c3646 });
        g.circle(13, 9, 6).fill({ color: greens.canopy });
        g.circle(10, 7, 3.5).fill({ color: greens.canopyHi });
      }),
      ox: -13,
      oy: -20,
    },

    tree: {
      tex: bake(baker, 'tree', 40, 58, (g) => {
        g.rect(18, 38, 4, 16).fill({ color: greens.trunk });
        g.circle(20, 26, 14).fill({ color: greens.canopy });
        g.circle(13, 21, 8).fill({ color: greens.canopy });
        g.circle(27, 20, 9).fill({ color: greens.canopyHi });
        g.circle(20, 13, 7).fill({ color: greens.canopyHi });
      }),
      ox: -20,
      oy: -54,
    },

    poster_board: {
      tex: bake(baker, 'poster', 30, 40, (g) => {
        g.rect(13, 28, 3, 10).fill({ color: 0x3c4150 });
        g.poly([2, 6, 27, 2, 27, 26, 2, 30]).fill({ color: 0x2c2a30 });
        g.poly([5, 8, 13, 7, 13, 19, 5, 20]).fill({ color: INK.cream, alpha: 0.85 });
        g.poly([15, 7, 24, 5, 24, 17, 15, 19]).fill({ color: 0xc8b8a0, alpha: 0.8 });
        g.rect(6, 10, 6, 1.5).fill({ color: 0x2c2a30 });
        g.rect(16, 9, 6, 1.5).fill({ color: 0x4a3038 });
      }),
      ox: -15,
      oy: -36,
    },

    banner_pole: {
      tex: bake(baker, 'banner', 22, 70, (g) => {
        g.rect(4, 6, 2.5, 60).fill({ color: 0x3c4150 });
        g.poly([7, 8, 20, 12, 7, 22]).fill({ color: 0x70343c });
        g.poly([7, 26, 17, 29, 7, 36]).fill({ color: 0x3a5a52 });
      }),
      ox: -5,
      oy: -66,
    },

    string_lights: {
      // One swag segment spanning a single tile-step along the sidewalk;
      // the scene tiles segments between the two anchors.
      tex: bake(baker, 'swag', 70, 46, (g) => {
        // Posts at both ends.
        g.rect(2, 4, 2, 40).fill({ color: 0x3c4150 });
        g.rect(66, 4, 2, 40).fill({ color: 0x3c4150 });
        // Dipping cable.
        g.moveTo(3, 8);
        g.quadraticCurveTo(35, 22, 67, 8);
        g.stroke({ color: 0x2a2d38, width: 1.5 });
        // Bulbs along the dip.
        for (let i = 0; i <= 6; i++) {
          const t = i / 6;
          const x = 3 + t * 64;
          const y = 8 + 14 * (4 * t * (1 - t)); // parabola dip
          g.circle(x, y, 1.8).fill({ color: TUNGSTEN.bulb });
        }
      }),
      ox: -35,
      oy: -42,
      light: { dx: 0, dy: -28, scale: 1.1, alpha: 0.55 },
    },

    newsstand: {
      tex: bake(baker, 'newsstand', 38, 38, (g) => {
        g.poly([3, 18, 19, 10, 35, 18, 19, 26]).fill({ color: 0x3a4438 });
        g.poly([3, 18, 19, 26, 19, 34, 3, 26]).fill({ color: 0x2e3830 });
        g.poly([19, 26, 35, 18, 35, 26, 19, 34]).fill({ color: 0x26302a });
        g.poly([1, 16, 19, 7, 37, 16, 19, 24]).fill({ color: 0x5a6a48, alpha: 0.9 });
        g.rect(6, 20, 5, 6).fill({ color: INK.cream, alpha: 0.7 });
        g.rect(13, 23, 5, 6).fill({ color: 0xc8b8a0, alpha: 0.7 });
      }),
      ox: -19,
      oy: -30,
    },

    phone_booth: {
      tex: bake(baker, 'phone', 20, 50, (g) => {
        g.poly([2, 8, 10, 4, 18, 8, 10, 12]).fill({ color: 0x70343c });
        g.poly([2, 8, 10, 12, 10, 46, 2, 42]).fill({ color: 0x5c2a32 });
        g.poly([10, 12, 18, 8, 18, 42, 10, 46]).fill({ color: 0x4a242a });
        g.poly([4, 14, 9, 16, 9, 34, 4, 32]).fill({ color: FACADE.glassDark, alpha: 0.9 });
        g.poly([11, 16, 16, 14, 16, 32, 11, 34]).fill({ color: FACADE.glassDark, alpha: 0.9 });
      }),
      ox: -10,
      oy: -46,
      light: { dx: 0, dy: -30, scale: 0.5, alpha: 0.35 },
    },

    steam_grate: {
      tex: bake(baker, 'grate', 34, 19, (g) => {
        g.poly([17, 1, 33, 9, 17, 17, 1, 9]).fill({ color: 0x14161e });
        for (let i = 1; i < 4; i++) {
          const f = i / 4;
          g.moveTo(1 + 16 * f, 9 - 8 * f + 1)
            .lineTo(17 + 16 * f, 9 + 8 * f - 7 + 1)
            .stroke({ color: 0x2c303c, width: 1 });
        }
      }),
      ox: -17,
      oy: -9,
      steam: true,
    },

    fountain: {
      tex: bake(baker, 'fountain', 56, 50, (g) => {
        g.poly([28, 18, 54, 31, 28, 44, 2, 31]).fill({ color: SURFACE.curb });
        g.poly([28, 22, 46, 31, 28, 40, 10, 31]).fill({ color: 0x2a3a4e });
        g.poly([28, 24, 42, 31, 28, 38, 14, 31]).fill({ color: 0x35506a });
        g.rect(26, 12, 4, 16).fill({ color: SURFACE.curb });
        g.circle(28, 11, 4).fill({ color: 0x4a6a8a, alpha: 0.9 });
        g.circle(24, 28, 1.5).fill({ color: 0x6a8aaa, alpha: 0.8 });
        g.circle(33, 30, 1.5).fill({ color: 0x6a8aaa, alpha: 0.8 });
      }),
      ox: -28,
      oy: -42,
      light: { dx: 0, dy: -8, scale: 0.7, alpha: 0.25 },
    },

    billboard: {
      tex: bake(baker, 'billboard', 64, 64, (g) => {
        g.rect(12, 38, 3, 22).fill({ color: 0x3c4150 });
        g.rect(46, 30, 3, 22).fill({ color: 0x3c4150 });
        g.poly([4, 12, 58, 2, 58, 32, 4, 42]).fill({ color: 0x26242c });
        g.poly([7, 14, 55, 5, 55, 29, 7, 38]).fill({ color: INK.cream, alpha: 0.9 });
        g.rect(12, 18, 24, 3).fill({ color: 0x1a1820 });
        g.rect(12, 24, 32, 2).fill({ color: NEON.magenta, alpha: 0.7 });
        g.rect(12, 29, 18, 2).fill({ color: 0x1a1820, alpha: 0.6 });
      }),
      ox: -32,
      oy: -58,
      light: { dx: 0, dy: -38, scale: 1.3, alpha: 0.5, large: true },
    },
  };
}

/** Shared light textures used by decoration light pools. */
export function bakeDecorationLights(baker: Baker) {
  return {
    small: bakeRadialLight(baker, 'light-small', 56, TUNGSTEN.glow),
    large: bakeRadialLight(baker, 'light-large', 120, TUNGSTEN.glow),
  };
}
