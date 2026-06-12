// React mount point for the PixiJS world. React's only jobs here: own the
// host div lifecycle, wire the runtime/camera/view together, and react to
// coarse store changes (era). Everything visual is imperative PixiJS.

import { useEffect, useRef } from 'react';
import { DistrictEngine } from './engine';
import { StreetCamera } from './camera';
import { DebugStreetView } from './DebugStreetView';
import { runtime } from '../sim/runtime';
import { useTDStore } from '../../store/store';
import { CAMERA, STREET } from '../config/balance';
import { columnsForEra } from '../street/topology';
import { gridBounds, gridToWorld } from './iso';

export function DistrictCanvas() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const engine = new DistrictEngine();
    let camera: StreetCamera | null = null;
    let view: DebugStreetView | null = null;
    let unsubEra: (() => void) | null = null;
    let cancelled = false;

    const onVisibility = () => runtime.clock.setSuspended(document.hidden);

    engine.init(host).then(() => {
      if (cancelled) {
        engine.destroy();
        return;
      }

      view = new DebugStreetView();
      engine.world.addChild(view.container);

      camera = new StreetCamera(engine.world, engine.app.canvas);

      const fitToEra = (era: number) => {
        const cols = columnsForEra(era);
        view!.draw(era);
        camera!.setBounds(gridBounds(cols, STREET.TOTAL_ROWS, CAMERA.BOUNDS_PADDING));
        const center = gridToWorld(Math.floor(cols / 2), Math.floor(STREET.TOTAL_ROWS / 2));
        camera!.centerOn(center.wx, center.wy);
      };

      fitToEra(useTDStore.getState().street.era);
      unsubEra = useTDStore.subscribe((s, prev) => {
        if (s.street.era !== prev.street.era) fitToEra(s.street.era);
      });

      engine.onFrame((deltaMS) => {
        runtime.frame(deltaMS);
        camera!.update();
      });

      document.addEventListener('visibilitychange', onVisibility);
      onVisibility();
    });

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisibility);
      unsubEra?.();
      camera?.destroy();
      engine.destroy();
    };
  }, []);

  return <div ref={hostRef} className="absolute inset-0" />;
}
