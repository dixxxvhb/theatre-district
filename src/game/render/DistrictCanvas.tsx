// React mount point for the PixiJS world. React owns the host div and coarse
// store subscriptions; everything visual and pointer-level is imperative.
//
// Stage layout: sky (screen-space) → world (camera root: graded street +
// additive light layer + overlay/ghost) → grain (screen-space).

import { useEffect, useRef } from 'react';
import { DistrictEngine } from './engine';
import { StreetCamera } from './camera';
import { StreetScene } from './StreetScene';
import { StreetInteraction } from './interaction';
import { runtime } from '../sim/runtime';
import { useTDStore } from '../../store/store';
import { CAMERA, STREET, TIME } from '../config/balance';
import { columnsForEra } from '../street/topology';
import { gridBounds, gridToWorld } from './iso';
import { Baker } from './kit/bake';
import { bakeTextureKit } from './kit/textures';
import { gradeAt } from './kit/palette';
import { Grain, Sky } from './kit/atmosphere';
import { getBuzzField } from '../sim/buzzCache';

export function DistrictCanvas({ onHoverBuzz }: { onHoverBuzz?: (label: string | null) => void }) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const engine = new DistrictEngine();
    let camera: StreetCamera | null = null;
    let interaction: StreetInteraction | null = null;
    let baker: Baker | null = null;
    let unsub: (() => void) | null = null;
    let cancelled = false;
    let lastBuzzLabel: string | null = null;

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
      engine.world.addChild(scene.dim, scene.lights, scene.overlay);
      engine.app.stage.addChild(grain.sprite);

      camera = new StreetCamera(engine.world, engine.app.canvas);
      interaction = new StreetInteraction(engine.app.canvas, scene, (sx, sy) => {
        const p = engine.world.toLocal({ x: sx, y: sy });
        return { wx: p.x, wy: p.y };
      });

      const fitToEra = (era: number) => {
        const cols = columnsForEra(era);
        camera!.setBounds(gridBounds(cols, STREET.TOTAL_ROWS, CAMERA.BOUNDS_PADDING));
        const center = gridToWorld(Math.floor(cols / 2), 4);
        camera!.setZoom(1.25);
        camera!.centerOn(center.wx, center.wy);
      };

      const syncAll = () => {
        const s = useTDStore.getState();
        scene.sync(s.street, s.upkeep);
        scene.setOverlay(s.settings.buzzOverlay, s.street, s.upkeep);
        interaction!.refreshGhost();
      };

      syncAll();
      fitToEra(useTDStore.getState().street.era);
      unsub = useTDStore.subscribe((s, prev) => {
        if (s.street.era !== prev.street.era) fitToEra(s.street.era);
        if (
          s.street !== prev.street ||
          s.upkeep !== prev.upkeep ||
          s.settings.buzzOverlay !== prev.settings.buzzOverlay ||
          s.ui.tool !== prev.ui.tool ||
          s.ui.stringAnchor !== prev.ui.stringAnchor
        ) {
          syncAll();
        }
      });

      engine.onFrame((deltaMS) => {
        runtime.frame(deltaMS);
        camera!.update();

        const s = useTDStore.getState();
        const t = s.time.tickOfDay / TIME.TICKS_PER_DAY;
        const grade = gradeAt(t);
        const { width, height } = engine.app.screen;
        scene.update(grade, deltaMS);
        sky.update(grade, width, height);
        grain.update(deltaMS, width, height);

        // Buzz readout under the cursor when the overlay is on.
        if (onHoverBuzz) {
          let label: string | null = null;
          if (s.settings.buzzOverlay) {
            const hover = interaction!.getHover();
            if (hover.inBounds) {
              const { field, cols } = getBuzzField(s.street, s.upkeep);
              label = (field[hover.y * cols + hover.x] ?? 0).toFixed(1);
            }
          }
          if (label !== lastBuzzLabel) {
            lastBuzzLabel = label;
            onHoverBuzz(label);
          }
        }
      });

      document.addEventListener('visibilitychange', onVisibility);
      onVisibility();
    });

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisibility);
      unsub?.();
      interaction?.destroy();
      camera?.destroy();
      engine.destroy();
      baker?.destroy();
    };
    // onHoverBuzz is stable (useCallback in App).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={hostRef} className="absolute inset-0" />;
}
