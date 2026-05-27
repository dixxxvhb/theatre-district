// Render2 engine: owns the PixiJS Application, root containers, and ticker.
// Build/Exterior views attach their containers to `worldContainer`.

import { Application, Container, Graphics } from 'pixi.js';
import { CameraController } from '../rendering/CameraController';
import { TILE } from '../data/constants';

export interface IsoEngineCallbacks {
  /** Push camera state to Zustand */
  onCameraUpdate: (x: number, y: number, zoom: number) => void;
  /** Per-frame game loop */
  onTick: (deltaMS: number) => void;
}

/**
 * IsoEngine — render2's root. Mirrors the responsibilities GameCanvas.tsx
 * has for the legacy renderer, but in a class so React doesn't see Pixi internals.
 */
export class IsoEngine {
  app: Application | null = null;
  stage: Container | null = null;
  worldContainer: Container | null = null;
  background: Graphics | null = null;
  camera = new CameraController();

  private resizeObserver: ResizeObserver | null = null;

  async init(div: HTMLDivElement, callbacks: IsoEngineCallbacks): Promise<void> {
    const width = div.clientWidth;
    const height = div.clientHeight;

    this.app = new Application();
    await this.app.init({
      width,
      height,
      background: 0x0f0f1a,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    });
    div.appendChild(this.app.canvas);
    this.stage = this.app.stage;

    // Background
    this.background = new Graphics();
    this.background.rect(0, 0, width, height);
    this.background.fill(0x0f0f1a);
    this.stage.addChild(this.background);

    // World container — camera transform applies here, all view sprites hang off this
    this.worldContainer = new Container();
    this.worldContainer.label = 'render2-world';
    this.worldContainer.sortableChildren = true;
    this.stage.addChild(this.worldContainer);

    // Camera
    this.camera.init(this.app.canvas as HTMLCanvasElement, width, height, callbacks.onCameraUpdate);

    // Ticker
    this.app.ticker.add((ticker) => {
      this.camera.tick();
      callbacks.onTick(ticker.deltaMS);
    });

    // Resize
    this.resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry || !this.app) return;
      const { width: w, height: h } = entry.contentRect;
      this.app.renderer.resize(w, h);
      this.camera.setScreenSize(w, h);
      if (this.background) {
        this.background.clear();
        this.background.rect(0, 0, w, h);
        this.background.fill(0x0f0f1a);
      }
    });
    this.resizeObserver.observe(div);
  }

  /** Set world bounds + center on grid for the iso projection. */
  centerOnGrid(gridWidth: number, gridHeight: number): void {
    if (!this.app) return;
    // Iso world spans (w+h) tiles wide and (w+h)/2 tall. Padding for tall sprites.
    const SPRITE_HEAD_ROOM_PX = 200;
    const worldW = (gridWidth + gridHeight) * (TILE.ISO_WIDTH / 2);
    const worldH = (gridWidth + gridHeight) * (TILE.ISO_HEIGHT / 2) + SPRITE_HEAD_ROOM_PX;
    this.camera.setWorldBounds(worldW, worldH);
    this.camera.centerOnGrid(gridWidth, gridHeight, true);
  }

  /** Apply camera state to the world container. Called when store camera changes. */
  applyCamera(x: number, y: number, zoom: number): void {
    if (!this.worldContainer) return;
    this.worldContainer.x = x;
    this.worldContainer.y = y;
    this.worldContainer.scale.set(zoom);
  }

  /** Replace the background fill color (used to tint the canvas per daily phase). */
  setBackgroundColor(color: number): void {
    if (!this.app || !this.background) return;
    const w = this.app.canvas.width / (window.devicePixelRatio || 1);
    const h = this.app.canvas.height / (window.devicePixelRatio || 1);
    this.background.clear();
    this.background.rect(0, 0, w, h);
    this.background.fill(color);
  }

  dispose(): void {
    this.camera.dispose();
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    if (this.app) {
      this.app.destroy(true);
      this.app = null;
    }
    this.stage = null;
    this.worldContainer = null;
    this.background = null;
  }
}
