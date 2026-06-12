// Building factory — procedural isometric facades, baked once per variant.
//
// Every building bakes to a PAIR of textures:
//   base     — the lit-by-the-world geometry; sits in the graded (tinted)
//              world container, so it darkens with nightfall.
//   emissive — only the glowing parts (windows, marquee bulbs); sits on the
//              additive light layer, so it ignites as the grade cools.
// That pairing — dark world, warm windows — is the Marquee Noir look.
//
// Convention: facades draw on the SW (+y) face, the left-down face the camera
// sees. North-row buildings genuinely front the road there; south-row
// buildings front away from camera, so — like every isometric city builder —
// we stylize and keep storefronts on the visible face.

import type { Texture } from 'pixi.js';
import { Baker } from './bake';
import { ISO } from '../../config/balance';
import { FACADE, MEMORIAL, TUNGSTEN } from './palette';
import { hash2 } from './textures';

const HW = ISO.TILE_WIDTH / 2;
const HH = ISO.TILE_HEIGHT / 2;

export interface BuildingBake {
  base: Texture;
  emissive: Texture | null;
  /** Texture-space coords of the footprint's N base corner — subtract from
   *  the world position of grid corner (ox, oy) to place the sprite. */
  anchorX: number;
  anchorY: number;
}

export interface BuildingSpec {
  key: string;
  /** Footprint in tiles. */
  w: number;
  d: number;
  wallHeight: number;
  wallColor: number;
  trimColor: number;
  /** Marquee + door for theatres; amenities get storefront glass instead. */
  theatre: boolean;
  derelict: boolean;
  /** Show the memorial plaque (the inherited playhouse carries it). */
  memorial?: boolean;
  seed: number;
}

type G = import('pixi.js').Graphics;

interface Frame {
  /** Base corners in texture space. */
  N: [number, number];
  E: [number, number];
  S: [number, number];
  W: [number, number];
  h: number;
}

function frame(spec: BuildingSpec): Frame {
  const { w, d, wallHeight: h } = spec;
  const sx = d * HW; // shift so W corner lands at x=0
  const sy = h; // shift so roof N corner lands at y=0
  return {
    N: [sx, sy],
    E: [sx + w * HW, sy + w * HH],
    S: [sx + (w - d) * HW, sy + (w + d) * HH],
    W: [sx - d * HW, sy + d * HH],
    h,
  };
}

function poly(g: G, pts: Array<[number, number]>, color: number, alpha = 1) {
  g.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
  g.closePath().fill({ color, alpha });
}

const up = (p: [number, number], dy: number): [number, number] => [p[0], p[1] - dy];
const lerpP = (a: [number, number], b: [number, number], f: number): [number, number] => [
  a[0] + (b[0] - a[0]) * f,
  a[1] + (b[1] - a[1]) * f,
];

/** A quad on the SW face: fStart..fEnd along the W→S edge, y1..y2 up the wall. */
function facePatch(f: Frame, fStart: number, fEnd: number, y1: number, y2: number): Array<[number, number]> {
  const a = lerpP(f.W, f.S, fStart);
  const b = lerpP(f.W, f.S, fEnd);
  return [up(a, y1), up(b, y1), up(b, y2), up(a, y2)];
}

function darken(color: number, f: number): number {
  const r = Math.round(((color >> 16) & 0xff) * f);
  const g = Math.round(((color >> 8) & 0xff) * f);
  const b = Math.round((color & 0xff) * f);
  return (r << 16) | (g << 8) | b;
}

function drawShell(g: G, f: Frame, spec: BuildingSpec) {
  // Right (SE) face — darkest.
  poly(g, [up(f.E, f.h), up(f.S, f.h), f.S, f.E], darken(spec.wallColor, 0.62));
  // Front (SW) face.
  poly(g, [up(f.W, f.h), up(f.S, f.h), f.S, f.W], spec.wallColor);
  // Roof.
  poly(g, [up(f.N, f.h), up(f.E, f.h), up(f.S, f.h), up(f.W, f.h)], darken(spec.wallColor, 0.52));
  // Edge definition — silhouette reads even when the grade goes near-black.
  const edge = darken(spec.trimColor, 1.15);
  g.moveTo(up(f.W, f.h)[0], up(f.W, f.h)[1])
    .lineTo(up(f.S, f.h)[0], up(f.S, f.h)[1])
    .lineTo(up(f.E, f.h)[0], up(f.E, f.h)[1])
    .stroke({ color: edge, width: 1.5, alpha: 0.8 });
  g.moveTo(up(f.S, f.h)[0], up(f.S, f.h)[1]).lineTo(f.S[0], f.S[1]).stroke({ color: edge, width: 1.5, alpha: 0.5 });
  // Cornice along the front top edge.
  poly(g, facePatch(f, 0, 1, f.h - 6, f.h), spec.trimColor);
  // Grounding shadow line along the base.
  poly(g, facePatch(f, 0, 1, -1, 2), 0x000000, 0.35);
}

interface FacadeGlow {
  patches: Array<{ fStart: number; fEnd: number; y1: number; y2: number; color: number; alpha: number }>;
  bulbs: Array<{ fPos: number; y: number; r: number }>;
}

function drawTheatreFacade(g: G, f: Frame, spec: BuildingSpec): FacadeGlow {
  const glow: FacadeGlow = { patches: [], bulbs: [] };
  const grime = spec.derelict;

  // Door — centered double door with a step.
  poly(g, facePatch(f, 0.42, 0.58, 0, 34), darken(spec.wallColor, 0.35));
  poly(g, facePatch(f, 0.495, 0.505, 0, 34), spec.trimColor); // door split
  poly(g, facePatch(f, 0.4, 0.6, -1, 4), darken(spec.trimColor, 0.8)); // step

  // Marquee canopy above the door.
  const mY1 = 44;
  const mY2 = 62;
  poly(g, facePatch(f, 0.28, 0.72, mY1, mY2), grime ? FACADE.marqueeDead : darken(TUNGSTEN.amber, 0.8));
  poly(g, facePatch(f, 0.28, 0.72, mY2 - 3, mY2), spec.trimColor);
  // Bulb row under the canopy lip.
  const bulbCount = 7;
  for (let i = 0; i < bulbCount; i++) {
    const fPos = 0.3 + (0.4 * i) / (bulbCount - 1);
    const p = up(lerpP(f.W, f.S, fPos), mY1 - 3);
    const dead = grime && hash2(spec.seed, i) > 0.2; // derelict: most bulbs dead
    g.circle(p[0], p[1], 2).fill({ color: dead ? 0x222530 : TUNGSTEN.bulb });
    if (!dead) glow.bulbs.push({ fPos, y: mY1 - 3, r: 4 });
  }

  // Upper window rows.
  const rows = Math.max(1, Math.floor((f.h - 80) / 34));
  for (let r = 0; r < rows; r++) {
    const y1 = 74 + r * 34;
    for (let c = 0; c < 4; c++) {
      const fs = 0.12 + c * 0.2;
      const fe = fs + 0.12;
      poly(g, facePatch(f, fs, fe, y1, y1 + 22), FACADE.glassDark);
      poly(g, facePatch(f, fs, fe, y1 + 20, y1 + 22), spec.trimColor);
      if (grime) {
        // Boards over most derelict windows.
        if (hash2(spec.seed + r, c) > 0.3) {
          poly(g, facePatch(f, fs - 0.01, fe + 0.01, y1 + 3, y1 + 9), FACADE.boardedWood);
          poly(g, facePatch(f, fs - 0.01, fe + 0.01, y1 + 12, y1 + 18), darken(FACADE.boardedWood, 0.85));
        }
      } else if (hash2(spec.seed + 50 + r, c) > 0.45) {
        glow.patches.push({ fStart: fs, fEnd: fe, y1, y2: y1 + 22, color: FACADE.glassGlow, alpha: 0.5 });
      }
    }
  }

  // Grime streaks down a derelict front.
  if (grime) {
    for (let i = 0; i < 5; i++) {
      const fs = 0.08 + hash2(spec.seed + 9, i) * 0.84;
      poly(g, facePatch(f, fs, fs + 0.025, 30 + hash2(i, spec.seed) * 20, f.h - 8), 0x12141c, 0.35);
    }
  }

  // Memorial plaque — two overlapping outlined circles by the stage door.
  // Quiet and permanent. No label, no function.
  if (spec.memorial) {
    const p = up(lerpP(f.W, f.S, 0.66), 18);
    g.circle(p[0] - 2.2, p[1], 4).stroke({ color: MEMORIAL.circleLeft, width: 1, alpha: 0.75 });
    g.circle(p[0] + 2.0, p[1] - 1.2, 3.3).stroke({ color: MEMORIAL.circleRight, width: 1, alpha: 0.75 });
  }

  return glow;
}

function drawEmissive(g: G, f: Frame, glow: FacadeGlow) {
  for (const p of glow.patches) {
    poly(g, facePatch(f, p.fStart, p.fEnd, p.y1, p.y2), p.color, p.alpha);
  }
  for (const b of glow.bulbs) {
    const p = up(lerpP(f.W, f.S, b.fPos), b.y);
    g.circle(p[0], p[1], b.r).fill({ color: TUNGSTEN.bulb, alpha: 0.9 });
  }
}

export function bakeBuilding(baker: Baker, spec: BuildingSpec): BuildingBake {
  const f = frame(spec);
  let glow: FacadeGlow = { patches: [], bulbs: [] };

  // Both bakes draw this near-invisible frame first so generateTexture trims
  // them to IDENTICAL bounds — base and emissive sprites must overlay exactly.
  const extentW = (spec.w + spec.d) * HW;
  const extentH = f.h + (spec.w + spec.d) * HH + 2;
  const drawBoundsFrame = (g: G) => {
    g.rect(0, 0, extentW, extentH).fill({ color: 0x000000, alpha: 0.001 });
  };

  const base = baker.bake(`bld-${spec.key}-base`, (g) => {
    drawBoundsFrame(g);
    drawShell(g, f, spec);
    if (spec.theatre) glow = drawTheatreFacade(g, f, spec);
  });

  const hasGlow = glow.patches.length > 0 || glow.bulbs.length > 0;
  const emissive = hasGlow
    ? baker.bake(`bld-${spec.key}-emissive`, (g) => {
        drawBoundsFrame(g);
        drawEmissive(g, f, glow);
      })
    : null;

  return { base, emissive, anchorX: f.N[0], anchorY: f.N[1] };
}

/** The catalog Session 2 needs; later sessions extend per kind/variant. */
export function bakePlayhouse(baker: Baker, derelict: boolean, memorial = false): BuildingBake {
  return bakeBuilding(baker, {
    key: derelict ? 'playhouse-derelict' : 'playhouse',
    w: 3,
    d: 3,
    wallHeight: 150,
    wallColor: derelict ? FACADE.brickDark : FACADE.brickWarm,
    trimColor: FACADE.trim,
    theatre: true,
    derelict,
    memorial,
    seed: 7,
  });
}
