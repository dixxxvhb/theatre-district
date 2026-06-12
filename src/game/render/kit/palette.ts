// Marquee Noir — palette tokens and the time-of-day color story.
//
// Lighting IS the art style: a street at golden hour into night. Everything
// procedural draws from these tokens; the day/night cycle is expressed as a
// single world-container tint plus a sky gradient plus the additive light
// layer — never per-sprite filters, never re-baking (architecture rule #5).

// ---------------------------------------------------------------------------
// Core tokens
// ---------------------------------------------------------------------------
export const INK = {
  /** Deep blue-black sky and page background. */
  night: 0x0a0d18,
  nightHigh: 0x141a2e,
  /** Cream paper (UI chrome lives in React, but canvas text may use this). */
  cream: 0xf2e8d5,
} as const;

export const TUNGSTEN = {
  glow: 0xffd9a0,
  bulb: 0xffe9c4,
  amber: 0xd4a574,
  deepGold: 0xb8860b,
} as const;

export const NEON = {
  teal: 0x4fd6c2,
  magenta: 0xe05299,
  blue: 0x5a8fe0,
} as const;

export const MEMORIAL = {
  circleLeft: 0xc9a96e,
  circleRight: 0xe2b955,
} as const;

export const SURFACE = {
  asphalt: 0x23252e,
  asphaltCrack: 0x1b1d24,
  roadPaint: 0x8a8460,
  sidewalk: 0x3a3d49,
  sidewalkSeam: 0x2e3039,
  curb: 0x4a4e5c,
  lotGravel: 0x1f2230,
  lotRubble: 0x282c3c,
} as const;

export const FACADE = {
  brickDark: 0x3a2f33,
  brickWarm: 0x4a3a35,
  stone: 0x44434e,
  paintedTeal: 0x2e4a4a,
  paintedOx: 0x4a3038,
  trim: 0x5c5648,
  boardedWood: 0x4a4034,
  glassDark: 0x161a26,
  glassGlow: 0xffd9a0,
  marqueeDead: 0x2c2a33,
} as const;

// ---------------------------------------------------------------------------
// Time-of-day grading
// The grade is a multiply tint on the world container, lerped through
// keyframes across the day. Light-layer intensity ramps as the grade cools —
// that contrast (dark world, warm lights) is the whole look.
// ---------------------------------------------------------------------------

interface GradeStop {
  /** Time of day 0..1. */
  t: number;
  /** Multiply tint applied to the world container. */
  world: number;
  /** Sky gradient, top → horizon. */
  skyTop: number;
  skyHorizon: number;
  /** 0..1 master intensity for the additive light layer. */
  lights: number;
}

/** Keyframes through the showtime pulse: cool flat afternoon → amber dusk →
 *  marquee night → late-night wind-down. */
const GRADE_STOPS: GradeStop[] = [
  { t: 0.0,  world: 0xd8dcec, skyTop: 0x32405e, skyHorizon: 0x7a7f9a, lights: 0.0 },  // flat afternoon
  { t: 0.3,  world: 0xe0d0bc, skyTop: 0x343658, skyHorizon: 0xa87862, lights: 0.1 },  // light warming
  { t: 0.45, world: 0xe2b390, skyTop: 0x232447, skyHorizon: 0xc77b50, lights: 0.45 }, // golden hour
  { t: 0.6,  world: 0x6a76a8, skyTop: 0x0c1020, skyHorizon: 0x3a3460, lights: 1.0 },  // curtain — night
  { t: 0.8,  world: 0x5e6a9c, skyTop: 0x0a0d18, skyHorizon: 0x2a2848, lights: 1.0 },  // post-show
  { t: 1.0,  world: 0x4e5784, skyTop: 0x080a12, skyHorizon: 0x1e1c36, lights: 0.8 },  // wind-down
];

function lerp(a: number, b: number, f: number): number {
  return a + (b - a) * f;
}

export function lerpColor(a: number, b: number, f: number): number {
  const ar = (a >> 16) & 0xff, ag = (a >> 8) & 0xff, ab = a & 0xff;
  const br = (b >> 16) & 0xff, bg = (b >> 8) & 0xff, bb = b & 0xff;
  return (
    (Math.round(lerp(ar, br, f)) << 16) |
    (Math.round(lerp(ag, bg, f)) << 8) |
    Math.round(lerp(ab, bb, f))
  );
}

export interface Grade {
  world: number;
  skyTop: number;
  skyHorizon: number;
  lights: number;
}

/** The full color grade for a time of day (0..1). Pure; cheap to call per frame. */
export function gradeAt(t: number): Grade {
  const clamped = Math.min(Math.max(t, 0), 1);
  let i = 0;
  while (i < GRADE_STOPS.length - 2 && GRADE_STOPS[i + 1].t <= clamped) i++;
  const a = GRADE_STOPS[i];
  const b = GRADE_STOPS[i + 1];
  const f = b.t === a.t ? 0 : (clamped - a.t) / (b.t - a.t);
  return {
    world: lerpColor(a.world, b.world, f),
    skyTop: lerpColor(a.skyTop, b.skyTop, f),
    skyHorizon: lerpColor(a.skyHorizon, b.skyHorizon, f),
    lights: lerp(a.lights, b.lights, f),
  };
}
