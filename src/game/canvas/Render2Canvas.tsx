// React shell for the Theatre District street view.
// Mounts IsoEngine + TileLayer.
//
// SALVAGE STUB: this file currently renders a static placeholder grid with no
// store coupling — just enough to confirm the iso primitives work end-to-end.
// Session 1 wires real StreetState (bounds, plots, placed buildings) here.

import { useEffect, useRef } from 'react';
import { useGameStore } from '../../store/gameStore';
import { IsoEngine } from '../render2/IsoEngine';
import { TileLayer } from '../render2/tiles/TileLayer';

// Placeholder bounds — replaced by street.bounds from store in Session 1.
const PLACEHOLDER_BOUNDS = { minX: 0, maxX: 7, minY: 0, maxY: 3 };
const ALL_OWNED = () => true;

export function Render2Canvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<IsoEngine | null>(null);
  const tileLayerRef = useRef<TileLayer | null>(null);
  const initializedRef = useRef(false);
  const camera = useGameStore((s) => s.camera);
  const setCamera = useGameStore((s) => s.setCamera);

  useEffect(() => {
    if (!containerRef.current || initializedRef.current) return;
    initializedRef.current = true;

    const engine = new IsoEngine();
    engineRef.current = engine;
    const tileLayer = new TileLayer();
    tileLayerRef.current = tileLayer;

    engine.init(containerRef.current, {
      onCameraUpdate: (x, y, zoom) => setCamera(x, y, zoom),
      onTick: () => {},
    }).then(() => {
      if (!engine.worldContainer) return;
      engine.worldContainer.addChild(tileLayer.container);
      tileLayer.drawGround(PLACEHOLDER_BOUNDS, ALL_OWNED);
      const width = PLACEHOLDER_BOUNDS.maxX - PLACEHOLDER_BOUNDS.minX + 1;
      const height = PLACEHOLDER_BOUNDS.maxY - PLACEHOLDER_BOUNDS.minY + 1;
      engine.centerOnGrid(width, height);
    });

    return () => {
      engine.dispose();
      engineRef.current = null;
      tileLayerRef.current = null;
      initializedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    engineRef.current?.applyCamera(camera.x, camera.y, camera.zoom);
  }, [camera]);

  return <div ref={containerRef} className="w-full h-full" style={{ touchAction: 'none' }} />;
}
