// React shell for the Theatre District street view.
// Mounts IsoEngine + StreetView; reads street state from the store.
// Owns pointer event wiring for placement / acquisition / selection.

import { useEffect, useRef } from 'react';
import { useGameStore } from '../../store/gameStore';
import { IsoEngine } from '../render2/IsoEngine';
import { StreetView, type GhostState } from '../render2/views/StreetView';
import { screenToGrid } from '../render2/coords';
import {
  BUILDING_DEFINITIONS,
  DECORATION_DEFINITIONS,
} from '../data/street';
import type { BuildingKind, DecorationKind } from '../../types';

export function Render2Canvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<IsoEngine | null>(null);
  const viewRef = useRef<StreetView | null>(null);
  const initializedRef = useRef(false);
  const hoveredRef = useRef<{ x: number; y: number } | null>(null);

  // Per-field subscriptions — minimize re-renders.
  const bounds = useGameStore((s) => s.street.bounds);
  const plots = useGameStore((s) => s.street.plots);
  const buildings = useGameStore((s) => s.street.placedBuildings);
  const decoration = useGameStore((s) => s.street.decoration);
  const buzzField = useGameStore((s) => s.street.buzzField);
  const buzzFieldWidth = useGameStore((s) => s.street.buzzFieldWidth);
  const buzzFieldHeight = useGameStore((s) => s.street.buzzFieldHeight);
  const showBuzzOverlay = useGameStore((s) => s.ui.showBuzzOverlay);
  const selectedTile = useGameStore((s) => s.ui.selectedTile);
  const camera = useGameStore((s) => s.camera);
  const setCamera = useGameStore((s) => s.setCamera);

  // Mount engine + view once.
  useEffect(() => {
    if (!containerRef.current || initializedRef.current) return;
    initializedRef.current = true;

    const engine = new IsoEngine();
    engineRef.current = engine;
    const view = new StreetView();
    viewRef.current = view;

    engine.init(containerRef.current, {
      onCameraUpdate: (x, y, zoom) => setCamera(x, y, zoom),
      onTick: () => {
        const v = viewRef.current;
        if (!v) return;
        v.setHover(hoveredRef.current);
        v.setGhost(computeGhost(hoveredRef.current));
      },
    }).then(() => {
      if (!engine.worldContainer) return;
      engine.worldContainer.addChild(view.container);
      paintAll();
      recenterCamera();

      // Pointer wiring
      const canvas = engine.app!.canvas as HTMLCanvasElement;
      const eventToCell = (e: PointerEvent) => {
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        const cam = useGameStore.getState().camera;
        const worldX = (mouseX - cam.x) / cam.zoom;
        const worldY = (mouseY - cam.y) / cam.zoom;
        const cell = screenToGrid(worldX, worldY);
        const b = useGameStore.getState().street.bounds;
        if (cell.x >= b.minX && cell.x <= b.maxX && cell.y >= b.minY && cell.y <= b.maxY) {
          return cell;
        }
        return null;
      };

      canvas.addEventListener('pointermove', (e) => {
        hoveredRef.current = eventToCell(e);
      });
      canvas.addEventListener('pointerleave', () => {
        hoveredRef.current = null;
      });
      canvas.addEventListener('pointerup', (e) => {
        if (e.button !== 0) return;
        if (engine.camera.wasDragging) return;
        const cell = eventToCell(e);
        if (!cell) return;
        handleClick(cell);
      });
    });

    return () => {
      engine.dispose();
      engineRef.current = null;
      viewRef.current?.destroy();
      viewRef.current = null;
      initializedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-paint scene on relevant state changes.
  useEffect(() => {
    paintAll();
  }, [bounds.minX, bounds.maxX, bounds.minY, bounds.maxY, plots, buildings, decoration, selectedTile, buzzField, showBuzzOverlay]);

  // Recenter when bounds expand.
  useEffect(() => {
    recenterCamera();
  }, [bounds.minX, bounds.maxX, bounds.minY, bounds.maxY]);

  // Push camera into engine.
  useEffect(() => {
    engineRef.current?.applyCamera(camera.x, camera.y, camera.zoom);
  }, [camera]);

  function paintAll() {
    const v = viewRef.current;
    if (!v) return;
    const ownedKey = (gx: number, gy: number) => `${gx},${gy}`;
    const ownedTiles = new Set(plots.map((p) => ownedKey(p.x, p.y)));
    v.update({
      bounds,
      ownedTiles,
      buildings,
      decoration,
      hoveredTile: hoveredRef.current,
      selectedTile,
      ghost: computeGhost(hoveredRef.current),
      buzzField,
      buzzFieldWidth,
      buzzFieldHeight,
      showBuzzOverlay,
    });
  }

  function recenterCamera() {
    const eng = engineRef.current;
    if (!eng) return;
    const width = bounds.maxX - bounds.minX + 1;
    const height = bounds.maxY - bounds.minY + 1;
    eng.centerOnGrid(width, height);
  }

  return <div ref={containerRef} className="w-full h-full" style={{ touchAction: 'none' }} />;
}

// ============================================================
// Helpers — read store inside functions so we always see fresh state
// ============================================================

function computeGhost(hovered: { x: number; y: number } | null): GhostState | null {
  if (!hovered) return null;
  const s = useGameStore.getState();
  const tool = s.ui.streetTool;
  if (!tool) return null;

  // Building
  if (tool in BUILDING_DEFINITIONS) {
    const def = BUILDING_DEFINITIONS[tool as BuildingKind];
    const valid = canPlaceBuildingHere(hovered, def.footprint.width, def.footprint.height);
    return { position: hovered, footprint: def.footprint, valid };
  }

  // Decoration
  if (tool in DECORATION_DEFINITIONS) {
    const valid = canPlaceDecorationHere(hovered);
    return { position: hovered, footprint: { width: 1, height: 1 }, valid };
  }

  // Acquire mode — single tile, valid if adjacent to owned and unowned
  if (tool === 'acquire') {
    const valid = canAcquireHere(hovered);
    return { position: hovered, footprint: { width: 1, height: 1 }, valid };
  }

  return null;
}

function canPlaceBuildingHere(pos: { x: number; y: number }, w: number, h: number): boolean {
  const s = useGameStore.getState();
  const owned = new Set(s.street.plots.map((p) => `${p.x},${p.y}`));
  const occupied = new Set<string>();
  for (const b of s.street.placedBuildings) {
    const def = BUILDING_DEFINITIONS[b.kind];
    for (let dy = 0; dy < def.footprint.height; dy++) {
      for (let dx = 0; dx < def.footprint.width; dx++) {
        occupied.add(`${b.position.x + dx},${b.position.y + dy}`);
      }
    }
  }
  for (const d of s.street.decoration) occupied.add(`${d.position.x},${d.position.y}`);
  const b = s.street.bounds;
  for (let dy = 0; dy < h; dy++) {
    for (let dx = 0; dx < w; dx++) {
      const cx = pos.x + dx;
      const cy = pos.y + dy;
      if (cx < b.minX || cx > b.maxX || cy < b.minY || cy > b.maxY) return false;
      const k = `${cx},${cy}`;
      if (!owned.has(k)) return false;
      if (occupied.has(k)) return false;
    }
  }
  return true;
}

function canPlaceDecorationHere(pos: { x: number; y: number }): boolean {
  const s = useGameStore.getState();
  const k = `${pos.x},${pos.y}`;
  const owned = new Set(s.street.plots.map((p) => `${p.x},${p.y}`));
  if (!owned.has(k)) return false;
  // Decoration cannot share a tile with a building or another decoration
  for (const b of s.street.placedBuildings) {
    const def = BUILDING_DEFINITIONS[b.kind];
    for (let dy = 0; dy < def.footprint.height; dy++) {
      for (let dx = 0; dx < def.footprint.width; dx++) {
        if (b.position.x + dx === pos.x && b.position.y + dy === pos.y) return false;
      }
    }
  }
  for (const d of s.street.decoration) {
    if (d.position.x === pos.x && d.position.y === pos.y) return false;
  }
  return true;
}

function canAcquireHere(pos: { x: number; y: number }): boolean {
  const s = useGameStore.getState();
  const owned = new Set(s.street.plots.map((p) => `${p.x},${p.y}`));
  const k = `${pos.x},${pos.y}`;
  if (owned.has(k)) return false;
  // Must be adjacent (N/S/E/W) to an owned tile
  return (
    owned.has(`${pos.x - 1},${pos.y}`) ||
    owned.has(`${pos.x + 1},${pos.y}`) ||
    owned.has(`${pos.x},${pos.y - 1}`) ||
    owned.has(`${pos.x},${pos.y + 1}`)
  );
}

function handleClick(cell: { x: number; y: number }) {
  const s = useGameStore.getState();
  const tool = s.ui.streetTool;
  const day = s.time.day;

  if (tool && tool in BUILDING_DEFINITIONS) {
    s.placeBuilding(tool as BuildingKind, cell, day);
    return;
  }
  if (tool && tool in DECORATION_DEFINITIONS) {
    s.placeDecoration(tool as DecorationKind, cell, day);
    return;
  }
  if (tool === 'acquire') {
    s.acquirePlot(cell.x, cell.y, day);
    return;
  }

  // No tool: try selecting a placed entity at this cell
  const hitBuilding = s.street.placedBuildings.find((b) => {
    const def = BUILDING_DEFINITIONS[b.kind];
    return (
      cell.x >= b.position.x && cell.x < b.position.x + def.footprint.width &&
      cell.y >= b.position.y && cell.y < b.position.y + def.footprint.height
    );
  });
  if (hitBuilding) {
    s.selectStreetEntity(hitBuilding.id);
    return;
  }
  const hitDecoration = s.street.decoration.find(
    (d) => d.position.x === cell.x && d.position.y === cell.y,
  );
  if (hitDecoration) {
    s.selectStreetEntity(hitDecoration.id);
    return;
  }
  // Empty tile + no tool → select the tile (legacy behavior)
  s.selectTile(cell);
  s.selectStreetEntity(null);
}

