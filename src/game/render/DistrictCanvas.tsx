// React mount point for the PixiJS world. React's only jobs here: own the
// host div lifecycle, wire runtime/camera/scene together, and forward coarse
// store changes (era, placements). Everything visual is imperative PixiJS.
//
// Stage layout: sky (screen-space) → world (camera root: graded street +
// additive light layer) → grain (screen-space).

import { useEffect, useRef } from 'react';
import { DistrictEngine } from './engine';
import { StreetCamera } from './camera';
import { StreetScene } from './StreetScene';
import { runtime } from '../sim/runtime';
import { useTDStore } from '../../store/store';
import { CAMERA, STREET, TIME } from '../config/balance';
import { columnsForEra } from '../street/topology';
import { gridBounds, gridToWorld } from './iso';
import { Baker } from './kit/bake';
import { bakeTextureKit } from './kit/textures';
import { gradeAt } from './kit/palette';
import { Grain, Sky } from './kit/atmosphere';

export function DistrictCanvas() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const engine = new DistrictEngine();
    let camera: StreetCamera | null = null;
    let baker: Baker | null = null;
    let unsub: (() => void) | null = null;
    let cancelled = false;

    const onVisibility = () => runtime.clock.setSuspended(document.hidden);

    engine.init(host).then(() => {
      if (cancelled) {
        engine.destroy();
        return;
      }

      baker = new Baker(engine.app.renderer);
      const kit = bakeTextureKit(baker);
      const scene = new StreetScene(baker, kit);
      const sky = new Sky(kit);
      const grain = new Grain(kit);

      engine.app.stage.addChildAt(sky.container, 0);
      engine.world.addChild(scene.dim, scene.lights);
      engine.app.stage.addChild(grain.sprite);

      camera = new StreetCamera(engine.world, engine.app.canvas);

      const fitToEra = (era: number) => {
        const cols = columnsForEra(era);
        camera!.setBounds(gridBounds(cols, STREET.TOTAL_ROWS, CAMERA.BOUNDS_PADDING));
        // Frame the road, not the geometric strip center.
        const center = gridToWorld(Math.floor(cols / 2), 4);
        camera!.setZoom(1.25);
        camera!.centerOn(center.wx, center.wy);
      };

      const syncScene = () => {
        const s = useTDStore.getState();
        scene.sync(s.street.era, s.street.buildings);
      };

      syncScene();
      fitToEra(useTDStore.getState().street.era);
      unsub = useTDStore.subscribe((s, prev) => {
        if (s.street.era !== prev.street.era) {
          syncScene();
          fitToEra(s.street.era);
        } else if (s.street.buildings !== prev.street.buildings) {
          syncScene();
        }
      });

      engine.onFrame((deltaMS) => {
        runtime.frame(deltaMS);
        camera!.update();

        const t = useTDStore.getState().time.tickOfDay / TIME.TICKS_PER_DAY;
        const grade = gradeAt(t);
        const { width, height } = engine.app.screen;
        scene.update(grade, deltaMS);
        sky.update(grade, width, height);
        grain.update(deltaMS, width, height);
      });

      document.addEventListener('visibilitychange', onVisibility);
      onVisibility();
    });

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisibility);
      unsub?.();
      camera?.destroy();
      engine.destroy();
      baker?.destroy();
    };
  }, []);

  return <div ref={hostRef} className="absolute inset-0" />;
}
