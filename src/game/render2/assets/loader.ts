// Asset loader — thin wrapper around PIXI.Assets that handles manifest
// registration, bundle loading, and the procedural-recolor pass.
//
// Session 1: register manifest; load() is safe to call but bundles are empty.
// Session 2: drop Kenney textures, fill in manifest entries, recolor pass
// fires automatically on load.

import { Assets } from 'pixi.js';
import { ASSET_MANIFEST, type BundleName } from './manifest';
import { recolorToPalette } from './recolor';

let manifestInitialized = false;
const loadedBundles = new Set<BundleName>();

/** Initialize PIXI.Assets with the manifest. Idempotent. */
export async function initAssets(): Promise<void> {
  if (manifestInitialized) return;
  await Assets.init({ manifest: ASSET_MANIFEST });
  manifestInitialized = true;
}

/**
 * Load a bundle by name. Returns the bundle's assets keyed by alias.
 * Runs the recolor pass on each loaded texture so all sprites read from
 * the Stage Door palette regardless of source.
 */
export async function loadBundle(name: BundleName): Promise<Record<string, unknown>> {
  if (!manifestInitialized) await initAssets();
  if (loadedBundles.has(name)) {
    return Assets.cache.get(name) ?? {};
  }
  const bundle = (await Assets.loadBundle(name)) as Record<string, unknown>;
  // Recolor pass — Session 2 wires real textures here.
  for (const alias of Object.keys(bundle)) {
    const tex = bundle[alias];
    if (tex && typeof tex === 'object' && 'source' in (tex as object)) {
      recolorToPalette(tex);
    }
  }
  loadedBundles.add(name);
  return bundle;
}

/** Has a bundle been loaded already this session? */
export function isBundleLoaded(name: BundleName): boolean {
  return loadedBundles.has(name);
}
