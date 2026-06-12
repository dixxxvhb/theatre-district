// StreetScene — composes the Marquee Noir street from the rendering kit.
//
// Containers (inside the camera root):
//   dim     — graded world: ground, litter, one DEPTH-SORTED object layer
//             (dressing + buildings + decorations; z = row*1000 + column),
//             steam. ONE tint per frame.
//   lights  — additive layer (lamp pools, emissives, deco glow), ONE BlurFilter.
//   overlay — buzz heatmap + ghost preview; NOT graded, always readable.
//
// Rebuilds are event-driven (era/placements/litter refs). Per-frame work is
// tint, light alpha, flicker, particles. Never geometry, never bakes.

import { BlurFilter, Container, Graphics, Sprite } from 'pixi.js';
import { AMENITIES, ISO, SHOWTIME, STREET, THEATRES } from '../config/balance';
import type { BuildingKind, DecorationKind, PlacedBuilding, PlacedDecoration, StreetState, UpkeepState } from '../../types/td';
import { columnsForEra, footprintRows, sidewalkRowFor, tileKind } from '../street/topology';
import { isTheatre } from '../street/buzz';
import { gridToWorld } from './iso';
import { Baker } from './kit/bake';
import {
  bakeAmenity,
  bakeConstruction,
  bakeGrand,
  bakeMidhouse,
  bakePlayhouse,
  type BuildingBake,
} from './kit/buildings';
import { bakeDecorations, type DecorationBake } from './kit/decorations';
import { hash2, type TextureKit } from './kit/textures';
import type { Grade } from './kit/palette';
import { prefersReducedMotion, Steam } from './kit/atmosphere';
import { getBuzzField } from '../sim/buzzCache';

const HW = ISO.TILE_WIDTH / 2;
const HH = ISO.TILE_HEIGHT / 2;
const ROW_Z = 1000;

interface FlickerLight {
  sprite: Sprite;
  baseAlpha: number;
  phase: number;
}

export interface GhostSpec {
  kind: 'building' | 'decoration' | 'stringPreview' | 'demolish';
  buildingKind?: BuildingKind;
  decorationKind?: DecorationKind;
  x: number;
  y: number;
  side?: 'north' | 'south';
  spanFromX?: number;
  valid: boolean;
}

export class StreetScene {
  readonly dim = new Container();
  readonly lights = new Container();
  readonly overlay = new Container();

  private kit: TextureKit;
  private theatreBakes: Record<string, { ok: BuildingBake; derelict: BuildingBake }>;
  private amenityBakes: Record<string, BuildingBake>;
  private constructionBakes: Record<number, BuildingBake>;
  private decoBakes: Record<DecorationKind, DecorationBake>;

  private groundC = new Container();
  private litterC = new Container();
  private objectsC = new Container();
  private steam: Steam;
  private heatmap = new Graphics();
  private ghostC = new Container();
  private flickers: FlickerLight[] = [];
  private animateFlicker = !prefersReducedMotion();
  private elapsed = 0;

  private drawnKey = '';
  private drawnLitter: UpkeepState['litter'] | null = null;
  private overlayOn = false;
  private drawnOverlayField: Float32Array | null = null;
  /** Marquee-ignition cascade state (elapsed-ms timestamp, null = idle). */
  private ignitionStart: number | null = null;
  private minLightX = 0;

  /** The crowd view needs the depth-sorted layer; expose it once. */
  get objectLayer(): Container {
    return this.objectsC;
  }

  /** Showtime: lights cascade on, west to east. */
  ignite(): void {
    if (prefersReducedMotion()) return; // function over flourish
    this.ignitionStart = this.elapsed;
    let min = Infinity;
    for (const c of this.lights.children) {
      if (c.x < min) min = c.x;
      const tagged = c as Container & { __baseAlpha?: number };
      if (tagged.__baseAlpha === undefined) tagged.__baseAlpha = c.alpha;
    }
    this.minLightX = min === Infinity ? 0 : min;
  }

  /** Polish pulse: a quick brightness flare on every light, like applause. */
  applauseFlash(): void {
    this.applauseStart = this.elapsed;
  }
  private applauseStart: number | null = null;
  private readonly APPLAUSE_MS = 600;

  constructor(baker: Baker, kit: TextureKit) {
    this.kit = kit;
    this.theatreBakes = {
      theatre_playhouse: { ok: bakePlayhouse(baker, false, true), derelict: bakePlayhouse(baker, true, true) },
      theatre_midhouse: { ok: bakeMidhouse(baker, false), derelict: bakeMidhouse(baker, true) },
      theatre_grand: { ok: bakeGrand(baker, false), derelict: bakeGrand(baker, true) },
    };
    this.amenityBakes = Object.fromEntries(Object.keys(AMENITIES).map((k) => [k, bakeAmenity(baker, k)]));
    this.constructionBakes = Object.fromEntries([2, 3, 4, 6].map((w) => [w, bakeConstruction(baker, w)]));
    this.decoBakes = bakeDecorations(baker);

    this.objectsC.sortableChildren = true;
    this.steam = new Steam(this.kit);
    // The buzz heatmap lives ON the ground — under objects, over tiles — so
    // it never paints across building walls. Only the ghost floats on top.
    this.dim.addChild(this.groundC, this.litterC, this.heatmap, this.objectsC, this.steam.container);

    this.lights.blendMode = 'add';
    this.lights.filters = [new BlurFilter({ strength: 6, quality: 4 })];

    this.overlay.addChild(this.ghostC);
  }

  // --- public sync points -----------------------------------------------------

  /** Rebuild static content when era/placements change (reference identity —
   *  the store is immutable, so a new array means a real change). */
  sync(street: StreetState, upkeep: UpkeepState): void {
    if (
      String(street.era) !== this.drawnKey ||
      this.lastBuildings !== street.buildings ||
      this.lastDecorations !== street.decorations
    ) {
      this.drawnKey = String(street.era);
      this.lastBuildings = street.buildings;
      this.lastDecorations = street.decorations;
      this.rebuildAll(street);
    }
    if (upkeep.litter !== this.drawnLitter) {
      this.drawnLitter = upkeep.litter;
      this.rebuildLitter(street, upkeep);
    }
    if (this.overlayOn) this.redrawHeatmap(street, upkeep);
  }

  private lastBuildings: PlacedBuilding[] | null = null;
  private lastDecorations: PlacedDecoration[] | null = null;

  setOverlay(on: boolean, street: StreetState, upkeep: UpkeepState): void {
    this.overlayOn = on;
    this.heatmap.visible = on;
    if (on) {
      this.drawnOverlayField = null;
      this.redrawHeatmap(street, upkeep);
    }
  }

  /** Ghost preview; pass null to clear. */
  showGhost(spec: GhostSpec | null): void {
    this.ghostC.removeChildren().forEach((c) => c.destroy());
    if (!spec) return;
    const tint = spec.valid ? 0x8fd98f : 0xe06a6a;

    if (spec.kind === 'building' && spec.buildingKind && spec.side) {
      const bake = this.bakeForKind(spec.buildingKind, false);
      const sprite = new Sprite(bake.base);
      const { px, py } = this.buildingOrigin(spec.x, spec.side, bake);
      sprite.position.set(px, py);
      sprite.tint = tint;
      sprite.alpha = 0.65;
      this.ghostC.addChild(sprite);
    } else if (spec.kind === 'decoration' && spec.decorationKind) {
      const bake = this.decoBakes[spec.decorationKind];
      const sprite = new Sprite(bake.tex);
      const { wx, wy } = gridToWorld(spec.x, spec.y);
      sprite.position.set(wx + bake.ox, wy + bake.oy);
      sprite.tint = tint;
      sprite.alpha = 0.75;
      this.ghostC.addChild(sprite);
      this.addTileMarker(spec.x, spec.y, tint);
    } else if (spec.kind === 'stringPreview') {
      const from = spec.spanFromX ?? spec.x;
      const [a, b] = [Math.min(from, spec.x), Math.max(from, spec.x)];
      for (let x = a; x < b; x++) this.addSwag(this.ghostC, x, spec.y, tint, 0.7);
      this.addTileMarker(a, spec.y, tint);
      this.addTileMarker(b, spec.y, tint);
    } else if (spec.kind === 'demolish') {
      this.addTileMarker(spec.x, spec.y, 0xe06a6a);
    }
  }

  /** Per-frame: grade tint, light intensity, flicker, steam. */
  update(grade: Grade, dtMs: number): void {
    this.dim.tint = grade.world;
    this.lights.alpha = grade.lights;
    this.elapsed += dtMs;

    // Applause flash overrides everything briefly.
    if (this.applauseStart !== null) {
      const since = this.elapsed - this.applauseStart;
      const t = Math.min(1, since / this.APPLAUSE_MS);
      const boost = 1 + Math.sin(Math.PI * t) * 0.55;
      for (const c of this.lights.children) {
        const tagged = c as Container & { __baseAlpha?: number };
        c.alpha = (tagged.__baseAlpha ?? c.alpha) * boost;
      }
      if (t >= 1) this.applauseStart = null;
    }
    // Marquee-ignition cascade: each light steps on by street position.
    else if (this.ignitionStart !== null) {
      const since = this.elapsed - this.ignitionStart;
      let allOn = true;
      // Apply a tiny overshoot when each light lands — that "tink" beat.
      const overshoot = (f: number) => (f < 1 ? f : f < 1.1 ? 1.4 - 4 * (f - 1) : 1);
      for (const c of this.lights.children) {
        const tagged = c as Container & { __baseAlpha?: number };
        const base = tagged.__baseAlpha ?? c.alpha;
        const delay = ((c.x - this.minLightX) / ISO.TILE_WIDTH) * SHOWTIME.IGNITION_MS_PER_COLUMN;
        const f = (since - delay) / SHOWTIME.IGNITION_RAMP_MS;
        const clamped = Math.min(Math.max(f, 0), 1.1);
        c.alpha = base * overshoot(clamped);
        if (clamped < 1) allOn = false;
      }
      if (allOn) this.ignitionStart = null;
    } else if (this.animateFlicker) {
      for (const f of this.flickers) {
        const t = this.elapsed / 1000;
        const n = 0.62 + 0.38 * Math.abs(Math.sin(t * 7 + f.phase) * Math.sin(t * 13.7 + f.phase * 2.3));
        f.sprite.alpha = f.baseAlpha * n;
      }
    }
    this.steam.update(dtMs);
  }

  // --- rebuilds ----------------------------------------------------------------

  private rebuildAll(street: StreetState): void {
    this.rebuildGround(street.era);
    // Only scene-owned children: the crowd pool shares this container for
    // depth sorting and must survive rebuilds (its sprites are pooled).
    for (const c of [...this.objectsC.children]) {
      if ((c as Container & { __sceneOwned?: boolean }).__sceneOwned) {
        this.objectsC.removeChild(c);
        c.destroy();
      }
    }
    this.lights.removeChildren().forEach((c) => c.destroy());
    this.flickers = [];
    const emitters: Array<{ wx: number; wy: number }> = [];
    this.buildDressing(street.era, emitters);
    this.buildBuildings(street.buildings);
    this.buildDecorations(street.decorations, emitters);
    this.steam.setEmitters(emitters);
  }

  private rebuildGround(era: number): void {
    this.groundC.removeChildren().forEach((c) => c.destroy());
    const cols = columnsForEra(era);
    for (let y = 0; y < STREET.TOTAL_ROWS; y++) {
      const kind = tileKind(y);
      const set = kind === 'road' ? this.kit.asphalt : kind.startsWith('sidewalk') ? this.kit.sidewalk : this.kit.lot;
      for (let x = 0; x < cols; x++) {
        const tex =
          kind === 'road' && y === 4 && x % 2 === 0 ? this.kit.asphaltDash : set[Math.floor(hash2(x, y) * set.length)];
        const sprite = new Sprite(tex);
        const { wx, wy } = gridToWorld(x, y);
        sprite.position.set(wx - HW, wy - HH);
        this.groundC.addChild(sprite);
      }
    }
  }

  private buildDressing(era: number, emitters: Array<{ wx: number; wy: number }>): void {
    const cols = columnsForEra(era);
    for (const side of ['north', 'south'] as const) {
      const y = sidewalkRowFor(side);
      for (let x = 2; x < cols - 1; x += 5) {
        const heroLamp = era === 0 && side === 'north' && x === 7;
        const aliveRoll = hash2(x * 13, y * 7);
        const threshold = era === 0 ? 0.72 : 0.25;
        const working = heroLamp || aliveRoll > threshold;
        const flickering = heroLamp || (working && aliveRoll < threshold + 0.1);

        const { wx, wy } = gridToWorld(x, y);
        const lamp = new Sprite(working ? this.kit.lampWorking : this.kit.lampBroken);
        lamp.position.set(wx - 6.5, wy - 84);
        lamp.zIndex = y * ROW_Z + x;
        this.addOwned(lamp);
        if (working) this.addLampGlow(wx, wy, flickering, x);
      }
      // Ambient grates (era dressing, separate from buyable steam grates).
      for (let x = 4; x < cols - 2; x += 9) {
        if (hash2(x * 3, y * 11) > 0.5) continue;
        const { wx, wy } = gridToWorld(x, y);
        const grate = new Sprite(this.kit.steamGrate);
        grate.position.set(wx - 15, wy - 7);
        grate.zIndex = y * ROW_Z + x - 0.5;
        this.addOwned(grate);
        emitters.push({ wx, wy: wy - 4 });
      }
    }
  }

  private buildBuildings(buildings: PlacedBuilding[]): void {
    for (const b of buildings) {
      const width = this.widthFor(b.kind);
      const underConstruction = b.constructionDaysLeft > 0;
      const bake = underConstruction ? this.constructionBakes[width] : this.bakeForKind(b.kind, b.condition < 0.4);
      const frontRow = b.side === 'north' ? 2 : 9;

      const sprite = new Sprite(bake.base);
      const { px, py } = this.buildingOrigin(b.x, b.side, bake);
      sprite.position.set(px, py);
      sprite.zIndex = frontRow * ROW_Z + b.x;
      this.addOwned(sprite);

      if (!underConstruction && bake.emissive && b.condition >= 0.4) {
        const em = new Sprite(bake.emissive);
        em.position.copyFrom(sprite.position);
        this.lights.addChild(em);
      }
    }
  }

  private buildDecorations(decorations: PlacedDecoration[], emitters: Array<{ wx: number; wy: number }>): void {
    for (const d of decorations) {
      if (d.kind === 'string_lights' && d.spanToX !== undefined) {
        const [a, b] = [Math.min(d.x, d.spanToX), Math.max(d.x, d.spanToX)];
        for (let x = a; x < b; x++) {
          this.addSwag(this.objectsC, x, d.y, 0xffffff, 1);
          const mid = gridToWorld(x, d.y);
          this.addDecoLight(this.decoBakes.string_lights, (mid.wx + gridToWorld(x + 1, d.y).wx) / 2, (mid.wy + gridToWorld(x + 1, d.y).wy) / 2, x);
        }
        continue;
      }
      const bake = this.decoBakes[d.kind];
      const { wx, wy } = gridToWorld(d.x, d.y);
      const sprite = new Sprite(bake.tex);
      sprite.position.set(wx + bake.ox, wy + bake.oy);
      sprite.zIndex = d.y * ROW_Z + d.x;
      this.addOwned(sprite);
      if (bake.light) this.addDecoLight(bake, wx, wy, d.x);
      if (bake.steam) emitters.push({ wx, wy: wy - 4 });
    }
  }

  private rebuildLitter(street: StreetState, upkeep: UpkeepState): void {
    this.litterC.removeChildren().forEach((c) => c.destroy());
    const cols = columnsForEra(street.era);
    for (const [key, units] of Object.entries(upkeep.litter)) {
      const [xs, ys] = key.split(',');
      const x = Number(xs);
      const y = Number(ys);
      if (x < 0 || x >= cols) continue;
      const sprite = new Sprite(this.kit.litter);
      const { wx, wy } = gridToWorld(x, y);
      sprite.position.set(wx - HW / 2, wy - HH / 2);
      sprite.alpha = Math.min(units / 4, 1) * 0.9;
      this.litterC.addChild(sprite);
    }
  }

  private redrawHeatmap(street: StreetState, upkeep: UpkeepState): void {
    const { field, cols } = getBuzzField(street, upkeep);
    if (field === this.drawnOverlayField) return;
    this.drawnOverlayField = field;

    const g = this.heatmap;
    g.clear();
    for (let y = 0; y < STREET.TOTAL_ROWS; y++) {
      for (let x = 0; x < cols; x++) {
        const v = field[y * cols + x];
        if (Math.abs(v) < 0.05) continue;
        // Colorblind-safe diverging ramp: blue (negative) ↔ orange (positive).
        const color = v > 0 ? 0xe08214 : 0x4575b4;
        const alpha = Math.min(Math.abs(v) / 10, 1) * 0.55;
        const { wx, wy } = gridToWorld(x, y);
        g.moveTo(wx, wy - HH)
          .lineTo(wx + HW, wy)
          .lineTo(wx, wy + HH)
          .lineTo(wx - HW, wy)
          .closePath()
          .fill({ color, alpha });
      }
    }
  }

  // --- helpers -------------------------------------------------------------------

  widthFor(kind: BuildingKind): number {
    return isTheatre(kind)
      ? THEATRES[kind as keyof typeof THEATRES].width
      : AMENITIES[kind as keyof typeof AMENITIES].width;
  }

  private bakeForKind(kind: BuildingKind, derelict: boolean): BuildingBake {
    if (isTheatre(kind)) {
      const pair = this.theatreBakes[kind];
      return derelict ? pair.derelict : pair.ok;
    }
    return this.amenityBakes[kind];
  }

  private buildingOrigin(x: number, side: 'north' | 'south', bake: BuildingBake): { px: number; py: number } {
    const oy = footprintRows(side, 3)[0];
    const cornerX = (x - oy) * HW;
    const cornerY = (x + oy) * HH - HH;
    return { px: cornerX - bake.anchorX, py: cornerY - bake.anchorY };
  }

  private addLampGlow(wx: number, wy: number, flickering: boolean, phase: number): void {
    const head = new Sprite(this.kit.lightPoolSmall);
    head.anchor.set(0.5);
    head.position.set(wx, wy - 72);
    head.alpha = 0.9;
    const pool = new Sprite(this.kit.lightPoolLarge);
    pool.anchor.set(0.5);
    pool.position.set(wx, wy);
    pool.alpha = 0.4;
    pool.scale.set(1, 0.55);
    this.lights.addChild(pool, head);
    if (flickering) {
      this.flickers.push({ sprite: head, baseAlpha: 0.9, phase });
      this.flickers.push({ sprite: pool, baseAlpha: 0.4, phase });
    }
  }

  private addDecoLight(bake: DecorationBake, wx: number, wy: number, phase: number): void {
    if (!bake.light) return;
    const tex = bake.light.large ? this.kit.lightPoolLarge : this.kit.lightPoolSmall;
    const s = new Sprite(tex);
    s.anchor.set(0.5);
    s.position.set(wx + bake.light.dx, wy + bake.light.dy);
    s.scale.set(bake.light.scale);
    s.alpha = bake.light.alpha;
    this.lights.addChild(s);
    void phase;
  }

  private addSwag(parent: Container, x: number, y: number, tint: number, alpha: number): void {
    const bake = this.decoBakes.string_lights;
    const a = gridToWorld(x, y);
    const sprite = new Sprite(bake.tex);
    sprite.anchor.set(0, 0.5);
    sprite.position.set(a.wx, a.wy - 36);
    sprite.rotation = Math.atan2(HH, HW);
    sprite.width = Math.hypot(HW, HH);
    sprite.tint = tint;
    sprite.alpha = alpha;
    sprite.zIndex = y * ROW_Z + x + 0.5;
    if (parent === this.objectsC) (sprite as Sprite & { __sceneOwned?: boolean }).__sceneOwned = true;
    parent.addChild(sprite);
  }

  private addOwned(c: Container): void {
    (c as Container & { __sceneOwned?: boolean }).__sceneOwned = true;
    this.objectsC.addChild(c);
  }

  private addTileMarker(x: number, y: number, tint: number): void {
    const g = new Graphics();
    const { wx, wy } = gridToWorld(x, y);
    g.moveTo(wx, wy - HH)
      .lineTo(wx + HW, wy)
      .lineTo(wx, wy + HH)
      .lineTo(wx - HW, wy)
      .closePath()
      .stroke({ color: tint, width: 2, alpha: 0.9 });
    this.ghostC.addChild(g);
  }
}
