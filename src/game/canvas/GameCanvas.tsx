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

  // Cell click handler
  const handleCellClick = useCallback(
    (x: number, y: number) => {
      // Don't select if we were dragging
      if (cameraRef.current.wasDragging) return;

      const state = useGameStore.getState();

      // If in placement mode, try to place the room
      if (state.ui.selectedRoomType) {
        const roomDef = ROOM_DEFINITIONS[state.ui.selectedRoomType];
        if (roomDef) {
          state.placeRoom(state.ui.selectedRoomType, { x, y }, roomDef.minSize);
        }
        return;
      }

      // Check if clicking on an existing room (for potential demolish)
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

    const { x, y } = hoveredCellRef.current;
    const { width: rw, height: rh } = roomDef.minSize;
    const s = TILE.FLOOR_SIZE;

    // Check validity
    const activeProperty = state.properties.find((p) => p.id === state.activePropertyId);
    const rooms = activeProperty?.rooms ?? [];
    const valid = canPlaceRoom(state.grid, { x, y }, roomDef.minSize, rooms);

    const color = valid ? 0x22c55e : 0xef4444; // green or red
    const alpha = 0.35;

    ghost.rect(x * s, y * s, rw * s, rh * s);
    ghost.fill({ color, alpha });
    ghost.setStrokeStyle({ width: 2, color, alpha: 0.8 });
    ghost.rect(x * s, y * s, rw * s, rh * s);
    ghost.stroke();
  }, []);

  // Escape / right-click to cancel placement
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'Escape') {
        const state = useGameStore.getState();
        if (state.ui.selectedRoomType) {
          state.selectRoomType(null);
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

      // Set world bounds from grid (may be 0 at init, recalculated on grid change)
      const state = useGameStore.getState();
      if (state.grid.width > 0) {
        const worldW = state.grid.width * TILE.FLOOR_SIZE;
        const worldH = state.grid.height * TILE.FLOOR_SIZE;
        cameraRef.current.setWorldBounds(worldW, worldH);
        cameraRef.current.centerOnGrid(state.grid.width, state.grid.height, false);
      }

      // Isometric mouse picking
      canvas.addEventListener('pointermove', (e: PointerEvent) => {
        const store = useGameStore.getState();
        if (store.ui.viewMode !== 'isometric') return;

        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const cam = store.camera;
        const worldX = (mouseX - cam.x) / cam.zoom;
        const worldY = (mouseY - cam.y) / cam.zoom;

        const cell = screenToGrid(worldX, worldY, TILE.ISO_WIDTH, TILE.ISO_HEIGHT);

        if (cell.x >= 0 && cell.x < store.grid.width && cell.y >= 0 && cell.y < store.grid.height) {
          isometricRef.current.drawHover(cell);
        } else {
          isometricRef.current.drawHover(null);
        }
      });

      canvas.addEventListener('pointerup', (e: PointerEvent) => {
        if (e.button !== 0) return;
        if (cameraRef.current.wasDragging) return;

        const store = useGameStore.getState();
        if (store.ui.viewMode !== 'isometric') return;

        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const cam = store.camera;
        const worldX = (mouseX - cam.x) / cam.zoom;
        const worldY = (mouseY - cam.y) / cam.zoom;

        const cell = screenToGrid(worldX, worldY, TILE.ISO_WIDTH, TILE.ISO_HEIGHT);

        if (cell.x >= 0 && cell.x < store.grid.width && cell.y >= 0 && cell.y < store.grid.height) {
          selectTile(cell);
        }
      });

      // Game loop tick for WASD + game time + ghost preview
      const gameLoop = gameLoopRef.current;
      app.ticker.add((ticker) => {
        cameraRef.current.tick();
        gameLoop.update(ticker);
        drawGhostPreview();
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

  // Recenter camera when grid size changes (e.g. after property purchase)
  useEffect(() => {
    if (grid.width === 0 || grid.height === 0) return;
    const worldW = grid.width * TILE.FLOOR_SIZE;
    const worldH = grid.height * TILE.FLOOR_SIZE;
    cameraRef.current.setWorldBounds(worldW, worldH);
    cameraRef.current.centerOnGrid(grid.width, grid.height, viewMode === 'isometric');
  }, [grid.width, grid.height, viewMode]);

  // Update renderers when grid/camera/viewMode/selection changes
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
