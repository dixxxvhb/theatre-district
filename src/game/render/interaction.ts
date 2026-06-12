// Pointer interaction for the street: ghost preview, click-to-place
// (shift-click keeps placing — RCT style), demolish, selection, cancel.
// Reads the store's transient UI slice; placement authority stays in the
// store actions (this layer only previews and forwards).

import type { StreetScene, GhostSpec } from './StreetScene';
import { worldToGrid } from './iso';
import { useTDStore } from '../../store/store';
import { STREET } from '../config/balance';
import {
  canPlaceBuilding,
  canPlaceDecoration,
  canPlaceStringLights,
  findObjectAt,
} from '../street/placement';
import { columnsForEra, lotSide, tileKind } from '../street/topology';

export interface HoverInfo {
  x: number;
  y: number;
  inBounds: boolean;
}

export class StreetInteraction {
  private hover: HoverInfo = { x: 0, y: 0, inBounds: false };
  private detach: Array<() => void> = [];
  /** Suppresses click-after-drag (camera pan ends with a click event). */
  private downAt = { x: 0, y: 0 };

  constructor(
    private canvas: HTMLCanvasElement,
    private scene: StreetScene,
    /** Screen→world via the camera-root container. */
    private toWorld: (sx: number, sy: number) => { wx: number; wy: number },
  ) {
    const onMove = (e: PointerEvent) => {
      this.updateHover(e);
      this.refreshGhost();
    };
    const onDown = (e: PointerEvent) => {
      this.downAt = { x: e.clientX, y: e.clientY };
    };
    const onUp = (e: PointerEvent) => {
      if (e.button === 2) {
        useTDStore.getState().setTool(null);
        this.refreshGhost();
        return;
      }
      if (e.button !== 0) return;
      const dragged = Math.hypot(e.clientX - this.downAt.x, e.clientY - this.downAt.y) > 6;
      if (dragged) return;
      this.updateHover(e);
      this.click(e.shiftKey);
    };
    const onContext = (e: Event) => e.preventDefault();

    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('contextmenu', onContext);
    this.detach.push(
      () => canvas.removeEventListener('pointermove', onMove),
      () => canvas.removeEventListener('pointerdown', onDown),
      () => canvas.removeEventListener('pointerup', onUp),
      () => canvas.removeEventListener('contextmenu', onContext),
    );
  }

  destroy(): void {
    this.detach.forEach((fn) => fn());
    this.detach = [];
  }

  getHover(): HoverInfo {
    return this.hover;
  }

  /** Re-evaluate the ghost (call after tool/store changes too). */
  refreshGhost(): void {
    const s = useTDStore.getState();
    const tool = s.ui.tool;
    if (!tool || !this.hover.inBounds) {
      this.scene.showGhost(null);
      return;
    }
    const { x, y } = this.hover;

    let spec: GhostSpec | null = null;
    if (tool.type === 'building') {
      // Snap to the lot side the cursor is on (or nearest).
      const side = y <= 4 ? 'north' : 'south';
      const valid = canPlaceBuilding(s.street, tool.kind, x, side).ok && s.economy.cash >= 0;
      spec = { kind: 'building', buildingKind: tool.kind, x, y, side, valid };
    } else if (tool.type === 'decoration' && tool.kind === 'string_lights') {
      const anchor = s.ui.stringAnchor;
      if (anchor) {
        const valid = anchor.y === y && canPlaceStringLights(s.street, anchor.x, x, y).ok;
        spec = { kind: 'stringPreview', x, y: anchor.y, spanFromX: anchor.x, valid };
      } else {
        const valid = canPlaceDecoration(s.street, tool.kind, x, y).ok;
        spec = { kind: 'decoration', decorationKind: tool.kind, x, y, valid };
      }
    } else if (tool.type === 'decoration') {
      const valid = canPlaceDecoration(s.street, tool.kind, x, y).ok;
      spec = { kind: 'decoration', decorationKind: tool.kind, x, y, valid };
    } else if (tool.type === 'demolish') {
      spec = { kind: 'demolish', x, y, valid: findObjectAt(s.street, x, y) !== null };
    }
    this.scene.showGhost(spec);
  }

  // --- internals -----------------------------------------------------------------

  private updateHover(e: PointerEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const { wx, wy } = this.toWorld(e.clientX - rect.left, e.clientY - rect.top);
    const { gx, gy } = worldToGrid(wx, wy);
    const x = Math.round(gx);
    const y = Math.round(gy);
    const s = useTDStore.getState();
    const inBounds = x >= 0 && x < columnsForEra(s.street.era) && y >= 0 && y < STREET.TOTAL_ROWS;
    this.hover = { x, y, inBounds };
  }

  private click(shift: boolean): void {
    const s = useTDStore.getState();
    const tool = s.ui.tool;
    const { x, y, inBounds } = this.hover;
    if (!inBounds) return;

    if (!tool) {
      const hit = findObjectAt(s.street, x, y);
      s.select(hit?.id ?? null);
      return;
    }

    if (tool.type === 'building') {
      const side = y <= 4 ? 'north' : 'south';
      if (s.placeBuilding(tool.kind, x, side) && !shift) s.setTool(null);
    } else if (tool.type === 'decoration' && tool.kind === 'string_lights') {
      const anchor = s.ui.stringAnchor;
      if (!anchor) {
        if (canPlaceDecoration(s.street, 'string_lights', x, y).ok) s.setStringAnchor({ x, y });
      } else if (anchor.y === y && s.placeDecoration('string_lights', anchor.x, y, x)) {
        s.setStringAnchor(null);
        if (!shift) s.setTool(null);
      }
    } else if (tool.type === 'decoration') {
      if (s.placeDecoration(tool.kind, x, y) && !shift) s.setTool(null);
    } else if (tool.type === 'demolish') {
      const hit = findObjectAt(s.street, x, y);
      if (!hit) return;
      if (hit.type === 'decoration') {
        s.demolish(hit.id); // decoration: no confirm (spec)
      } else {
        s.select(hit.id); // buildings confirm via the selection card
      }
    }
    this.refreshGhost();
  }
}

// Re-exported so the canvas can place the readout chip near hovered tiles.
export { lotSide, tileKind };
