// React shell for the Theatre District street view.
// Mounts IsoEngine + TileLayer; reads street state from the store.
//
// Session 1 scope: render the iso ground plane — sidewalk on owned plots,
// dirt on unowned. Hover overlay on whichever tile the cursor is over.
// Camera pan/zoom via the inherited CameraController.
//
// Sessions 2+ layer placement, building sprites, decoration, crowd, buzz overlay.

import { useEffect, useRef } from 'react';
import { useGameStore } from '../../store/gameStore';
import { IsoEngine } from '../render2/IsoEngine';
import { TileLayer } from '../render2/tiles/TileLayer';
import { screenToGrid } from '../render2/coords';

export function Render2Canvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<IsoEngine | null>(null);
  const tileLayerRef = useRef<TileLayer | null>(null);
  const initializedRef = useRef(false);
  const hoveredRef = useRef<{ x: number; y: number } | null>(null);

  // Per-field subscriptions — minimize re-renders. Bounds + plots drive ground redraw;
  // camera-state already flows through engine.applyCamera.
  const bounds = useGameStore((s) => s.street.bounds);
  const plots = useGameStore((s) => s.street.plots);
  const camera = useGameStore((s) => s.camera);
  const setCamera = useGameStore((s) => s.setCamera);

  // Mount engine + tile layer once.
  useEffect(() => {
    if (!containerRef.current || initializedRef.current) return;
    initializedRef.current = true;

    const engine = new IsoEngine();
    engineRef.current = engine;
    const tileLayer = new TileLayer();
    tileLayerRef.current = tileLayer;

    engine.init(containerRef.current, {
      onCameraUpdate: (x, y, zoom) => setCamera(x, y, zoom),
      onTick: () => {
        tileLayerRef.current?.drawHover(
          hoveredRef.current?.x ?? null,
          hoveredRef.current?.y ?? null,
        );
      },
    }).then(() => {
      if (!engine.worldContainer) return;
      engine.worldContainer.addChild(tileLayer.container);

      // Initial paint — useEffect below will re-paint if state changes during init promise.
      paintGround();
      recenterCamera();

      // Pointer hover tracking — convert canvas coords through current camera state.
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
    });

    return () => {
      engine.dispose();
      engineRef.current = null;
      tileLayerRef.current = null;
      initializedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Redraw ground + recenter when bounds or owned plots change (plot acquisition).
  useEffect(() => {
    paintGround();
    recenterCamera();
  }, [bounds.minX, bounds.maxX, bounds.minY, bounds.maxY, plots]);

  // Push camera into engine.
  useEffect(() => {
    engineRef.current?.applyCamera(camera.x, camera.y, camera.zoom);
  }, [camera]);

  function paintGround() {
    const tl = tileLayerRef.current;
    if (!tl) return;
    const ownedKey = (gx: number, gy: number) => `${gx},${gy}`;
    const ownedSet = new Set(plots.map((p) => ownedKey(p.x, p.y)));
    tl.drawGround(bounds, (gx, gy) => ownedSet.has(ownedKey(gx, gy)));
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
