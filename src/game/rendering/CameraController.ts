import { CAMERA, TILE } from '../data/constants';

interface CameraState {
  x: number;
  y: number;
  zoom: number;
}

interface WorldBounds {
  width: number;
  height: number;
}

/**
 * Handles camera pan (drag + WASD) and zoom (scroll wheel).
 * Updates Zustand store via callback.
 */
export class CameraController {
  private canvas: HTMLCanvasElement | null = null;
  private state: CameraState = { x: 0, y: 0, zoom: 1 };
  private worldBounds: WorldBounds = { width: 0, height: 0 };
  private screenWidth = 0;
  private screenHeight = 0;

  // Drag state
  private isDragging = false;
  private dragStartX = 0;
  private dragStartY = 0;
  private cameraStartX = 0;
  private cameraStartY = 0;

  // Key state
  private keysDown = new Set<string>();

  // Callback to push state to Zustand
  private onUpdate: ((x: number, y: number, zoom: number) => void) | null = null;

  // Track if pointer actually moved during drag (to distinguish click from drag)
  private dragMoved = false;

  /** Whether the camera is currently being dragged (suppress click events) */
  get wasDragging(): boolean {
    return this.dragMoved;
  }

  init(
    canvas: HTMLCanvasElement,
    screenWidth: number,
    screenHeight: number,
    onUpdate: (x: number, y: number, zoom: number) => void,
  ): void {
    this.canvas = canvas;
    this.screenWidth = screenWidth;
    this.screenHeight = screenHeight;
    this.onUpdate = onUpdate;

    canvas.addEventListener('pointerdown', this.handlePointerDown);
    window.addEventListener('pointermove', this.handlePointerMove);
    window.addEventListener('pointerup', this.handlePointerUp);
    canvas.addEventListener('wheel', this.handleWheel, { passive: false, capture: false });
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
  }

  dispose(): void {
    if (this.canvas) {
      this.canvas.removeEventListener('pointerdown', this.handlePointerDown);
      this.canvas.removeEventListener('wheel', this.handleWheel);
    }
    window.removeEventListener('pointermove', this.handlePointerMove);
    window.removeEventListener('pointerup', this.handlePointerUp);
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
  }

  setWorldBounds(width: number, height: number): void {
    this.worldBounds = { width, height };
  }

  setScreenSize(width: number, height: number): void {
    this.screenWidth = width;
    this.screenHeight = height;
  }

  setState(x: number, y: number, zoom: number): void {
    this.state = { x, y, zoom };
  }

  /** Center the camera on the grid */
  centerOnGrid(gridWidth: number, gridHeight: number, isIsometric: boolean): void {
    if (isIsometric) {
      // In iso view, center the grid diamond on screen
      const centerX = this.screenWidth / 2;
      const centerY = this.screenHeight / 3; // slightly above center looks better
      this.state = { x: centerX, y: centerY, zoom: 1 };
    } else {
      // In floor plan, center the grid rectangle
      const totalW = gridWidth * TILE.FLOOR_SIZE;
      const totalH = gridHeight * TILE.FLOOR_SIZE;
      this.state = {
        x: (this.screenWidth - totalW) / 2,
        y: (this.screenHeight - totalH) / 2,
        zoom: 1,
      };
    }
    this.emitUpdate();
  }

  /** Called each frame to process WASD input */
  tick(): void {
    let dx = 0;
    let dy = 0;

    if (this.keysDown.has('w') || this.keysDown.has('arrowup')) dy += CAMERA.PAN_SPEED;
    if (this.keysDown.has('s') || this.keysDown.has('arrowdown')) dy -= CAMERA.PAN_SPEED;
    if (this.keysDown.has('a') || this.keysDown.has('arrowleft')) dx += CAMERA.PAN_SPEED;
    if (this.keysDown.has('d') || this.keysDown.has('arrowright')) dx -= CAMERA.PAN_SPEED;

    if (dx !== 0 || dy !== 0) {
      this.state.x += dx;
      this.state.y += dy;
      this.clampCamera();
      this.emitUpdate();
    }
  }

  // --- Event handlers (arrow functions to preserve `this`) ---

  private handlePointerDown = (e: PointerEvent): void => {
    if (e.button !== CAMERA.DRAG_BUTTON) return;
    this.isDragging = true;
    this.dragMoved = false;
    this.dragStartX = e.clientX;
    this.dragStartY = e.clientY;
    this.cameraStartX = this.state.x;
    this.cameraStartY = this.state.y;
  };

  private handlePointerMove = (e: PointerEvent): void => {
    if (!this.isDragging) return;

    const dx = e.clientX - this.dragStartX;
    const dy = e.clientY - this.dragStartY;

    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      this.dragMoved = true;
    }

    this.state.x = this.cameraStartX + dx;
    this.state.y = this.cameraStartY + dy;
    this.clampCamera();
    this.emitUpdate();
  };

  private handlePointerUp = (): void => {
    this.isDragging = false;
  };

  private handleWheel = (e: WheelEvent): void => {
    e.preventDefault();

    const oldZoom = this.state.zoom;

    // Trackpads send deltaMode=0 with small fractional deltas.
    // Mouse wheels send deltaMode=0 with large deltas (~100) or deltaMode=1 (line mode).
    // Normalize so both feel similar.
    let delta: number;
    if (e.deltaMode === 1) {
      // Line mode (some mice) — each tick is one line
      delta = -e.deltaY * CAMERA.ZOOM_SPEED;
    } else {
      // Pixel mode — could be trackpad (small) or mouse wheel (large ~100)
      const isTrackpad = Math.abs(e.deltaY) < 50;
      delta = isTrackpad
        ? -e.deltaY * CAMERA.ZOOM_SPEED_TRACKPAD
        : -(e.deltaY > 0 ? 1 : -1) * CAMERA.ZOOM_SPEED;
    }

    const newZoom = Math.max(CAMERA.MIN_ZOOM, Math.min(CAMERA.MAX_ZOOM, oldZoom + delta));
    if (Math.abs(newZoom - oldZoom) < 0.0001) return;

    // Zoom toward cursor position
    const rect = this.canvas!.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const worldX = (mouseX - this.state.x) / oldZoom;
    const worldY = (mouseY - this.state.y) / oldZoom;

    this.state.x = mouseX - worldX * newZoom;
    this.state.y = mouseY - worldY * newZoom;
    this.state.zoom = newZoom;

    this.clampCamera();
    this.emitUpdate();
  };

  private handleKeyDown = (e: KeyboardEvent): void => {
    // Don't capture if user is typing in an input
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
    this.keysDown.add(e.key.toLowerCase());
  };

  private handleKeyUp = (e: KeyboardEvent): void => {
    this.keysDown.delete(e.key.toLowerCase());
  };

  private clampCamera(): void {
    // Soft clamp: allow panning up to half a screen past the edges
    const margin = 200;
    const maxX = margin;
    const maxY = margin;
    const minX = -(this.worldBounds.width * this.state.zoom) + this.screenWidth - margin;
    const minY = -(this.worldBounds.height * this.state.zoom) + this.screenHeight - margin;

    this.state.x = Math.max(minX, Math.min(maxX, this.state.x));
    this.state.y = Math.max(minY, Math.min(maxY, this.state.y));
  }

  private emitUpdate(): void {
    this.onUpdate?.(this.state.x, this.state.y, this.state.zoom);
  }
}
