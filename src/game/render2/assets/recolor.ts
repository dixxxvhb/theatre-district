// Procedural recolor — maps a source texture's grayscale ramp onto the
// Stage Door palette so mixed-source assets read as one product.
//
// Session 1 STUB: no-op. The recolor pipeline only fires when textures
// actually arrive (Session 2). This file is the API surface so the loader
// can call it unconditionally.
//
// Session 2 plan:
//   1. Render source texture to an offscreen canvas
//   2. Walk pixels — sample value (0..255), map to PALETTE ramp by luminance
//   3. Write back to a new Texture, register in Assets cache under recolored alias
//   4. Original Kenney source stays untouched (idempotent if called twice)
//
// The palette ramp is locked at Stage Door (see assets/palette.ts).

import type { Texture } from 'pixi.js';

/** Recolor a single texture in place. No-op in Session 1. */
export function recolorToPalette(_tex: unknown): Texture | null {
  // Session 2: implement luminance → palette mapping pass here.
  return null;
}

/** Future helper: build the luminance-to-palette LUT once at boot. */
export function buildPaletteLUT(): Uint8Array {
  // 256-entry RGB LUT mapping grayscale value → Stage Door palette color.
  // Session 2 implementation.
  return new Uint8Array(256 * 3);
}
