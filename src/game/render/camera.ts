// Street camera — pan (drag / WASD), zoom (wheel, cursor-anchored), with
// world bounds so the player can't lose the street. Adapted from the legacy
// CameraController, slimmed for the strip world.

import type { Container } from 'pixi.js';
import { CAMERA } from '../config/balance';

export interface CameraBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export class StreetCamera {
  private zoom = 1;
  private cx = 0; // world-space point at viewport center
  private cy = 0;
  private bounds: CameraBounds = { minX: -1e9, maxX: 1e9, minY: -1e9, maxY: 1e9 };

  private dragging = false;
  private lastPointer = { x: 0, y: 0 };
  private keys = new Set<string>();
  private detachFns: Array<() => void> = [];

  constructor(
    private world: Container,
    private viewport: HTMLCanvasElement,
  ) {
    this.attach();
  }

  setBounds(bounds: CameraBounds): void {
    this.bounds = bounds;
    this.clamp();
    this.apply();
  }

  centerOn(wx: number, wy: number): void {
    this.cx = wx;
    this.cy = wy;
    this.clamp();
    this.apply();
  }

  /** Per-frame: WASD pan. */
  update(): void {
    if (this.keys.size === 0) return;
    const speed = CAMERA.PAN_KEY_SPEED / this.zoom;
    if (this.keys.has('w')) this.cy -= speed;
    if (this.keys.has('s')) this.cy += speed;
    if (this.keys.has('a')) this.cx -= speed;
    if (this.keys.has('d')) this.cx += speed;
    this.clamp();
    this.apply();
  }

  destroy(): void {
    this.detachFns.forEach((fn) => fn());
    this.detachFns = [];
  }

  // --- internals ---

  private attach(): void {
    const el = this.viewport;

    const onDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      this.dragging = true;
      this.lastPointer = { x: e.clientX, y: e.clientY };
    };
    const onMove = (e: PointerEvent) => {
      if (!this.dragging) return;
      this.cx -= (e.clientX - this.lastPointer.x) / this.zoom;
      this.cy -= (e.clientY - this.lastPointer.y) / this.zoom;
      this.lastPointer = { x: e.clientX, y: e.clientY };
      this.clamp();
      this.apply();
    };
    const onUp = () => {
      this.dragging = false;
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const factor = Math.exp(-e.deltaY * CAMERA.ZOOM_WHEEL_SPEED);
      const next = Math.min(Math.max(this.zoom * factor, CAMERA.MIN_ZOOM), CAMERA.MAX_ZOOM);

      // Keep the world point under the cursor fixed while zooming.
      const rect = el.getBoundingClientRect();
      const sx = e.clientX - rect.left - rect.width / 2;
      const sy = e.clientY - rect.top - rect.height / 2;
      this.cx += sx / this.zoom - sx / next;
      this.cy += sy / this.zoom - sy / next;

      this.zoom = next;
      this.clamp();
      this.apply();
    };
    const onKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (['w', 'a', 's', 'd'].includes(k)) this.keys.add(k);
    };
    const onKeyUp = (e: KeyboardEvent) => this.keys.delete(e.key.toLowerCase());

    el.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    el.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    this.detachFns.push(
      () => el.removeEventListener('pointerdown', onDown),
      () => window.removeEventListener('pointermove', onMove),
      () => window.removeEventListener('pointerup', onUp),
      () => el.removeEventListener('wheel', onWheel),
      () => window.removeEventListener('keydown', onKeyDown),
      () => window.removeEventListener('keyup', onKeyUp),
    );
  }

  private clamp(): void {
    this.cx = Math.min(Math.max(this.cx, this.bounds.minX), this.bounds.maxX);
    this.cy = Math.min(Math.max(this.cy, this.bounds.minY), this.bounds.maxY);
  }

  private apply(): void {
    const w = this.viewport.clientWidth;
    const h = this.viewport.clientHeight;
    this.world.scale.set(this.zoom);
    this.world.position.set(w / 2 - this.cx * this.zoom, h / 2 - this.cy * this.zoom);
  }
}
