// Building system: room placement validation and grid mutation.

import type { GridState, Position, Size, Room, RoomType } from '../../types';

/**
 * Check if a room can be placed at the given position and size on the grid.
 * Rules:
 *  - All cells in the rectangle must be within bounds
 *  - All cells must be empty
 *  - Room must be adjacent to an existing room OR an exterior wall (for the first room)
 */
export function canPlaceRoom(
  grid: GridState,
  position: Position,
  size: Size,
  existingRooms: Room[],
): boolean {
  const { x, y } = position;
  const { width: rw, height: rh } = size;
  const { width: gw, height: gh, cells } = grid;

  // Bounds check
  if (x < 0 || y < 0 || x + rw > gw || y + rh > gh) return false;

  // All cells must be empty
  for (let dy = 0; dy < rh; dy++) {
    for (let dx = 0; dx < rw; dx++) {
      const cell = cells[(y + dy) * gw + (x + dx)];
      if (cell.type !== 'empty') return false;
    }
  }

  // First room can go anywhere on the grid
  if (existingRooms.length === 0) return true;

  // Must be adjacent to an existing room or exterior wall
  return isAdjacentToRoomOrWall(grid, position, size);
}

/**
 * Check if a rectangle at position/size touches an existing room or the grid boundary.
 */
export function isAdjacentToRoomOrWall(
  grid: GridState,
  position: Position,
  size: Size,
): boolean {
  const { x, y } = position;
  const { width: rw, height: rh } = size;
  const { width: gw, height: gh, cells } = grid;

  // Check if touching exterior wall (grid boundary)
  if (x === 0 || y === 0 || x + rw === gw || y + rh === gh) {
    return true;
  }

  // Check all cells adjacent to the rectangle (1 cell outside each edge)
  // Top edge
  for (let dx = 0; dx < rw; dx++) {
    if (y > 0) {
      const cell = cells[(y - 1) * gw + (x + dx)];
      if (cell.type === 'room') return true;
    }
  }
  // Bottom edge
  for (let dx = 0; dx < rw; dx++) {
    if (y + rh < gh) {
      const cell = cells[(y + rh) * gw + (x + dx)];
      if (cell.type === 'room') return true;
    }
  }
  // Left edge
  for (let dy = 0; dy < rh; dy++) {
    if (x > 0) {
      const cell = cells[(y + dy) * gw + (x - 1)];
      if (cell.type === 'room') return true;
    }
  }
  // Right edge
  for (let dy = 0; dy < rh; dy++) {
    if (x + rw < gw) {
      const cell = cells[(y + dy) * gw + (x + rw)];
      if (cell.type === 'room') return true;
    }
  }

  return false;
}

/**
 * Write a room onto the grid cells. Returns the updated cells array.
 */
export function placeRoomOnGrid(
  grid: GridState,
  roomId: string,
  roomType: RoomType,
  position: Position,
  size: Size,
): GridState {
  const { x, y } = position;
  const { width: rw, height: rh } = size;
  const { width: gw } = grid;
  const newCells = [...grid.cells];

  for (let dy = 0; dy < rh; dy++) {
    for (let dx = 0; dx < rw; dx++) {
      const idx = (y + dy) * gw + (x + dx);
      newCells[idx] = {
        type: 'room',
        roomId,
        roomType,
        walkable: true,
      };
    }
  }

  return { ...grid, cells: newCells };
}

/**
 * Remove a room from the grid (clear its cells back to empty).
 */
export function removeRoomFromGrid(
  grid: GridState,
  roomId: string,
): GridState {
  const newCells = grid.cells.map((cell) =>
    cell.roomId === roomId
      ? { type: 'empty' as const, roomId: null, roomType: null, walkable: true }
      : cell,
  );
  return { ...grid, cells: newCells };
}
