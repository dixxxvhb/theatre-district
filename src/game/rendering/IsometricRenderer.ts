import { Container, Graphics } from 'pixi.js';
import { TILE, ROOM_COLORS } from '../data/constants';
import { gridToScreen } from '../../utils/isometric';
import type { GridState, Position } from '../../types';

/**
 * Renders isometric view with 64x32px diamond tiles.
 * Uses the GDD isometric projection math.
 */
export class IsometricRenderer {
  private container: Container;
  private tileGraphics: Graphics;
  private gridGraphics: Graphics;
  private hoverGraphics: Graphics;
  private selectionGraphics: Graphics;

  private gridState: GridState | null = null;
  private selectedCell: Position | null = null;

  constructor() {
    this.container = new Container();
    this.container.label = 'IsometricRenderer';

    this.tileGraphics = new Graphics();
    this.tileGraphics.label = 'isoTiles';

    this.gridGraphics = new Graphics();
    this.gridGraphics.label = 'isoGrid';

    this.hoverGraphics = new Graphics();
    this.hoverGraphics.label = 'isoHover';

    this.selectionGraphics = new Graphics();
    this.selectionGraphics.label = 'isoSelection';

    this.container.addChild(this.tileGraphics);
    this.container.addChild(this.gridGraphics);
    this.container.addChild(this.selectionGraphics);
    this.container.addChild(this.hoverGraphics);

    this.container.eventMode = 'static';
  }

  getContainer(): Container {
    return this.container;
  }

  /** Update with new grid data */
  update(grid: GridState, selectedTile: Position | null): void {
    this.gridState = grid;
    this.selectedCell = selectedTile;
    this.drawTiles();
    this.drawSelection();
  }

  /** Set camera transform on the container */
  setTransform(cameraX: number, cameraY: number, zoom: number): void {
    this.container.x = cameraX;
    this.container.y = cameraY;
    this.container.scale.set(zoom);
  }

  private drawDiamond(
    g: Graphics,
    cx: number,
    cy: number,
    fill: number,
    alpha: number = 1,
  ): void {
    const hw = TILE.ISO_WIDTH / 2;
    const hh = TILE.ISO_HEIGHT / 2;

    g.moveTo(cx, cy - hh);       // top
    g.lineTo(cx + hw, cy);       // right
    g.lineTo(cx, cy + hh);       // bottom
    g.lineTo(cx - hw, cy);       // left
    g.closePath();
    g.fill({ color: fill, alpha });
  }

  private drawDiamondOutline(
    g: Graphics,
    cx: number,
    cy: number,
    color: number,
    lineWidth: number = 1,
  ): void {
    const hw = TILE.ISO_WIDTH / 2;
    const hh = TILE.ISO_HEIGHT / 2;

    g.setStrokeStyle({ width: lineWidth, color });
    g.moveTo(cx, cy - hh);
    g.lineTo(cx + hw, cy);
    g.lineTo(cx, cy + hh);
    g.lineTo(cx - hw, cy);
    g.closePath();
    g.stroke();
  }

  private drawTiles(): void {
    const tg = this.tileGraphics;
    const gg = this.gridGraphics;
    tg.clear();
    gg.clear();

    if (!this.gridState) return;
    const { width, height, cells } = this.gridState;

    // Draw back-to-front for correct overlap
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const cell = cells[y * width + x];
        const screen = gridToScreen(x, y, TILE.ISO_WIDTH, TILE.ISO_HEIGHT);

        // Determine color
        const colorKey = cell.type === 'room' && cell.roomType
          ? cell.roomType
          : 'empty';
        const color = ROOM_COLORS[colorKey] ?? ROOM_COLORS.empty;

        // Draw filled diamond for the tile
        this.drawDiamond(tg, screen.x, screen.y, color);

        // Draw grid outline
        this.drawDiamondOutline(gg, screen.x, screen.y, TILE.GRID_LINE_COLOR);
      }
    }
  }

  private drawSelection(): void {
    const g = this.selectionGraphics;
    g.clear();

    if (!this.selectedCell || !this.gridState) return;
    const { x, y } = this.selectedCell;
    if (x < 0 || x >= this.gridState.width || y < 0 || y >= this.gridState.height) return;

    const screen = gridToScreen(x, y, TILE.ISO_WIDTH, TILE.ISO_HEIGHT);
    this.drawDiamond(g, screen.x, screen.y, TILE.SELECTED_COLOR, TILE.SELECTED_ALPHA);
    this.drawDiamondOutline(g, screen.x, screen.y, TILE.SELECTED_COLOR, 2);
  }

  drawHover(cell: Position | null): void {
    const g = this.hoverGraphics;
    g.clear();

    if (!cell || !this.gridState) return;
    if (cell.x < 0 || cell.x >= this.gridState.width || cell.y < 0 || cell.y >= this.gridState.height) return;

    const screen = gridToScreen(cell.x, cell.y, TILE.ISO_WIDTH, TILE.ISO_HEIGHT);
    this.drawDiamond(g, screen.x, screen.y, TILE.HOVER_COLOR, TILE.HOVER_ALPHA);
  }

  destroy(): void {
    this.container.destroy({ children: true });
  }
}
