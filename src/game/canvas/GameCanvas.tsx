import { useRef, useEffect, useCallback } from 'react';
import { Application as PixiApp, Container, Graphics } from 'pixi.js';
import { useGameStore } from '../../store/gameStore';
import { CameraController } from '../rendering/CameraController';
import { FloorPlanRenderer } from '../rendering/FloorPlanRenderer';
import { IsometricRenderer } from '../rendering/IsometricRenderer';
import { GameLoop } from '../engine/GameLoop';
import { screenToGrid } from '../../utils/isometric';
import { TILE } from '../data/constants';
import { ROOM_DEFINITIONS } from '../data/rooms';
import { canPlaceRoom } from '../systems/BuildingSystem';

export function GameCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<PixiApp | null>(null);
  const cameraRef = useRef<CameraController>(new CameraController());
  const floorPlanRef = useRef<FloorPlanRenderer>(new FloorPlanRenderer());
  const isometricRef = useRef<IsometricRenderer>(new IsometricRenderer());
  const ghostRef = useRef<Graphics | null>(null);
  const bgRef = useRef<Graphics | null>(null);
  const worldContainerRef = useRef<Container | null>(null);
  const initializedRef = useRef(false);
  const gameLoopRef = useRef<GameLoop>(new GameLoop());
  const hoveredCellRef = useRef<{ x: number; y: number } | null>(null);

  // Drag-to-size room placement state
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const isDraggingRoomRef = useRef(false);

  // Read store values
  const viewMode = useGameStore((s) => s.ui.viewMode);
  const grid = useGameStore((s) => s.grid);
  const camera = useGameStore((s) => s.camera);
  const selectedTile = useGameStore((s) => s.ui.selectedTile);
  const selectedRoomType = useGameStore((s) => s.ui.selectedRoomType);
  const properties = useGameStore((s) => s.properties);
  const activePropertyId = useGameStore((s) => s.activePropertyId);
  const setCamera = useGameStore((s) => s.setCamera);
  const selectTile = useGameStore((s) => s.selectTile);
  const setViewMode = useGameStore((s) => s.setViewMode);

  // Compute the placement rectangle from drag start + current hover, clamped to min size
  const getPlacementRect = useCallback(() => {
    const start = dragStartRef.current;
    const hover = hoveredCellRef.current;
    const state = useGameStore.getState();
    if (!start || !hover || !state.ui.selectedRoomType) return null;

    const roomDef = ROOM_DEFINITIONS[state.ui.selectedRoomType];
    if (!roomDef) return null;

    // Rectangle from drag start to current hover
    const rawX = Math.min(start.x, hover.x);
    const rawY = Math.min(start.y, hover.y);
    const rawW = Math.abs(hover.x - start.x) + 1;
    const rawH = Math.abs(hover.y - start.y) + 1;

    // Enforce minimum size
    const w = Math.max(rawW, roomDef.minSize.width);
    const h = Math.max(rawH, roomDef.minSize.height);

    // Anchor expansion from the drag start corner
    let x = rawX;
    let y = rawY;

    // If the user dragged smaller than min, expand from the start point
    if (rawW < roomDef.minSize.width) {
      x = hover.x < start.x ? start.x - w + 1 : start.x;
    }
    if (rawH < roomDef.minSize.height) {
      y = hover.y < start.y ? start.y - h + 1 : start.y;
    }

    return { x, y, width: w, height: h, minWidth: roomDef.minSize.width, minHeight: roomDef.minSize.height };
  }, []);

  // Cell click handler (for non-placement clicks and simple click-to-place)
  const handleCellClick = useCallback(
    (x: number, y: number) => {
      if (cameraRef.current.wasDragging) return;
      const state = useGameStore.getState();

      // Simple click places at minimum size
      if (state.ui.selectedRoomType) {
        const roomDef = ROOM_DEFINITIONS[state.ui.selectedRoomType];
        if (roomDef) {
          state.placeRoom(state.ui.selectedRoomType, { x, y }, roomDef.minSize);
        }
        return;
      }

      selectTile({ x, y });
    },
    [selectTile],
  );

  const handleCellHover = useCallback((_x: number, _y: number) => {
    hoveredCellRef.current = { x: _x, y: _y };
  }, []);

  // Draw ghost preview for room placement
  const drawGhostPreview = useCallback(() => {
    const ghost = ghostRef.current;
    if (!ghost) return;
    ghost.clear();

    const state = useGameStore.getState();
    if (!state.ui.selectedRoomType || !hoveredCellRef.current) return;
    if (state.ui.viewMode !== 'floorplan') return;

    const roomDef = ROOM_DEFINITIONS[state.ui.selectedRoomType];
    if (!roomDef) return;

    const s = TILE.FLOOR_SIZE;

    if (isDraggingRoomRef.current && dragStartRef.current) {
      // Show the drag rectangle
      const rect = getPlacementRect();
      if (!rect) return;

      const activeProperty = state.properties.find((p) => p.id === state.activePropertyId);
      const rooms = activeProperty?.rooms ?? [];
      const valid = canPlaceRoom(state.grid, { x: rect.x, y: rect.y }, { width: rect.width, height: rect.height }, rooms);

      const color = valid ? 0x22c55e : 0xef4444;
      ghost.rect(rect.x * s, rect.y * s, rect.width * s, rect.height * s);
      ghost.fill({ color, alpha: 0.35 });
      ghost.setStrokeStyle({ width: 2, color, alpha: 0.8 });
      ghost.rect(rect.x * s, rect.y * s, rect.width * s, rect.height * s);
      ghost.stroke();

    } else {
      // Not dragging yet — show minimum-size ghost at hover position
      const { x, y } = hoveredCellRef.current;
      const { width: rw, height: rh } = roomDef.minSize;

      const activeProperty = state.properties.find((p) => p.id === state.activePropertyId);
      const rooms = activeProperty?.rooms ?? [];
      const valid = canPlaceRoom(state.grid, { x, y }, roomDef.minSize, rooms);

      const color = valid ? 0x22c55e : 0xef4444;
      ghost.rect(x * s, y * s, rw * s, rh * s);
      ghost.fill({ color, alpha: 0.25 });
      ghost.setStrokeStyle({ width: 2, color, alpha: 0.6 });
      ghost.rect(x * s, y * s, rw * s, rh * s);
      ghost.stroke();

      // Show "click & drag to resize" hint with dashed lines extending from min size
      if (rw < state.grid.width - x || rh < state.grid.height - y) {
        const hintColor = 0x888888;
        ghost.setStrokeStyle({ width: 1, color: hintColor, alpha: 0.3 });
        // Right expansion hint
        ghost.moveTo((x + rw) * s, y * s + 4);
        ghost.lineTo((x + rw) * s + s * 0.5, y * s + 4);
        ghost.moveTo((x + rw) * s, y * s + rh * s - 4);
        ghost.lineTo((x + rw) * s + s * 0.5, y * s + rh * s - 4);
        // Bottom expansion hint
        ghost.moveTo(x * s + 4, (y + rh) * s);
        ghost.lineTo(x * s + 4, (y + rh) * s + s * 0.5);
        ghost.moveTo(x * s + rw * s - 4, (y + rh) * s);
        ghost.lineTo(x * s + rw * s - 4, (y + rh) * s + s * 0.5);
        ghost.stroke();
      }
    }
  }, [getPlacementRect]);

  // Escape / right-click to cancel placement
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'Escape') {
        const state = useGameStore.getState();
        if (state.ui.selectedRoomType) {
          state.selectRoomType(null);
          dragStartRef.current = null;
          isDraggingRoomRef.current = false;
        }
      }
      if (e.key.toLowerCase() === 'v') {
        setViewMode(viewMode === 'floorplan' ? 'isometric' : 'floorplan');
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      const state = useGameStore.getState();
      if (state.ui.selectedRoomType) {
        e.preventDefault();
        state.selectRoomType(null);
        dragStartRef.current = null;
        isDraggingRoomRef.current = false;
      }
    };

    window.addEventListener('keydown', handleKey);
    window.addEventListener('contextmenu', handleContextMenu);
    return () => {
      window.removeEventListener('keydown', handleKey);
      window.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [viewMode, setViewMode]);

  // Initialize PixiJS Application
  useEffect(() => {
    if (!containerRef.current || initializedRef.current) return;
    initializedRef.current = true;

    const div = containerRef.current;
    const width = div.clientWidth;
    const height = div.clientHeight;

    const app = new PixiApp();
    appRef.current = app;

    app.init({
      width,
      height,
      background: 0x0f0f1a,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    }).then(() => {
      if (!containerRef.current) return;
      containerRef.current.appendChild(app.canvas);

      // Background
      const bg = new Graphics();
      bgRef.current = bg;
      bg.rect(0, 0, width, height);
      bg.fill(0x0f0f1a);
      app.stage.addChild(bg);

      // World container (camera applies here)
      const worldContainer = new Container();
      worldContainer.label = 'world';
      worldContainerRef.current = worldContainer;
      app.stage.addChild(worldContainer);

      // Add renderers to world container
      worldContainer.addChild(floorPlanRef.current.getContainer());
      worldContainer.addChild(isometricRef.current.getContainer());

      // Ghost preview layer (on top of renderers)
      const ghost = new Graphics();
      ghost.label = 'ghostPreview';
      ghostRef.current = ghost;
      worldContainer.addChild(ghost);

      // Setup floor plan callbacks
      floorPlanRef.current.setCallbacks(handleCellClick, handleCellHover);

      // Setup camera
      const canvas = app.canvas as HTMLCanvasElement;
      cameraRef.current.init(canvas, width, height, (x, y, zoom) => {
        setCamera(x, y, zoom);
      });

      // Set world bounds from grid
      const state = useGameStore.getState();
      if (state.grid.width > 0) {
        const worldW = state.grid.width * TILE.FLOOR_SIZE;
        const worldH = state.grid.height * TILE.FLOOR_SIZE;
        cameraRef.current.setWorldBounds(worldW, worldH);
        cameraRef.current.centerOnGrid(state.grid.width, state.grid.height, false);
      }

      // Helper: convert screen coords to grid cell
      const screenToCell = (e: PointerEvent) => {
        const store = useGameStore.getState();
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        const cam = store.camera;
        const worldX = (mouseX - cam.x) / cam.zoom;
        const worldY = (mouseY - cam.y) / cam.zoom;
        const cellX = Math.floor(worldX / TILE.FLOOR_SIZE);
        const cellY = Math.floor(worldY / TILE.FLOOR_SIZE);
        if (cellX >= 0 && cellX < store.grid.width && cellY >= 0 && cellY < store.grid.height) {
          return { x: cellX, y: cellY };
        }
        return null;
      };

      // --- Pointer events for drag-to-size room placement ---

      canvas.addEventListener('pointerdown', (e: PointerEvent) => {
        if (e.button !== 0) return;
        const store = useGameStore.getState();
        if (store.ui.viewMode !== 'floorplan') return;
        if (!store.ui.selectedRoomType) return;

        const cell = screenToCell(e);
        if (cell) {
          dragStartRef.current = cell;
          isDraggingRoomRef.current = true;
          // Prevent camera from starting a drag when placing rooms
          cameraRef.current.cancelDrag();
        }
      });

      canvas.addEventListener('pointermove', (e: PointerEvent) => {
        const store = useGameStore.getState();
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        const cam = store.camera;
        const worldX = (mouseX - cam.x) / cam.zoom;
        const worldY = (mouseY - cam.y) / cam.zoom;

        if (store.ui.viewMode === 'floorplan') {
          const cellX = Math.floor(worldX / TILE.FLOOR_SIZE);
          const cellY = Math.floor(worldY / TILE.FLOOR_SIZE);
          if (cellX >= 0 && cellX < store.grid.width && cellY >= 0 && cellY < store.grid.height) {
            handleCellHover(cellX, cellY);
          }
        } else {
          const cell = screenToGrid(worldX, worldY, TILE.ISO_WIDTH, TILE.ISO_HEIGHT);
          if (cell.x >= 0 && cell.x < store.grid.width && cell.y >= 0 && cell.y < store.grid.height) {
            isometricRef.current.drawHover(cell);
          } else {
            isometricRef.current.drawHover(null);
          }
        }
      });

      canvas.addEventListener('pointerup', (e: PointerEvent) => {
        if (e.button !== 0) return;

        const store = useGameStore.getState();

        // Handle drag-to-size room placement
        if (isDraggingRoomRef.current && dragStartRef.current && store.ui.selectedRoomType) {
          isDraggingRoomRef.current = false;

          const cell = screenToCell(e);
          if (cell) {
            hoveredCellRef.current = cell;
          }

          const rect = getPlacementRect();
          if (rect) {
            store.placeRoom(
              store.ui.selectedRoomType,
              { x: rect.x, y: rect.y },
              { width: rect.width, height: rect.height },
            );
          }
          dragStartRef.current = null;
          return;
        }

        if (cameraRef.current.wasDragging) return;

        const canvasRect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - canvasRect.left;
        const mouseY = e.clientY - canvasRect.top;
        const cam = store.camera;
        const worldX = (mouseX - cam.x) / cam.zoom;
        const worldY = (mouseY - cam.y) / cam.zoom;

        if (store.ui.viewMode === 'floorplan') {
          const cellX = Math.floor(worldX / TILE.FLOOR_SIZE);
          const cellY = Math.floor(worldY / TILE.FLOOR_SIZE);
          if (cellX >= 0 && cellX < store.grid.width && cellY >= 0 && cellY < store.grid.height) {
            handleCellClick(cellX, cellY);
          }
        } else {
          const cell = screenToGrid(worldX, worldY, TILE.ISO_WIDTH, TILE.ISO_HEIGHT);
          if (cell.x >= 0 && cell.x < store.grid.width && cell.y >= 0 && cell.y < store.grid.height) {
            selectTile(cell);
          }
        }
      });

      // Game loop tick
      const gameLoop = gameLoopRef.current;
      app.ticker.add((ticker) => {
        cameraRef.current.tick();
        gameLoop.update(ticker);
        drawGhostPreview();
        floorPlanRef.current.tick(ticker.deltaMS);
      });

      // Handle resize
      const resizeObserver = new ResizeObserver((entries) => {
        const entry = entries[0];
        if (!entry) return;
        const { width: w, height: h } = entry.contentRect;
        app.renderer.resize(w, h);
        cameraRef.current.setScreenSize(w, h);

        if (bgRef.current) {
          bgRef.current.clear();
          bgRef.current.rect(0, 0, w, h);
          bgRef.current.fill(0x0f0f1a);
        }
      });
      resizeObserver.observe(div);
    });

    return () => {
      cameraRef.current.dispose();
      if (appRef.current) {
        appRef.current.destroy(true);
        appRef.current = null;
      }
      initializedRef.current = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Recenter camera when grid size changes
  useEffect(() => {
    if (grid.width === 0 || grid.height === 0) return;
    const worldW = grid.width * TILE.FLOOR_SIZE;
    const worldH = grid.height * TILE.FLOOR_SIZE;
    cameraRef.current.setWorldBounds(worldW, worldH);
    cameraRef.current.centerOnGrid(grid.width, grid.height, viewMode === 'isometric');
  }, [grid.width, grid.height, viewMode]);

  // Update renderers
  useEffect(() => {
    if (!worldContainerRef.current) return;

    const floorPlan = floorPlanRef.current;
    const isometric = isometricRef.current;

    const activeProperty = properties.find((p) => p.id === activePropertyId);
    const constructingRooms = activeProperty?.rooms.filter((r) => r.isConstructing) ?? [];

    if (viewMode === 'floorplan') {
      floorPlan.getContainer().visible = true;
      isometric.getContainer().visible = false;
      floorPlan.update(grid, selectedTile, constructingRooms);
    } else {
      floorPlan.getContainer().visible = false;
      isometric.getContainer().visible = true;
      isometric.update(grid, selectedTile);
    }
  }, [viewMode, grid, selectedTile, properties, activePropertyId]);

  // Update camera transform
  useEffect(() => {
    if (!worldContainerRef.current) return;
    worldContainerRef.current.x = camera.x;
    worldContainerRef.current.y = camera.y;
    worldContainerRef.current.scale.set(camera.zoom);
  }, [camera]);

  // Clear ghost when room type deselected
  useEffect(() => {
    if (!selectedRoomType && ghostRef.current) {
      ghostRef.current.clear();
      dragStartRef.current = null;
      isDraggingRoomRef.current = false;
    }
  }, [selectedRoomType]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full"
      style={{ touchAction: 'none' }}
    />
  );
}
