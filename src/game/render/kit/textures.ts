// Boot-time texture set. Everything here is baked exactly once per app run
// (architecture rule #5) and shared by sprites. Variants are picked per tile
// by a deterministic hash so the street looks hand-laid, not tiled.

import { Texture } from 'pixi.js';
import { Baker, bakeRadialLight } from './bake';
import { ISO } from '../../config/balance';
import { INK, SURFACE, TUNGSTEN } from './palette';

const HW = ISO.TILE_WIDTH / 2;
const HH = ISO.TILE_HEIGHT / 2;

export interface TextureKit {
  /** Ground diamonds, 3 variants per kind. */
  asphalt: Texture[];
  /** Road tile with a center-line dash along its lower-right edge. */
  asphaltDash: Texture;
  sidewalk: Texture[];
  lot: Texture[];
  /** Street furniture. */
  lampWorking: Texture;
  lampBroken: Texture;
  steamGrate: Texture;
  /** Additive light-layer sprites. */
  lightPoolSmall: Texture;
  lightPoolLarge: Texture;
  /** Sky: solid pixel + baked vertical alpha gradient (tinted per frame). */
  white: Texture;
  skyGradient: Texture;
  /** Film grain noise tile. */
  grain: Texture;
  /** Soft particle dot (steam, dust). */
  particle: Texture;
  /** Litter scatter for a tile. */
  litter: Texture;
}

/** Deterministic per-position hash for variant picking. */
export function hash2(x: number, y: number): number {
  let h = (x * 374761393 + y * 668265263) ^ 0x5bf03635;
  h = (h ^ (h >> 13)) * 1274126177;
  return ((h ^ (h >> 16)) >>> 0) / 0xffffffff;
}

function diamond(g: import('pixi.js').Graphics, color: number) {
  g.moveTo(HW, 0).lineTo(ISO.TILE_WIDTH, HH).lineTo(HW, ISO.TILE_HEIGHT).lineTo(0, HH).closePath().fill({ color });
}

/** Scatter a few darker flecks inside the diamond, seeded per variant. */
function flecks(g: import('pixi.js').Graphics, seed: number, color: number, count: number, alpha: number) {
  for (let i = 0; i < count; i++) {
    const r1 = hash2(seed, i * 7 + 1);
    const r2 = hash2(seed * 3 + 5, i * 13 + 2);
    // Rejection-free point inside the diamond via barycentric squash.
    const u = r1 - 0.5;
    const v = (r2 - 0.5) * (1 - Math.abs(u) * 2) * 0.9;
    const px = HW + u * ISO.TILE_WIDTH * 0.9;
    const py = HH + v * HH * 1.8;
    g.circle(px, py, 1 + hash2(i, seed) * 2.2).fill({ color, alpha });
  }
}

export function bakeTextureKit(baker: Baker): TextureKit {
  const asphalt = [0, 1, 2].map((v) =>
    baker.bake(`tile-asphalt-${v}`, (g) => {
      diamond(g, SURFACE.asphalt);
      flecks(g, v + 11, SURFACE.asphaltCrack, 7, 0.7);
      // faint patch sheen
      flecks(g, v + 31, 0x2c2f3a, 3, 0.5);
    }),
  );

  // Row-4 tiles get the painted center dash on their SE edge (the road
  // centerline runs between rows 4 and 5).
  const asphaltDash = baker.bake('tile-asphalt-dash', (g) => {
    diamond(g, SURFACE.asphalt);
    flecks(g, 17, SURFACE.asphaltCrack, 6, 0.7);
    const ax = HW + HW * 0.3, ay = HH + HH * 0.3;
    const bx = HW + HW * 0.7, by = HH + HH * 0.7;
    g.moveTo(ax, ay).lineTo(bx, by).stroke({ color: SURFACE.roadPaint, width: 3, alpha: 0.55 });
  });

  const sidewalk = [0, 1, 2].map((v) =>
    baker.bake(`tile-sidewalk-${v}`, (g) => {
      diamond(g, SURFACE.sidewalk);
      // slab seams along the iso axes
      g.moveTo(HW / 2, HH / 2).lineTo(HW + HW / 2, HH + HH / 2).stroke({ color: SURFACE.sidewalkSeam, width: 1.5, alpha: 0.8 });
      g.moveTo(HW + HW / 2, HH / 2).lineTo(HW / 2, HH + HH / 2).stroke({ color: SURFACE.sidewalkSeam, width: 1.5, alpha: 0.5 });
      flecks(g, v + 71, SURFACE.sidewalkSeam, 4, 0.6);
    }),
  );

  const lot = [0, 1, 2].map((v) =>
    baker.bake(`tile-lot-${v}`, (g) => {
      diamond(g, SURFACE.lotGravel);
      flecks(g, v + 101, SURFACE.lotRubble, 9, 0.8);
      flecks(g, v + 131, 0x171a26, 5, 0.7);
      // Faint property line along the NE edge so empty lots read as parcels.
      g.moveTo(HW, 0).lineTo(ISO.TILE_WIDTH, HH).stroke({ color: 0x2c3044, width: 1, alpha: 0.5 });
    }),
  );

  const lampWorking = baker.bake('lamp-working', (g) => {
    // Slim post with a tungsten head. ~12×86.
    g.rect(5, 14, 2.5, 70).fill({ color: 0x3c4150 });
    g.rect(2.5, 82, 8, 4).fill({ color: 0x343948 });
    g.circle(6.5, 12, 5).fill({ color: TUNGSTEN.bulb, alpha: 0.95 });
    g.circle(6.5, 12, 6.5).stroke({ color: 0x3c4150, width: 1.5 });
  });

  const lampBroken = baker.bake('lamp-broken', (g) => {
    // Dead head, slight stoop, grime.
    g.rect(5, 16, 2.5, 68).fill({ color: 0x343844 });
    g.rect(2.5, 82, 8, 4).fill({ color: 0x2e3240 });
    g.circle(7.5, 14, 5).fill({ color: 0x1a1d28 });
    g.circle(7.5, 14, 6.5).stroke({ color: 0x343844, width: 1.5 });
    g.rect(4.5, 30, 3.5, 6).fill({ color: 0x2a2d38 });
  });

  const steamGrate = baker.bake('steam-grate', (g) => {
    // Small iso grate inset for a sidewalk tile.
    const w = 30, h = 15;
    g.moveTo(w / 2, 0).lineTo(w, h / 2).lineTo(w / 2, h).lineTo(0, h / 2).closePath().fill({ color: 0x14161e });
    for (let i = 1; i < 4; i++) {
      g.moveTo((w / 2) * (i / 4) + 2, (h / 2) * (i / 4) + 1)
        .lineTo(w - (w / 2) * (1 - i / 4) - 2, (h / 2) * (i / 4) + 1)
        .stroke({ color: 0x2c303c, width: 1 });
    }
  });

  const lightPoolSmall = bakeRadialLight(baker, 'light-small', 56, TUNGSTEN.glow);
  const lightPoolLarge = bakeRadialLight(baker, 'light-large', 120, TUNGSTEN.glow);
  const particle = bakeRadialLight(baker, 'particle-dot', 10, 0xcfd4e8);

  const white = baker.bake('white-px', (g) => {
    g.rect(0, 0, 4, 4).fill({ color: 0xffffff });
  });

  // Vertical alpha gradient (opaque top → transparent bottom), tinted per frame
  // for the horizon color. Baked once; the sky never redraws.
  const skyGradient = baker.bakeCanvas('sky-gradient', 4, 256, (ctx) => {
    const grad = ctx.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, 'rgba(255,255,255,0)');
    grad.addColorStop(1, 'rgba(255,255,255,1)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 4, 256);
  });

  const grain = baker.bakeCanvas('grain', 128, 128, (ctx) => {
    const img = ctx.createImageData(128, 128);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = 110 + Math.floor(hash2(i, 7) * 80);
      img.data[i] = v;
      img.data[i + 1] = v;
      img.data[i + 2] = v;
      img.data[i + 3] = 14; // very subtle
    }
    ctx.putImageData(img, 0, 0);
  });

  const litter = baker.bake('litter', (g) => {
    // Crumpled playbills and bottle glints scattered over a half-tile area.
    for (let i = 0; i < 7; i++) {
      const px = 6 + hash2(i, 91) * (HW - 12);
      const py = 4 + hash2(91, i) * (HH - 8);
      if (i % 3 === 0) g.rect(px, py, 3.5, 2.5).fill({ color: 0x9a937e, alpha: 0.8 });
      else if (i % 3 === 1) g.circle(px, py, 1.4).fill({ color: 0x6a705e, alpha: 0.8 });
      else g.rect(px, py, 2.5, 1.5).fill({ color: 0x4a4438, alpha: 0.9 });
    }
  });

  return {
    asphalt,
    asphaltDash,
    sidewalk,
    lot,
    lampWorking,
    lampBroken,
    steamGrate,
    lightPoolSmall,
    lightPoolLarge,
    white,
    skyGradient,
    grain,
    particle,
    litter,
  };
}

export { INK };
