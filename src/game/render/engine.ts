// DistrictEngine — owns the PixiJS Application and the world container.
// Imperative PixiJS v8 (architecture rule #1). React only mounts the host div.

import { Application, Container } from 'pixi.js';

export class DistrictEngine {
  readonly app = new Application();
  /** Everything in world space (street, buildings, crowd) parents here.
   *  The camera moves/scales this container; Session 2's color grade and
   *  light layer attach to it. */
  readonly world = new Container();

  private frameCb: ((deltaMS: number) => void) | null = null;
  private initialized = false;

  async init(host: HTMLElement): Promise<void> {
    await this.app.init({
      background: 0x0a0d18,
      resizeTo: host,
      antialias: true,
      preference: 'webgl',
    });
    host.appendChild(this.app.canvas);
    this.app.stage.addChild(this.world);
    this.app.ticker.add((ticker) => this.frameCb?.(ticker.deltaMS));
    this.initialized = true;
  }

  onFrame(cb: (deltaMS: number) => void): void {
    this.frameCb = cb;
  }

  destroy(): void {
    if (!this.initialized) return;
    this.frameCb = null;
    this.app.destroy(true, { children: true, texture: true });
    this.initialized = false;
  }
}
