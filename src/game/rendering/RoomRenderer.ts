import { Graphics } from 'pixi.js';
import type { Room, RoomType, GamePhase } from '../../types';
import { getPresetById } from '../data/presets';

/** Main entry point — draw an illustrated room interior */
export function renderRoom(
  g: Graphics,
  room: Room,
  pixelX: number,
  pixelY: number,
  pixelW: number,
  pixelH: number,
  phase: GamePhase,
  animTime: number,
): void {
  const preset = room.presetId ? getPresetById(room.presetId) : null;
  const primary = preset?.visualTheme.primaryColor ?? getFallbackColor(room.type);
  const secondary = preset?.visualTheme.secondaryColor ?? lighten(primary, 30);
  const accent = preset?.visualTheme.accentColor ?? lighten(primary, 60);
  const pattern = preset?.visualTheme.pattern ?? 'plain';

  // Draw base floor
  drawFloor(g, pixelX, pixelY, pixelW, pixelH, primary, pattern);

  // Draw room-specific illustrations
  switch (room.type) {
    case 'lobby': drawLobby(g, pixelX, pixelY, pixelW, pixelH, primary, secondary, accent, phase, animTime); break;
    case 'stage': drawStage(g, pixelX, pixelY, pixelW, pixelH, primary, secondary, accent, phase, animTime); break;
    case 'seating': drawSeating(g, pixelX, pixelY, pixelW, pixelH, primary, secondary, accent, phase, animTime); break;
    case 'backstage': drawBackstage(g, pixelX, pixelY, pixelW, pixelH, primary, secondary, accent); break;
    case 'box_office': drawBoxOffice(g, pixelX, pixelY, pixelW, pixelH, primary, secondary, accent, phase, animTime); break;
    case 'office': drawOffice(g, pixelX, pixelY, pixelW, pixelH, primary, secondary, accent); break;
    case 'rehearsal_hall': drawRehearsalHall(g, pixelX, pixelY, pixelW, pixelH, primary, secondary); break;
    case 'dressing_room': drawDressingRoom(g, pixelX, pixelY, pixelW, pixelH, primary, secondary, accent); break;
    case 'orchestra_pit': drawOrchestraPit(g, pixelX, pixelY, pixelW, pixelH, primary, secondary); break;
    default: break; // Other rooms get floor + border only
  }
}

function drawFloor(g: Graphics, x: number, y: number, w: number, h: number, color: number, pattern: string): void {
  if (pattern === 'checker') {
    const tileSize = 6;
    for (let row = 0; row < Math.ceil(h / tileSize); row++) {
      for (let col = 0; col < Math.ceil(w / tileSize); col++) {
        const isLight = (row + col) % 2 === 0;
        const c = isLight ? lighten(color, 15) : darken(color, 15);
        const tx = x + col * tileSize;
        const ty = y + row * tileSize;
        const tw = Math.min(tileSize, x + w - tx);
        const th = Math.min(tileSize, y + h - ty);
        g.rect(tx, ty, tw, th).fill(c);
      }
    }
  } else if (pattern === 'brick') {
    g.rect(x, y, w, h).fill(color);
    const brickH = 4;
    const brickW = 8;
    g.setStrokeStyle({ width: 0.5, color: darken(color, 25), alpha: 0.5 });
    for (let row = 0; row < Math.ceil(h / brickH); row++) {
      const offset = row % 2 === 0 ? 0 : brickW / 2;
      for (let col = -1; col < Math.ceil(w / brickW) + 1; col++) {
        const bx = x + col * brickW + offset;
        const by = y + row * brickH;
        g.moveTo(Math.max(x, bx), by).lineTo(Math.min(x + w, bx), by);
        if (bx >= x && bx <= x + w) {
          g.moveTo(bx, by).lineTo(bx, Math.min(y + h, by + brickH));
        }
      }
    }
    g.stroke();
  } else if (pattern === 'wood') {
    g.rect(x, y, w, h).fill(color);
    g.setStrokeStyle({ width: 0.5, color: darken(color, 20), alpha: 0.3 });
    const plankW = 5;
    for (let px = 0; px < w; px += plankW) {
      g.moveTo(x + px, y).lineTo(x + px, y + h);
    }
    g.stroke();
  } else {
    g.rect(x, y, w, h).fill(color);
  }
}

function drawLobby(g: Graphics, x: number, y: number, w: number, h: number, _p: number, _s: number, accent: number, phase: GamePhase, t: number): void {
  const cx = x + w / 2;
  const cy = y + h / 2;

  // Chandelier
  g.circle(cx, cy - h * 0.15, 4).fill({ color: 0xffd700, alpha: 0.8 });
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2;
    g.setStrokeStyle({ width: 0.5, color: 0xffd700, alpha: 0.4 });
    g.moveTo(cx, cy - h * 0.15);
    g.lineTo(cx + Math.cos(angle) * 6, cy - h * 0.15 + Math.sin(angle) * 6);
    g.stroke();
  }

  // Velvet rope stanchions
  for (const side of [-1, 1]) {
    const sx = cx + side * w * 0.3;
    g.circle(sx, cy + h * 0.2, 1.5).fill(accent);
    g.circle(sx, cy - h * 0.1, 1.5).fill(accent);
    g.setStrokeStyle({ width: 0.5, color: accent, alpha: 0.6 });
    g.moveTo(sx, cy + h * 0.2).lineTo(sx, cy - h * 0.1);
    g.stroke();
  }

  // Phase animation: patrons during running
  if (phase === 'running') {
    const count = 3 + Math.floor(Math.sin(t * 0.002) * 2);
    for (let i = 0; i < count; i++) {
      const px = x + 5 + (i * (w - 10)) / count + Math.sin(t * 0.001 + i) * 3;
      const py = cy + h * 0.1 + Math.cos(t * 0.0015 + i) * 2;
      g.circle(px, py, 2).fill({ color: 0xffffff, alpha: 0.5 });
    }
  }
}

function drawStage(g: Graphics, x: number, y: number, w: number, h: number, _p: number, secondary: number, accent: number, phase: GamePhase, t: number): void {
  // Proscenium arch
  g.setStrokeStyle({ width: 1.5, color: accent, alpha: 0.7 });
  g.moveTo(x + 2, y + h);
  g.lineTo(x + 2, y + 3);
  g.quadraticCurveTo(x + w / 2, y, x + w - 2, y + 3);
  g.lineTo(x + w - 2, y + h);
  g.stroke();

  // Curtain lines
  const curtainOpen = phase === 'running';
  if (!curtainOpen) {
    g.setStrokeStyle({ width: 0.5, color: secondary, alpha: 0.6 });
    for (let i = 0; i < 5; i++) {
      const cx = x + 4 + (i * (w - 8)) / 5;
      g.moveTo(cx, y + 3);
      g.quadraticCurveTo(cx + 2, y + h * 0.5, cx, y + h - 2);
    }
    g.stroke();
  }

  // Spotlights
  for (const pos of [0.3, 0.5, 0.7]) {
    const sx = x + w * pos;
    g.circle(sx, y + 2, 2).fill({ color: 0xffffff, alpha: 0.3 + Math.sin(t * 0.003 + pos * 5) * 0.1 });
  }

  // Phase animation: figures on stage during running
  if (phase === 'running') {
    for (let i = 0; i < 3; i++) {
      const fx = x + w * 0.25 + i * w * 0.25 + Math.sin(t * 0.002 + i * 2) * 3;
      const fy = y + h * 0.6;
      g.circle(fx, fy - 3, 2).fill({ color: 0xffffff, alpha: 0.6 }); // head
      g.rect(fx - 1, fy - 1, 2, 4).fill({ color: 0xffffff, alpha: 0.4 }); // body
    }
  }
}

function drawSeating(g: Graphics, x: number, y: number, w: number, h: number, primary: number, _s: number, _a: number, phase: GamePhase, t: number): void {
  // Rows of seats
  const rows = Math.floor(h / 4);
  const seatsPerRow = Math.floor(w / 4);
  const aisleCol = Math.floor(seatsPerRow / 2);

  for (let row = 0; row < rows; row++) {
    const rowY = y + 2 + row * (h - 4) / rows;
    const shade = darken(primary, Math.floor(row * 15 / rows)); // darker in front
    for (let col = 0; col < seatsPerRow; col++) {
      if (col === aisleCol) continue; // aisle gap
      const seatX = x + 2 + col * (w - 4) / seatsPerRow;
      g.roundRect(seatX, rowY, 2.5, 2.5, 0.5).fill(shade);
    }
  }

  // Phase: fill seats during running
  if (phase === 'running') {
    const fillPct = 0.5 + Math.sin(t * 0.001) * 0.2;
    let filled = 0;
    const total = rows * (seatsPerRow - 1);
    for (let row = 0; row < rows && filled / total < fillPct; row++) {
      const rowY = y + 2 + row * (h - 4) / rows;
      for (let col = 0; col < seatsPerRow; col++) {
        if (col === aisleCol) continue;
        if (filled / total >= fillPct) break;
        const seatX = x + 2 + col * (w - 4) / seatsPerRow;
        g.circle(seatX + 1.25, rowY + 1.25, 1).fill({ color: 0x22c55e, alpha: 0.7 });
        filled++;
      }
    }
  }
}

function drawBackstage(g: Graphics, x: number, y: number, w: number, h: number, _p: number, secondary: number, accent: number): void {
  // Props table
  g.rect(x + 3, y + h * 0.6, w * 0.4, h * 0.15).fill(secondary);
  // Small prop shapes on table
  g.rect(x + 5, y + h * 0.55, 2, 3).fill(accent);
  g.moveTo(x + 10, y + h * 0.6).lineTo(x + 12, y + h * 0.55).lineTo(x + 14, y + h * 0.6).fill(accent);

  // Mirror with lights
  g.rect(x + w * 0.6, y + 3, w * 0.3, h * 0.3).fill({ color: 0xffffff, alpha: 0.15 });
  for (let i = 0; i < 4; i++) {
    g.circle(x + w * 0.6 + i * (w * 0.3) / 4 + 3, y + 2, 1).fill({ color: 0xfff4e0, alpha: 0.6 });
  }

  // Costume rack
  g.setStrokeStyle({ width: 1, color: secondary });
  g.moveTo(x + w * 0.1, y + h * 0.15).lineTo(x + w * 0.1, y + h * 0.45);
  g.stroke();
  for (let i = 0; i < 3; i++) {
    const ty = y + h * 0.2 + i * 6;
    g.moveTo(x + w * 0.07, ty).lineTo(x + w * 0.13, ty).lineTo(x + w * 0.1, ty - 2);
    g.fill(accent);
  }
}

function drawBoxOffice(g: Graphics, x: number, y: number, w: number, h: number, _p: number, secondary: number, accent: number, phase: GamePhase, t: number): void {
  // Ticket window with arch
  const winX = x + w * 0.25;
  const winW = w * 0.5;
  const winH = h * 0.5;
  g.rect(winX, y + h * 0.2, winW, winH).fill({ color: 0x1a1a1a, alpha: 0.5 });
  g.setStrokeStyle({ width: 1, color: accent });
  g.moveTo(winX, y + h * 0.2 + winH);
  g.lineTo(winX, y + h * 0.2);
  g.quadraticCurveTo(winX + winW / 2, y + h * 0.1, winX + winW, y + h * 0.2);
  g.lineTo(winX + winW, y + h * 0.2 + winH);
  g.stroke();

  // Counter
  g.rect(x + 3, y + h * 0.75, w - 6, 3).fill(secondary);

  // Queue during running
  if (phase === 'running') {
    for (let i = 0; i < 3; i++) {
      const qx = x + w * 0.3 + i * 6 + Math.sin(t * 0.002 + i) * 1;
      g.circle(qx, y + h * 0.85, 1.5).fill({ color: 0xffffff, alpha: 0.4 });
    }
  }
}

function drawOffice(g: Graphics, x: number, y: number, w: number, h: number, _p: number, secondary: number, accent: number): void {
  // Desk
  g.rect(x + w * 0.2, y + h * 0.5, w * 0.5, h * 0.15).fill(secondary);

  // Filing cabinet
  g.rect(x + w * 0.75, y + h * 0.3, w * 0.15, h * 0.4).fill(darken(secondary, 20));

  // Bulletin board
  g.rect(x + 3, y + 3, w * 0.35, h * 0.3).fill({ color: 0x8b6914, alpha: 0.5 });
  // Pins
  for (let i = 0; i < 3; i++) {
    g.rect(x + 5 + i * 5, y + 6, 3, 3).fill({ color: accent, alpha: 0.6 });
  }
}

function drawRehearsalHall(g: Graphics, x: number, y: number, w: number, h: number, _p: number, secondary: number): void {
  // Mirror wall
  g.rect(x + 2, y + 2, w - 4, 3).fill({ color: 0xffffff, alpha: 0.1 });

  // Tape marks on floor
  g.setStrokeStyle({ width: 0.5, color: 0xffff00, alpha: 0.3 });
  for (let i = 0; i < 4; i++) {
    const mx = x + w * 0.2 + i * w * 0.2;
    const my = y + h * 0.5;
    g.moveTo(mx - 2, my - 2).lineTo(mx + 2, my + 2);
    g.moveTo(mx + 2, my - 2).lineTo(mx - 2, my + 2);
  }
  g.stroke();

  // Piano in corner
  g.rect(x + w - 8, y + h - 8, 6, 5).fill(secondary);
}

function drawDressingRoom(g: Graphics, x: number, y: number, w: number, h: number, _p: number, secondary: number, accent: number): void {
  // Large mirror with lights
  g.rect(x + w * 0.2, y + 2, w * 0.6, h * 0.35).fill({ color: 0xffffff, alpha: 0.12 });
  for (let i = 0; i < 5; i++) {
    g.circle(x + w * 0.2 + i * (w * 0.6) / 5 + 3, y + 1, 1).fill({ color: 0xfff4e0, alpha: 0.7 });
  }

  // Counter
  g.rect(x + w * 0.15, y + h * 0.4, w * 0.7, 2).fill(secondary);

  // Makeup circles
  for (let i = 0; i < 3; i++) {
    g.circle(x + w * 0.3 + i * 6, y + h * 0.38, 1.5).fill({ color: accent, alpha: 0.5 });
  }
}

function drawOrchestraPit(g: Graphics, x: number, y: number, w: number, h: number, primary: number, secondary: number): void {
  // Sunken area
  g.rect(x + 1, y + 1, w - 2, h - 2).fill(darken(primary, 30));

  // Music stands
  for (let i = 0; i < 3; i++) {
    const sx = x + w * 0.2 + i * w * 0.3;
    g.setStrokeStyle({ width: 0.5, color: secondary });
    g.moveTo(sx, y + h * 0.3).lineTo(sx, y + h * 0.7);
    g.stroke();
    g.moveTo(sx - 2, y + h * 0.3).lineTo(sx + 2, y + h * 0.3).lineTo(sx, y + h * 0.2);
    g.fill(secondary);
  }

  // Piano shape
  g.rect(x + w * 0.6, y + h * 0.4, 5, 4).fill(secondary);
}

// ---- Color utilities ----

function lighten(color: number, amount: number): number {
  const r = Math.min(255, ((color >> 16) & 0xff) + amount);
  const g = Math.min(255, ((color >> 8) & 0xff) + amount);
  const b = Math.min(255, (color & 0xff) + amount);
  return (r << 16) | (g << 8) | b;
}

function darken(color: number, amount: number): number {
  const r = Math.max(0, ((color >> 16) & 0xff) - amount);
  const g = Math.max(0, ((color >> 8) & 0xff) - amount);
  const b = Math.max(0, (color & 0xff) - amount);
  return (r << 16) | (g << 8) | b;
}

function getFallbackColor(type: RoomType): number {
  const FALLBACK_COLORS: Record<string, number> = {
    lobby: 0xb8860b,
    stage: 0x6b3fa0,
    seating: 0x8b2252,
    backstage: 0x4a5568,
    box_office: 0xd97706,
    office: 0x65a30d,
    rehearsal_hall: 0x0d9488,
    dressing_room: 0xe11d48,
    orchestra_pit: 0x1e40af,
    storage: 0x6b7280,
    vip_lounge: 0xca8a04,
    concession: 0xea580c,
    tech_booth: 0x4f46e5,
    green_room: 0x166534,
    restrooms: 0x0284c7,
  };
  return FALLBACK_COLORS[type] ?? 0x4a4a4a;
}
