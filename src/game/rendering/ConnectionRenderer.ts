import { Graphics } from 'pixi.js';
import type { Room } from '../../types';

interface RoomBounds {
  room: Room;
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Draw decorative connecting elements between adjacent rooms.
 */
export function renderConnections(g: Graphics, rooms: Room[], tileSize: number): void {
  const bounds: RoomBounds[] = rooms
    .filter((r) => !r.isConstructing)
    .map((r) => ({
      room: r,
      x: r.position.x,
      y: r.position.y,
      w: r.size.width,
      h: r.size.height,
    }));

  for (let i = 0; i < bounds.length; i++) {
    for (let j = i + 1; j < bounds.length; j++) {
      const a = bounds[i];
      const b = bounds[j];
      const connection = getConnectionType(a.room.type, b.room.type);
      if (!connection) continue;

      const edge = findSharedEdge(a, b);
      if (!edge) continue;

      drawConnection(g, connection, edge, tileSize);
    }
  }
}

type ConnectionType = 'stairs' | 'stage_lip' | 'door' | 'counter';

function getConnectionType(typeA: string, typeB: string): ConnectionType | null {
  const pair = [typeA, typeB].sort().join('_');
  const map: Record<string, ConnectionType> = {
    'lobby_seating': 'stairs',
    'seating_stage': 'stage_lip',
    'backstage_stage': 'door',
    'box_office_lobby': 'counter',
  };
  return map[pair] ?? null;
}

interface SharedEdge {
  x: number;
  y: number;
  length: number;
  orientation: 'horizontal' | 'vertical';
}

function findSharedEdge(a: RoomBounds, b: RoomBounds): SharedEdge | null {
  // Check if rooms share a horizontal edge
  if (a.y + a.h === b.y || b.y + b.h === a.y) {
    const overlapStart = Math.max(a.x, b.x);
    const overlapEnd = Math.min(a.x + a.w, b.x + b.w);
    if (overlapEnd > overlapStart) {
      const edgeY = a.y + a.h === b.y ? a.y + a.h : b.y + b.h;
      return { x: overlapStart, y: edgeY, length: overlapEnd - overlapStart, orientation: 'horizontal' };
    }
  }

  // Check vertical edge
  if (a.x + a.w === b.x || b.x + b.w === a.x) {
    const overlapStart = Math.max(a.y, b.y);
    const overlapEnd = Math.min(a.y + a.h, b.y + b.h);
    if (overlapEnd > overlapStart) {
      const edgeX = a.x + a.w === b.x ? a.x + a.w : b.x + b.w;
      return { x: edgeX, y: overlapStart, length: overlapEnd - overlapStart, orientation: 'vertical' };
    }
  }

  return null;
}

function drawConnection(g: Graphics, type: ConnectionType, edge: SharedEdge, tileSize: number): void {
  const px = edge.x * tileSize;
  const py = edge.y * tileSize;
  const len = edge.length * tileSize;

  g.setStrokeStyle({ width: 1, color: 0xd4a574, alpha: 0.5 });

  switch (type) {
    case 'stairs':
      // Small diagonal lines
      for (let i = 0; i < 3; i++) {
        const offset = len * (0.25 + i * 0.25);
        if (edge.orientation === 'horizontal') {
          g.moveTo(px + offset - 2, py - 2).lineTo(px + offset + 2, py + 2);
        } else {
          g.moveTo(px - 2, py + offset - 2).lineTo(px + 2, py + offset + 2);
        }
      }
      break;

    case 'stage_lip':
      // Subtle line
      if (edge.orientation === 'horizontal') {
        g.moveTo(px + 2, py).lineTo(px + len - 2, py);
      } else {
        g.moveTo(px, py + 2).lineTo(px, py + len - 2);
      }
      break;

    case 'door': {
      // Door rectangle
      const doorLen = Math.min(len * 0.4, tileSize * 0.8);
      const mid = len / 2;
      if (edge.orientation === 'horizontal') {
        g.rect(px + mid - doorLen / 2, py - 1, doorLen, 2);
      } else {
        g.rect(px - 1, py + mid - doorLen / 2, 2, doorLen);
      }
      g.fill({ color: 0x8b6914, alpha: 0.5 });
      return; // skip the stroke
    }

    case 'counter': {
      // Window/counter
      const counterLen = Math.min(len * 0.5, tileSize);
      const cmid = len / 2;
      if (edge.orientation === 'horizontal') {
        g.rect(px + cmid - counterLen / 2, py - 1.5, counterLen, 3);
      } else {
        g.rect(px - 1.5, py + cmid - counterLen / 2, 3, counterLen);
      }
      g.fill({ color: 0xd97706, alpha: 0.4 });
      return;
    }
  }

  g.stroke();
}
