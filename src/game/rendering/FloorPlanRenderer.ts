import { Container, Graphics, Rectangle, Text, TextStyle } from 'pixi.js';
import { TILE, ROOM_COLORS } from '../data/constants';
import type { GridState, Position, Room, RoomType } from '../../types';

/** Abbreviated labels for room types, shown centered in rooms */
const ROOM_LABELS: Record<RoomType, string> = {
  stage: 'STG',
  seating: 'SEAT',
  lobby: 'LBBY',
  backstage: 'BKST',
  box_office: 'BOX',
  dressing_room: 'DRSS',
  orchestra_pit: 'ORCH',
  rehearsal_hall: 'RHSL',
  vip_lounge: 'VIP',
  concession: 'CNCN',
  storage: 'STOR',
  office: 'OFFC',
  tech_booth: 'TECH',
  green_room: 'GRN',
  restrooms: 'REST',
};

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
  private roomBorderGraphics: Graphics;
  private emptyCellGraphics: Graphics;
  private labelContainer: Container;

  private gridState: GridState | null = null;
  private hoveredCell: Position | null = null;
  private selectedCell: Position | null = null;
  private constructingRooms: Room[] = [];

  private onCellClick: ((x: number, y: number) => void) | null = null;
  private onCellHover: ((x: number, y: number) => void) | null = null;

  // Animation state for construction pulse
  private animationTime = 0;

  constructor() {
    this.container = new Container();
    this.container.label = 'FloorPlanRenderer';

    this.cellGraphics = new Graphics();
    this.cellGraphics.label = 'cells';

    this.roomBorderGraphics = new Graphics();
    this.roomBorderGraphics.label = 'roomBorders';

    this.emptyCellGraphics = new Graphics();
    this.emptyCellGraphics.label = 'emptyCells';

    this.gridGraphics = new Graphics();
    this.gridGraphics.label = 'gridLines';

    this.constructionGraphics = new Graphics();
    this.constructionGraphics.label = 'construction';

    this.labelContainer = new Container();
    this.labelContainer.label = 'roomLabels';

    this.hoverGraphics = new Graphics();
    this.hoverGraphics.label = 'hover';

    this.selectionGraphics = new Graphics();
    this.selectionGraphics.label = 'selection';

    this.container.addChild(this.cellGraphics);
    this.container.addChild(this.emptyCellGraphics);
    this.container.addChild(this.roomBorderGraphics);
    this.container.addChild(this.gridGraphics);
    this.container.addChild(this.constructionGraphics);
    this.container.addChild(this.labelContainer);
    this.container.addChild(this.selectionGraphics);
    this.container.addChild(this.hoverGraphics);

    this.container.eventMode = 'static';
    this.container.cursor = 'default';
    this.container.on('pointermove', this.handlePointerMove.bind(this));
    this.container.on('pointerup', this.handlePointerUp.bind(this));
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

    // Set hit area so pointer events work on the full grid area
    if (grid.width > 0 && grid.height > 0) {
      this.container.hitArea = new Rectangle(
        0, 0,
        grid.width * TILE.FLOOR_SIZE,
        grid.height * TILE.FLOOR_SIZE,
      );
    }

    this.drawCells();
    this.drawEmptyCellDots();
    this.drawRoomBorders();
    this.drawGridLines();
    this.drawConstructionOverlay();
    this.drawRoomLabels();
    this.drawSelection();
  }

  /** Animate construction overlay pulse — call from game loop or ticker */
  tick(deltaMs: number): void {
    this.animationTime += deltaMs;
    // Update construction overlay alpha with pulsing
    if (this.constructingRooms.length > 0) {
      const pulse = 0.3 + 0.3 * Math.sin(this.animationTime * 0.003);
      this.constructionGraphics.alpha = pulse;
    }
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

  /** Draw subtle dots at the center of empty cells */
  private drawEmptyCellDots(): void {
    const g = this.emptyCellGraphics;
    g.clear();

    if (!this.gridState) return;
    const { width, height, cells } = this.gridState;
    const s = TILE.FLOOR_SIZE;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const cell = cells[y * width + x];
        if (cell.type === 'empty') {
          const cx = x * s + s / 2;
          const cy = y * s + s / 2;
          // Small cross pattern
          const len = 2;
          g.setStrokeStyle({ width: 1, color: 0x3a3a5e, alpha: 0.4 });
          g.moveTo(cx - len, cy);
          g.lineTo(cx + len, cy);
          g.moveTo(cx, cy - len);
          g.lineTo(cx, cy + len);
          g.stroke();
        }
      }
    }
  }

  /** Draw thicker borders around room boundaries */
  private drawRoomBorders(): void {
    const g = this.roomBorderGraphics;
    g.clear();

    if (!this.gridState) return;
    const s = TILE.FLOOR_SIZE;

    // Collect unique rooms by roomId
    const roomMap = new Map<string, { type: string; minX: number; minY: number; maxX: number; maxY: number; isConstructing: boolean }>();
    const { width, height, cells } = this.gridState;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const cell = cells[y * width + x];
        if (cell.roomId && cell.roomType) {
          const existing = roomMap.get(cell.roomId);
          const constructing = this.constructingRooms.some(
            (r) => r.id === cell.roomId && r.isConstructing,
          );
          if (existing) {
            existing.minX = Math.min(existing.minX, x);
            existing.minY = Math.min(existing.minY, y);
            existing.maxX = Math.max(existing.maxX, x);
            existing.maxY = Math.max(existing.maxY, y);
          } else {
            roomMap.set(cell.roomId, {
              type: cell.roomType,
              minX: x,
              minY: y,
              maxX: x,
              maxY: y,
              isConstructing: constructing,
            });
          }
        }
      }
    }

    for (const [, room] of roomMap) {
      const px = room.minX * s;
      const py = room.minY * s;
      const pw = (room.maxX - room.minX + 1) * s;
      const ph = (room.maxY - room.minY + 1) * s;

      // Lighten the room color for border
      const baseColor = ROOM_COLORS[room.type] ?? ROOM_COLORS.empty;
      const r = ((baseColor >> 16) & 0xff);
      const gr = ((baseColor >> 8) & 0xff);
      const b = (baseColor & 0xff);
      const lighten = 40;
      const borderColor = (
        (Math.min(255, r + lighten) << 16) |
        (Math.min(255, gr + lighten) << 8) |
        Math.min(255, b + lighten)
      );

      if (room.isConstructing) {
        // Dashed border for constructing rooms
        const dashLen = 4;
        const gapLen = 3;
        this.drawDashedRect(g, px, py, pw, ph, dashLen, gapLen, borderColor);
      } else {
        // Solid thick border
        g.setStrokeStyle({ width: 2, color: borderColor, alpha: 0.8 });
        g.rect(px + 1, py + 1, pw - 2, ph - 2);
        g.stroke();
      }
    }
  }

  /** Draw a dashed rectangle */
  private drawDashedRect(
    g: Graphics, x: number, y: number, w: number, h: number,
    dashLen: number, gapLen: number, color: number,
  ): void {
    g.setStrokeStyle({ width: 2, color, alpha: 0.7 });
    const edges: [number, number, number, number][] = [
      [x, y, x + w, y],           // top
      [x + w, y, x + w, y + h],   // right
      [x + w, y + h, x, y + h],   // bottom
      [x, y + h, x, y],           // left
    ];
    for (const [x1, y1, x2, y2] of edges) {
      const dx = x2 - x1;
      const dy = y2 - y1;
      const len = Math.sqrt(dx * dx + dy * dy);
      const nx = dx / len;
      const ny = dy / len;
      let pos = 0;
      let drawing = true;
      while (pos < len) {
        const segLen = drawing ? dashLen : gapLen;
        const end = Math.min(pos + segLen, len);
        if (drawing) {
          g.moveTo(x1 + nx * pos, y1 + ny * pos);
          g.lineTo(x1 + nx * end, y1 + ny * end);
        }
        pos = end;
        drawing = !drawing;
      }
    }
    g.stroke();
  }

  private drawConstructionOverlay(): void {
    const g = this.constructionGraphics;
    g.clear();

    if (!this.gridState || this.constructingRooms.length === 0) {
      g.alpha = 1;
      return;
    }
    const s = TILE.FLOOR_SIZE;

    for (const room of this.constructingRooms) {
      if (!room.isConstructing) continue;
      const { x, y } = room.position;
      const { width: rw, height: rh } = room.size;

      const px = x * s;
      const py = y * s;
      const pw = rw * s;
      const ph = rh * s;

      // Semi-transparent overlay that will pulse via tick()
      g.rect(px, py, pw, ph);
      g.fill({ color: 0xffffff, alpha: 0.15 });

      // Diagonal hatching lines
      g.setStrokeStyle({ width: 1, color: 0xffffff, alpha: 0.25 });
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

  /** Draw room name labels centered in each room */
  private drawRoomLabels(): void {
    // Remove old labels
    this.labelContainer.removeChildren();

    if (!this.gridState) return;
    const s = TILE.FLOOR_SIZE;
    const { width, height, cells } = this.gridState;

    // Collect unique rooms
    const roomMap = new Map<string, { type: RoomType; minX: number; minY: number; maxX: number; maxY: number; isConstructing: boolean }>();

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const cell = cells[y * width + x];
        if (cell.roomId && cell.roomType) {
          const existing = roomMap.get(cell.roomId);
          const constructing = this.constructingRooms.some(
            (r) => r.id === cell.roomId && r.isConstructing,
          );
          if (existing) {
            existing.minX = Math.min(existing.minX, x);
            existing.minY = Math.min(existing.minY, y);
            existing.maxX = Math.max(existing.maxX, x);
            existing.maxY = Math.max(existing.maxY, y);
          } else {
            roomMap.set(cell.roomId, {
              type: cell.roomType as RoomType,
              minX: x, minY: y, maxX: x, maxY: y,
              isConstructing: constructing,
            });
          }
        }
      }
    }

    const labelStyle = new TextStyle({
      fontFamily: 'monospace',
      fontSize: 10,
      fill: 0xffffff,
      fontWeight: 'bold',
      align: 'center',
    });

    const buildingStyle = new TextStyle({
      fontFamily: 'monospace',
      fontSize: 8,
      fill: 0xffdd57,
      fontWeight: 'bold',
      align: 'center',
    });

    for (const [, room] of roomMap) {
      const roomW = room.maxX - room.minX + 1;
      const roomH = room.maxY - room.minY + 1;

      // Only show label if room is at least 2x2
      if (roomW < 2 || roomH < 2) continue;

      const centerX = (room.minX + roomW / 2) * s;
      const centerY = (room.minY + roomH / 2) * s;

      const abbr = ROOM_LABELS[room.type] ?? room.type.substring(0, 4).toUpperCase();

      if (room.isConstructing) {
        // Show "BUILDING..." for constructing rooms
        const buildText = new Text({ text: 'BUILDING...', style: buildingStyle });
        buildText.anchor.set(0.5, 0.5);
        buildText.x = centerX;
        buildText.y = centerY;
        buildText.alpha = 0.9;
        this.labelContainer.addChild(buildText);
      } else {
        const label = new Text({ text: abbr, style: labelStyle });
        label.anchor.set(0.5, 0.5);
        label.x = centerX;
        label.y = centerY;
        label.alpha = 0.85;
        this.labelContainer.addChild(label);
      }
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

  private handlePointerUp(e: { globalX: number; globalY: number; button: number }): void {
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
