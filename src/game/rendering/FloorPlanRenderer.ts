import { Container, Graphics } from 'pixi.js';
import { TILE, ROOM_COLORS } from '../data/constants';
import type { GridState, Position, Room } from '../../types';

/**
 * Renders the top-down floor plan grid with 32x32px cells.
 * Handles grid lines, cell coloring by room type, hover highlight, selection,
 * and construction hatching overlays.
 */
export class FloorPlanRenderer {
  private container: Container;
  private gridGraphics: Graphics;
  private cellGraphics: Graphics;
  private hoverGraphics: Graphics;
  private selectionGraphics: Graphics;
  private constructionGraphics: Graphics;

  private gridState: GridState | null = null;
  private hoveredCell: Position | null = null;
  private selectedCell: Position | null = null;
  private constructingRooms: Room[] = [];

  private onCellClick: ((x: number, y: number) => void) | null = null;
  private onCellHover: ((x: number, y: number) => void) | null = null;

  constructor() {
    this.container = new Container();
    this.container.label = 'FloorPlanRenderer';

    this.cellGraphics = new Graphics();
    this.cellGraphics.label = 'cells';

    this.gridGraphics = new Graphics();
    this.gridGraphics.label = 'gridLines';

    this.constructionGraphics = new Graphics();
    this.constructionGraphics.label = 'construction';

    this.hoverGraphics = new Graphics();
    this.hoverGraphics.label = 'hover';

    this.selectionGraphics = new Graphics();
    this.selectionGraphics.label = 'selection';

    this.container.addChild(this.cellGraphics);
    this.container.addChild(this.gridGraphics);
    this.container.addChild(this.constructionGraphics);
    this.container.addChild(this.selectionGraphics);
    this.container.addChild(this.hoverGraphics);

    this.container.eventMode = 'static';
    this.container.on('pointermove', this.handlePointerMove.bind(this));
    this.container.on('pointerdown', this.handlePointerDown.bind(this));
  }

  getContainer(): Container {
    return this.container;
  }

  setCallbacks(
    onCellClick: (x: number, y: number) => void,
    onCellHover: (x: number, y: number) => void,
  ): void {
    this.onCellClick = onCellClick;
    this.onCellHover = onCellHover;
  }

  /** Update with new grid data */
  update(grid: GridState, selectedTile: Position | null, constructingRooms?: Room[]): void {
    this.gridState = grid;
    this.selectedCell = selectedTile;
    this.constructingRooms = constructingRooms ?? [];
    this.drawCells();
    this.drawGridLines();
    this.drawConstructionOverlay();
    this.drawSelection();
  }

  /** Set camera transform on the container */
  setTransform(cameraX: number, cameraY: number, zoom: number): void {
    this.container.x = cameraX;
    this.container.y = cameraY;
    this.container.scale.set(zoom);
  }

  /** Get the hit area bounds for interaction */
  getWorldBounds(): { width: number; height: number } {
    if (!this.gridState) return { width: 0, height: 0 };
    return {
      width: this.gridState.width * TILE.FLOOR_SIZE,
      height: this.gridState.height * TILE.FLOOR_SIZE,
    };
  }

  private drawCells(): void {
    const g = this.cellGraphics;
    g.clear();

    if (!this.gridState) return;
    const { width, height, cells } = this.gridState;
    const s = TILE.FLOOR_SIZE;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const cell = cells[y * width + x];
        const colorKey = cell.type === 'room' && cell.roomType
          ? cell.roomType
          : cell.type === 'empty'
            ? 'empty'
            : cell.type;
        const color = ROOM_COLORS[colorKey] ?? ROOM_COLORS.empty;

        g.rect(x * s, y * s, s, s);
        g.fill(color);
      }
    }
  }

  private drawGridLines(): void {
    const g = this.gridGraphics;
    g.clear();

    if (!this.gridState) return;
    const { width, height } = this.gridState;
    const s = TILE.FLOOR_SIZE;
    const totalW = width * s;
    const totalH = height * s;

    g.setStrokeStyle({ width: TILE.GRID_LINE_WIDTH, color: TILE.GRID_LINE_COLOR });

    for (let x = 0; x <= width; x++) {
      g.moveTo(x * s, 0);
      g.lineTo(x * s, totalH);
    }
    for (let y = 0; y <= height; y++) {
      g.moveTo(0, y * s);
      g.lineTo(totalW, y * s);
    }
    g.stroke();
  }

  private drawConstructionOverlay(): void {
    const g = this.constructionGraphics;
    g.clear();

    if (!this.gridState || this.constructingRooms.length === 0) return;
    const s = TILE.FLOOR_SIZE;

    for (const room of this.constructingRooms) {
      if (!room.isConstructing) continue;
      const { x, y } = room.position;
      const { width: rw, height: rh } = room.size;

      // Draw diagonal hatching lines across the room rectangle
      const px = x * s;
      const py = y * s;
      const pw = rw * s;
      const ph = rh * s;

      g.setStrokeStyle({ width: 1, color: 0xffffff, alpha: 0.15 });

      const step = 8;
      for (let i = -ph; i < pw; i += step) {
        const x1 = Math.max(0, i);
        const y1 = Math.max(0, -i);
        const x2 = Math.min(pw, i + ph);
        const y2 = Math.min(ph, ph - (i + ph - x2));
        g.moveTo(px + x1, py + y1);
        g.lineTo(px + x2, py + y2);
      }
      g.stroke();
    }
  }

  private drawHover(): void {
    const g = this.hoverGraphics;
    g.clear();

    if (!this.hoveredCell || !this.gridState) return;
    const { x, y } = this.hoveredCell;
    if (x < 0 || x >= this.gridState.width || y < 0 || y >= this.gridState.height) return;

    const s = TILE.FLOOR_SIZE;
    g.rect(x * s, y * s, s, s);
    g.fill({ color: TILE.HOVER_COLOR, alpha: TILE.HOVER_ALPHA });
  }

  private drawSelection(): void {
    const g = this.selectionGraphics;
    g.clear();

    if (!this.selectedCell || !this.gridState) return;
    const { x, y } = this.selectedCell;
    if (x < 0 || x >= this.gridState.width || y < 0 || y >= this.gridState.height) return;

    const s = TILE.FLOOR_SIZE;
    g.rect(x * s, y * s, s, s);
    g.fill({ color: TILE.SELECTED_COLOR, alpha: TILE.SELECTED_ALPHA });
    g.setStrokeStyle({ width: 2, color: TILE.SELECTED_COLOR });
    g.rect(x * s, y * s, s, s);
    g.stroke();
  }

  private screenToCell(globalX: number, globalY: number): Position | null {
    if (!this.gridState) return null;

    const local = this.container.toLocal({ x: globalX, y: globalY });
    const cx = Math.floor(local.x / TILE.FLOOR_SIZE);
    const cy = Math.floor(local.y / TILE.FLOOR_SIZE);

    if (cx < 0 || cx >= this.gridState.width || cy < 0 || cy >= this.gridState.height) {
      return null;
    }
    return { x: cx, y: cy };
  }

  private handlePointerMove(e: { globalX: number; globalY: number }): void {
    const cell = this.screenToCell(e.globalX, e.globalY);
    if (
      cell &&
      (!this.hoveredCell || cell.x !== this.hoveredCell.x || cell.y !== this.hoveredCell.y)
    ) {
      this.hoveredCell = cell;
      this.drawHover();
      this.onCellHover?.(cell.x, cell.y);
    } else if (!cell && this.hoveredCell) {
      this.hoveredCell = null;
      this.drawHover();
    }
  }

  private handlePointerDown(e: { globalX: number; globalY: number; button: number }): void {
    if (e.button !== 0) return;
    const cell = this.screenToCell(e.globalX, e.globalY);
    if (cell) {
      this.onCellClick?.(cell.x, cell.y);
    }
  }

  destroy(): void {
    this.container.destroy({ children: true });
  }
}
