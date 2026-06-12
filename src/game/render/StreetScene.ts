// StreetScene — composes the Marquee Noir street from the rendering kit.
// Replaces Session 1's DebugStreetView.
//
// Layer order inside the camera root:
//   dim    — tiles, dressing, buildings, steam. Tinted by the time-of-day
//            grade every frame (one container tint — never per-sprite work).
//   lights — additive glow sprites (lamp pools, emissive facades) with ONE
//            BlurFilter for bloom. Master alpha follows the grade, so the
//            street ignites as night falls.
//
// Rebuilds happen only on era/building changes. Per-frame work is tint,
// light alpha, flicker, and particle positions — no geometry, no bakes.

import { BlurFilter, Container, Sprite } from 'pixi.js';
import { ISO, STREET } from '../config/balance';
import type { PlacedBuilding } from '../../types/td';
import { columnsForEra, footprintRows, sidewalkRowFor, tileKind } from '../street/topology';
import { gridToWorld } from './iso';
import { Baker } from './kit/bake';
import { bakePlayhouse, type BuildingBake } from './kit/buildings';
import { hash2, type TextureKit } from './kit/textures';
import type { Grade } from './kit/palette';
import { prefersReducedMotion, Steam } from './kit/atmosphere';

const HW = ISO.TILE_WIDTH / 2;
const HH = ISO.TILE_HEIGHT / 2;

interface FlickerLight {
  sprite: Sprite;
  baseAlpha: number;
  phase: number;
}

export class StreetScene {
  /** Graded world content. */
  readonly dim = new Container();
  /** Additive light layer with bloom. */
  readonly lights = new Container();

  private kit: TextureKit;
  private playhouseDerelict: BuildingBake;
  private playhouse: BuildingBake;

  private tilesC = new Container();
  private dressingC = new Container();
  private buildingsC = new Container();
  private steam: Steam;
  private flickers: FlickerLight[] = [];
  private animateFlicker = !prefersReducedMotion();
  private elapsed = 0;

  private drawnEra = -1;
  private drawnBuildingsKey = '';

  constructor(baker: Baker, kit: TextureKit) {
    this.kit = kit;
    // The inherited playhouse carries the memorial mark.
    this.playhouseDerelict = bakePlayhouse(baker, true, true);
    this.playhouse = bakePlayhouse(baker, false, true);

    this.dressingC.sortableChildren = true;
    this.buildingsC.sortableChildren = true;
    this.steam = new Steam(this.kit);
    this.dim.addChild(this.tilesC, this.dressingC, this.buildingsC, this.steam.container);

    // Additive layer + ONE blur for bloom (architecture rule: one filter on
    // the layer container, never per sprite).
    this.lights.blendMode = 'add';
    this.lights.filters = [new BlurFilter({ strength: 6, quality: 4 })];
  }

  /** Rebuild static content when era or placements change. */
  sync(era: number, buildings: PlacedBuilding[]): void {
    if (era !== this.drawnEra) {
      this.drawnEra = era;
      this.rebuildGround(era);
      this.rebuildDressing(era);
      this.drawnBuildingsKey = ''; // force building re-place (z vs dressing)
    }
    const key = buildings.map((b) => `${b.id}:${b.kind}:${b.x}:${b.side}:${b.condition < 0.5 ? 'd' : 'ok'}`).join('|');
    if (key !== this.drawnBuildingsKey) {
      this.drawnBuildingsKey = key;
      this.rebuildBuildings(buildings);
    }
  }

  /** Per-frame: grade tint, light intensity, flicker, steam. */
  update(grade: Grade, dtMs: number): void {
    this.dim.tint = grade.world;
    this.lights.alpha = grade.lights;

    this.elapsed += dtMs;
    if (this.animateFlicker) {
      for (const f of this.flickers) {
        const t = this.elapsed / 1000;
        const n =
          0.62 +
          0.38 * Math.abs(Math.sin(t * 7 + f.phase) * Math.sin(t * 13.7 + f.phase * 2.3));
        f.sprite.alpha = f.baseAlpha * n;
      }
    }
    this.steam.update(dtMs);
  }

  // --- rebuilds ---------------------------------------------------------------

  private rebuildGround(era: number): void {
    this.tilesC.removeChildren().forEach((c) => c.destroy());
    const cols = columnsForEra(era);
    for (let y = 0; y < STREET.TOTAL_ROWS; y++) {
      const kind = tileKind(y);
      const set =
        kind === 'road' ? this.kit.asphalt : kind.startsWith('sidewalk') ? this.kit.sidewalk : this.kit.lot;
      for (let x = 0; x < cols; x++) {
        // Center-line dashes on alternating row-4 road tiles.
        const tex =
          kind === 'road' && y === 4 && x % 2 === 0
            ? this.kit.asphaltDash
            : set[Math.floor(hash2(x, y) * set.length)];
        const sprite = new Sprite(tex);
        const { wx, wy } = gridToWorld(x, y);
        sprite.position.set(wx - HW, wy - HH);
        this.tilesC.addChild(sprite);
      }
    }
  }

  private rebuildDressing(era: number): void {
    this.dressingC.removeChildren().forEach((c) => c.destroy());
    this.lights.removeChildren().forEach((c) => c.destroy());
    this.flickers = [];

    const cols = columnsForEra(era);
    const emitters: Array<{ wx: number; wy: number }> = [];

    for (const side of ['north', 'south'] as const) {
      const y = sidewalkRowFor(side);
      for (let x = 2; x < cols - 1; x += 5) {
        const { wx, wy } = gridToWorld(x, y);
        // Era 1 is the Dark Block: most lamps are dead. Later eras refit them.
        // One lamp by the inherited playhouse always works — and struggles.
        const heroLamp = era === 0 && side === 'north' && x === 7;
        const aliveRoll = hash2(x * 13, y * 7);
        const threshold = era === 0 ? 0.72 : 0.25;
        const working = heroLamp || aliveRoll > threshold;
        const flickering = heroLamp || (working && aliveRoll < threshold + 0.1);

        const lamp = new Sprite(working ? this.kit.lampWorking : this.kit.lampBroken);
        lamp.position.set(wx - 6.5, wy - 84);
        lamp.zIndex = x + y;
        this.dressingC.addChild(lamp);

        if (working) {
          const head = new Sprite(this.kit.lightPoolSmall);
          head.anchor.set(0.5);
          head.position.set(wx, wy - 72);
          head.alpha = 0.9;
          const pool = new Sprite(this.kit.lightPoolLarge);
          pool.anchor.set(0.5);
          pool.position.set(wx, wy);
          pool.alpha = 0.4;
          pool.scale.set(1, 0.55); // squash ground pools into iso ellipses
          this.lights.addChild(pool, head);
          if (flickering) {
            this.flickers.push({ sprite: head, baseAlpha: 0.9, phase: x });
            this.flickers.push({ sprite: pool, baseAlpha: 0.4, phase: x });
          }
        }
      }
    }

    // A couple of steam grates on each side, deterministic spots.
    for (const side of ['north', 'south'] as const) {
      const y = sidewalkRowFor(side);
      for (let x = 4; x < cols - 2; x += 9) {
        if (hash2(x * 3, y * 11) > 0.5) continue;
        const { wx, wy } = gridToWorld(x, y);
        const grate = new Sprite(this.kit.steamGrate);
        grate.position.set(wx - 15, wy - 7);
        grate.zIndex = x + y - 0.5;
        this.dressingC.addChild(grate);
        emitters.push({ wx, wy: wy - 4 });
      }
    }
    this.steam.setEmitters(emitters);
  }

  private rebuildBuildings(buildings: PlacedBuilding[]): void {
    this.buildingsC.removeChildren().forEach((c) => c.destroy());
    // Building emissives share the light layer with lamps; lamps were rebuilt
    // in rebuildDressing, so only remove emissives we tagged.
    this.lights.children
      .filter((c) => (c as Sprite & { __emissive?: boolean }).__emissive)
      .forEach((c) => {
        this.lights.removeChild(c);
        c.destroy();
      });

    for (const b of buildings) {
      const bake = this.bakeFor(b);
      const depth = 3; // theatre lots are 3 deep (FOOTPRINTS; varies in S3)
      const rows = footprintRows(b.side, depth);
      const oy = rows[0];
      // World position of the footprint's N grid corner (ox, oy).
      const cornerX = (b.x - oy) * HW;
      const cornerY = (b.x + oy) * HH - HH;

      const sprite = new Sprite(bake.base);
      sprite.position.set(cornerX - bake.anchorX, cornerY - bake.anchorY);
      sprite.zIndex = b.x + oy + depth + 3;
      this.buildingsC.addChild(sprite);

      if (bake.emissive) {
        const em = new Sprite(bake.emissive) as Sprite & { __emissive?: boolean };
        em.__emissive = true;
        em.position.copyFrom(sprite.position);
        this.lights.addChild(em);
      }
    }
  }

  private bakeFor(b: PlacedBuilding): BuildingBake {
    // Session 2 catalog: the playhouse pair. Session 3 extends per kind.
    return b.condition < 0.5 ? this.playhouseDerelict : this.playhouse;
  }
}
