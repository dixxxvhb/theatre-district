// StreetView — composes the street scene:
//   - TileLayer (ground + hover + selection)
//   - BuildingSprite map (additive diff)
//   - DecorationSprite map (additive diff)
//   - Ghost preview overlay (placement valid/invalid)
//
// Pure render layer — reads inputs in `update()`, doesn't subscribe to the
// store itself. The React shell (Render2Canvas) owns subscription.

import { Container, Graphics } from 'pixi.js';
import type { PlacedBuilding, PlacedDecoration, Position, Size } from '../../../types';
import { TILE } from '../../data/constants';
import { gridToScreen } from '../coords';
import { LAYER } from '../depth';
import { TileLayer, type GridBounds } from '../tiles/TileLayer';
import { BuildingSprite } from '../entities/BuildingSprite';
import { DecorationSprite } from '../entities/DecorationSprite';
import { BuzzOverlay } from './BuzzOverlay';
import { CrowdRenderer } from './CrowdRenderer';
import { LitterLayer } from './LitterLayer';
import type { StreetLitter } from '../../../types';

export interface StreetViewInputs {
  bounds: GridBounds;
  ownedTiles: Set<string>;
  buildings: PlacedBuilding[];
  decoration: PlacedDecoration[];
  litter: StreetLitter[];
  hoveredTile: { x: number; y: number } | null;
  selectedTile: { x: number; y: number } | null;
  ghost: GhostState | null;
  buzzField: Float32Array;
  buzzFieldWidth: number;
  buzzFieldHeight: number;
  showBuzzOverlay: boolean;
}

export interface GhostState {
  position: Position;
  footprint: Size;          // single-tile decoration uses {1,1}
  valid: boolean;
}

export class StreetView {
  readonly container = new Container();
  readonly tileLayer: TileLayer;
  readonly litterLayer: LitterLayer;
  readonly buzzOverlay: BuzzOverlay;
  readonly crowdRenderer: CrowdRenderer;
  private buildingSprites = new Map<string, BuildingSprite>();
  private decorationSprites = new Map<string, DecorationSprite>();
  private ghostGraphics = new Graphics();

  constructor() {
    this.container.label = 'StreetView';
    this.container.sortableChildren = true;
    this.tileLayer = new TileLayer();
    this.container.addChild(this.tileLayer.container);
    this.litterLayer = new LitterLayer();
    this.container.addChild(this.litterLayer.container);
    this.buzzOverlay = new BuzzOverlay();
    this.container.addChild(this.buzzOverlay.container);
    this.crowdRenderer = new CrowdRenderer();
    this.container.addChild(this.crowdRenderer.container);

    this.ghostGraphics.zIndex = LAYER.UI_OVERLAY + 5; // above buzz overlay
    this.container.addChild(this.ghostGraphics);
  }

  update(inputs: StreetViewInputs): void {
    this.updateGround(inputs);
    this.updateHover(inputs);
    this.updateBuildings(inputs.buildings);
    this.updateDecoration(inputs.decoration);
    this.litterLayer.draw(inputs.litter);
    this.updateBuzzOverlay(inputs);
    this.drawGhost(inputs.ghost);
  }

  private updateBuzzOverlay(inputs: StreetViewInputs): void {
    this.buzzOverlay.setVisible(inputs.showBuzzOverlay);
    if (inputs.showBuzzOverlay) {
      this.buzzOverlay.draw(inputs.bounds, inputs.buzzField, inputs.buzzFieldWidth, inputs.buzzFieldHeight);
    }
  }

  /** Update only the ghost (called per-tick from the engine ticker). */
  setGhost(ghost: GhostState | null): void {
    this.drawGhost(ghost);
  }

  setHover(tile: { x: number; y: number } | null): void {
    this.tileLayer.drawHover(tile?.x ?? null, tile?.y ?? null);
  }

  private updateGround(inputs: StreetViewInputs): void {
    this.tileLayer.drawGround(inputs.bounds, (gx, gy) => inputs.ownedTiles.has(`${gx},${gy}`));
  }

  private updateHover(inputs: StreetViewInputs): void {
    this.tileLayer.drawHover(inputs.hoveredTile?.x ?? null, inputs.hoveredTile?.y ?? null);
    this.tileLayer.drawSelection(inputs.selectedTile?.x ?? null, inputs.selectedTile?.y ?? null);
  }

  private updateBuildings(buildings: PlacedBuilding[]): void {
    const seen = new Set<string>();
    for (const b of buildings) {
      seen.add(b.id);
      const existing = this.buildingSprites.get(b.id);
      if (existing) {
        existing.update(b);
      } else {
        const sprite = new BuildingSprite(b);
        this.buildingSprites.set(b.id, sprite);
        this.container.addChild(sprite.container);
      }
    }
    // Remove any sprite whose id no longer exists in state
    for (const [id, sprite] of this.buildingSprites) {
      if (!seen.has(id)) {
        this.container.removeChild(sprite.container);
        sprite.destroy();
        this.buildingSprites.delete(id);
      }
    }
  }

  private updateDecoration(decoration: PlacedDecoration[]): void {
    const seen = new Set<string>();
    for (const d of decoration) {
      seen.add(d.id);
      const existing = this.decorationSprites.get(d.id);
      if (existing) {
        existing.update(d);
      } else {
        const sprite = new DecorationSprite(d);
        this.decorationSprites.set(d.id, sprite);
        this.container.addChild(sprite.container);
      }
    }
    for (const [id, sprite] of this.decorationSprites) {
      if (!seen.has(id)) {
        this.container.removeChild(sprite.container);
        sprite.destroy();
        this.decorationSprites.delete(id);
      }
    }
  }

  private drawGhost(ghost: GhostState | null): void {
    const g = this.ghostGraphics;
    g.clear();
    if (!ghost) return;
    const color = ghost.valid ? 0x22c55e : 0xef4444;
    const halfW = TILE.ISO_WIDTH / 2;
    const halfH = TILE.ISO_HEIGHT / 2;
    const { x: gx, y: gy } = ghost.position;
    const { width: w, height: h } = ghost.footprint;
    const A = gridToScreen(gx, gy);
    const B = gridToScreen(gx + w, gy);
    const C = gridToScreen(gx + w, gy + h);
    const D = gridToScreen(gx, gy + h);
    g.moveTo(A.x + halfW, A.y + halfH)
      .lineTo(B.x + halfW, B.y + halfH)
      .lineTo(C.x + halfW, C.y + halfH)
      .lineTo(D.x + halfW, D.y + halfH)
      .closePath();
    g.fill({ color, alpha: 0.28 });
    g.stroke({ color, width: 2, alpha: 0.85 });
  }

  destroy(): void {
    for (const sprite of this.buildingSprites.values()) sprite.destroy();
    for (const sprite of this.decorationSprites.values()) sprite.destroy();
    this.buildingSprites.clear();
    this.decorationSprites.clear();
    this.ghostGraphics.destroy();
    this.buzzOverlay.destroy();
    this.crowdRenderer.destroy();
    this.litterLayer.destroy();
    this.container.destroy();
  }
}

// re-export so React shell + UI both pull from the same module
export type { PlacedBuilding, PlacedDecoration } from '../../../types';
