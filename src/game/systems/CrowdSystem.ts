// CrowdSystem — singleton outside Zustand.
//
// Lives outside the store because:
//   1. Crowd state isn't persisted in saves (re-seeded on load from buzz + time).
//   2. Updates 60 times/second; a store set() per tick would thrash subscribers.
//
// Struct-of-Arrays (typed-array) layout for cache friendliness + cheap Particle sync.
// Capacity is fixed (MAX_AGENTS); active count grows/shrinks. Free slots are tracked
// via a freelist so spawn/despawn is O(1).
//
// Movement: buzz-gradient ascent. Each tick, agent samples its current tile + 4
// neighbors. Picks the one with highest buzz (plus small noise to prevent collapse).
// Greedy, not A*; for a city street this is enough.
//
// Spending: when an agent steps onto a tile occupied by a finished building, it
// transitions to 'spending' state, decrements wallet, credits revenue via the store's
// addCash action.

import { useGameStore } from '../../store/gameStore';
import { BUILDING_DEFINITIONS } from '../data/street';

export const MAX_AGENTS = 300;

// Agent state codes (Uint8 packs efficiently)
export const AGENT_STATE = {
  WANDERING: 0,
  SPENDING:  1,
  LEAVING:   2,
} as const;

// Per-kind revenue + spending duration. Provisional — playtest tunes.
const SPEND_REVENUE: Record<string, number> = {
  theatre: 5,
  restaurant: 3,
  cart: 2,
};
const SPEND_TICKS: Record<string, number> = {
  theatre: 90,    // ~1.5s at 60fps
  restaurant: 45,
  cart: 20,
};

// Wallet bounds (cents, integer for no float drift)
const WALLET_MIN = 1000;   // $10
const WALLET_MAX = 3000;   // $30
const SPEND_MOOD_BUMP = 5; // mood += on successful spend
const MAX_MOOD = 100;
const MIN_MOOD = 20;
const LEAVE_TICKS = 600;   // soft cap on agent lifetime: 10s

// Spawn / despawn cadence
const SPAWN_BUDGET_PER_TICK = 0.03;  // tunes baseline spawn rate; modulated by buzz
const MIN_BUZZ_FOR_SPAWN = 1;

// Smoothing
const VELOCITY_LERP = 0.18;
const MOVE_SPEED = 0.025; // grid tiles per tick — slow stroll

interface State {
  count: number;
  // Position (fractional grid coords for smooth motion)
  posX: Float32Array;
  posY: Float32Array;
  // Velocity per tick (in grid-tile units)
  velX: Float32Array;
  velY: Float32Array;
  // Current target tile (integer grid)
  targetX: Int16Array;
  targetY: Int16Array;
  // State machine
  state: Uint8Array;
  // Wallet (cents)
  wallet: Int32Array;
  // Mood 0-100
  mood: Uint8Array;
  // Spend timer (ticks remaining in current spend)
  spendTicks: Uint16Array;
  // Lifetime in ticks
  ticksAlive: Uint16Array;
  // Activity bit — 1 = slot occupied, 0 = free
  active: Uint8Array;
  // Freelist of inactive slot indices (stack of free slot ids)
  freelist: number[];
  // Spawn accumulator — fractional spawn budget rolled forward
  spawnAccum: number;
}

const state: State = {
  count: 0,
  posX: new Float32Array(MAX_AGENTS),
  posY: new Float32Array(MAX_AGENTS),
  velX: new Float32Array(MAX_AGENTS),
  velY: new Float32Array(MAX_AGENTS),
  targetX: new Int16Array(MAX_AGENTS),
  targetY: new Int16Array(MAX_AGENTS),
  state: new Uint8Array(MAX_AGENTS),
  wallet: new Int32Array(MAX_AGENTS),
  mood: new Uint8Array(MAX_AGENTS),
  spendTicks: new Uint16Array(MAX_AGENTS),
  ticksAlive: new Uint16Array(MAX_AGENTS),
  active: new Uint8Array(MAX_AGENTS),
  freelist: Array.from({ length: MAX_AGENTS }, (_, i) => MAX_AGENTS - 1 - i),
  spawnAccum: 0,
};

/** Public snapshot for the renderer (read-only contract). */
export function getCrowdState(): Readonly<State> {
  return state;
}

/** Reset all agents (used on new game / scene reset). */
export function resetCrowd(): void {
  state.count = 0;
  state.spawnAccum = 0;
  state.active.fill(0);
  state.freelist = Array.from({ length: MAX_AGENTS }, (_, i) => MAX_AGENTS - 1 - i);
}

/** Spawn one agent at a given grid position. Returns slot index, or -1 if at capacity. */
function spawnAt(x: number, y: number): number {
  const slot = state.freelist.pop();
  if (slot === undefined) return -1;
  state.active[slot] = 1;
  state.count += 1;
  state.posX[slot] = x;
  state.posY[slot] = y;
  state.velX[slot] = 0;
  state.velY[slot] = 0;
  state.targetX[slot] = Math.round(x);
  state.targetY[slot] = Math.round(y);
  state.state[slot] = AGENT_STATE.WANDERING;
  state.wallet[slot] = WALLET_MIN + Math.floor(Math.random() * (WALLET_MAX - WALLET_MIN));
  state.mood[slot] = 60 + Math.floor(Math.random() * 30);
  state.spendTicks[slot] = 0;
  state.ticksAlive[slot] = 0;
  return slot;
}

/** Despawn an agent slot, returning it to the freelist. */
function despawn(slot: number): void {
  if (!state.active[slot]) return;
  state.active[slot] = 0;
  state.count -= 1;
  state.freelist.push(slot);
}

/** Main tick. Called from the engine ticker. dtMS is the frame delta in milliseconds. */
export function tickCrowd(dtMS: number): void {
  const root = useGameStore.getState();
  const street = root.street;
  if (street.plots.length === 0) return;

  // dt as multiplier of a 60fps frame so movement feels right regardless of fps.
  const dt = dtMS / (1000 / 60);

  trySpawn(dt);
  updateAgents(dt);
}

/** Spawn budget rolls forward; the more buzz, the more visitors. */
function trySpawn(dt: number): void {
  const root = useGameStore.getState();
  const street = root.street;
  // Total positive buzz on the field — drives spawn rate.
  const field = street.buzzField;
  let totalBuzz = 0;
  for (let i = 0; i < field.length; i++) {
    const v = field[i];
    if (v > 0) totalBuzz += v;
  }
  if (totalBuzz < MIN_BUZZ_FOR_SPAWN) return;

  state.spawnAccum += SPAWN_BUDGET_PER_TICK * totalBuzz * dt;
  while (state.spawnAccum >= 1 && state.count < MAX_AGENTS) {
    state.spawnAccum -= 1;
    // Spawn at a random EDGE tile of the bounds (entering the street)
    const edge = pickEdgeTile();
    if (!edge) continue;
    spawnAt(edge.x, edge.y);
  }
  // Clamp accumulator so it can't blow up when at capacity
  if (state.count >= MAX_AGENTS) state.spawnAccum = 0;
}

/** Pick a random tile on the bounds perimeter that's also owned. */
function pickEdgeTile(): { x: number; y: number } | null {
  const street = useGameStore.getState().street;
  const owned = new Set(street.plots.map((p) => `${p.x},${p.y}`));
  const b = street.bounds;
  const candidates: Array<{ x: number; y: number }> = [];
  for (let x = b.minX; x <= b.maxX; x++) {
    if (owned.has(`${x},${b.minY}`)) candidates.push({ x, y: b.minY });
    if (owned.has(`${x},${b.maxY}`)) candidates.push({ x, y: b.maxY });
  }
  for (let y = b.minY; y <= b.maxY; y++) {
    if (owned.has(`${b.minX},${y}`)) candidates.push({ x: b.minX, y });
    if (owned.has(`${b.maxX},${y}`)) candidates.push({ x: b.maxX, y });
  }
  if (candidates.length === 0) return null;
  return candidates[Math.floor(Math.random() * candidates.length)];
}

/** Per-tick update for every active agent. */
function updateAgents(dt: number): void {
  const root = useGameStore.getState();
  const street = root.street;
  const addCash = root.addCash;
  const minX = street.bounds.minX;
  const minY = street.bounds.minY;
  const W = street.buzzFieldWidth;
  const H = street.buzzFieldHeight;
  const field = street.buzzField;

  // Pre-build a tile → finished-building lookup. Each tile of a finished building's
  // footprint maps to {kind, id}. Agents stepping onto these spend money.
  const buildingAt = new Map<string, { kind: string; id: string }>();
  for (const b of street.placedBuildings) {
    if (b.constructionDaysLeft > 0) continue;
    const def = BUILDING_DEFINITIONS[b.kind];
    for (let dy = 0; dy < def.footprint.height; dy++) {
      for (let dx = 0; dx < def.footprint.width; dx++) {
        buildingAt.set(`${b.position.x + dx},${b.position.y + dy}`, { kind: b.kind, id: b.id });
      }
    }
  }

  for (let i = 0; i < MAX_AGENTS; i++) {
    if (!state.active[i]) continue;
    state.ticksAlive[i] = Math.min(65000, state.ticksAlive[i] + Math.max(1, Math.round(dt)));

    const s = state.state[i];

    // --- SPENDING state: countdown then transition back to wandering ---
    if (s === AGENT_STATE.SPENDING) {
      state.spendTicks[i] -= Math.max(1, Math.round(dt));
      if (state.spendTicks[i] <= 0) {
        state.state[i] = state.wallet[i] < 100 ? AGENT_STATE.LEAVING : AGENT_STATE.WANDERING;
        state.spendTicks[i] = 0;
      }
      continue;
    }

    // --- LEAVING: head for nearest edge, ignore buzz ---
    if (s === AGENT_STATE.LEAVING) {
      // Just move toward outside of bounds — keep current direction
      stepAgent(i, dt);
      maybeDespawnAtEdge(i, street.bounds.minX, street.bounds.maxX, street.bounds.minY, street.bounds.maxY);
      continue;
    }

    // --- WANDERING: gradient ascent ---
    const cx = Math.round(state.posX[i]);
    const cy = Math.round(state.posY[i]);

    // If standing on a building tile, spend!
    const key = `${cx},${cy}`;
    const hit = buildingAt.get(key);
    if (hit) {
      const rev = SPEND_REVENUE[hit.kind] ?? 1;
      const spend = Math.min(state.wallet[i], rev * 100); // cents
      if (spend > 0) {
        state.wallet[i] -= spend;
        addCash(spend / 100, 'amenity', `${hit.kind} sale`);
        state.mood[i] = Math.min(MAX_MOOD, state.mood[i] + SPEND_MOOD_BUMP);
        state.spendTicks[i] = SPEND_TICKS[hit.kind] ?? 30;
        state.state[i] = AGENT_STATE.SPENDING;
        continue;
      }
    }

    // Lifetime / mood / wallet checks → leave
    if (
      state.wallet[i] < 100 ||
      state.mood[i] < MIN_MOOD ||
      state.ticksAlive[i] > LEAVE_TICKS
    ) {
      state.state[i] = AGENT_STATE.LEAVING;
      continue;
    }

    // Pick best neighbor by buzz (with small noise to break ties)
    const next = pickBuzzNeighbor(cx, cy, minX, minY, W, H, field);
    state.targetX[i] = next.x;
    state.targetY[i] = next.y;
    stepAgent(i, dt);
  }
}

function pickBuzzNeighbor(
  cx: number, cy: number,
  minX: number, minY: number, W: number, H: number,
  field: Float32Array,
): { x: number; y: number } {
  const NEIGHBORS = [
    [0, 0],   // standing still is also an option
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];
  let bestX = cx;
  let bestY = cy;
  let bestVal = -Infinity;
  for (const [dx, dy] of NEIGHBORS) {
    const nx = cx + dx;
    const ny = cy + dy;
    const ix = nx - minX;
    const iy = ny - minY;
    if (ix < 0 || ix >= W || iy < 0 || iy >= H) continue;
    const idx = ix + iy * W;
    const noise = (Math.random() - 0.5) * 0.4;
    const val = (field[idx] ?? 0) + noise;
    if (val > bestVal) {
      bestVal = val;
      bestX = nx;
      bestY = ny;
    }
  }
  return { x: bestX, y: bestY };
}

function stepAgent(i: number, dt: number): void {
  // Velocity toward target
  const tx = state.targetX[i];
  const ty = state.targetY[i];
  const dx = tx - state.posX[i];
  const dy = ty - state.posY[i];
  const dist = Math.hypot(dx, dy);
  let desiredVX = 0;
  let desiredVY = 0;
  if (dist > 0.01) {
    desiredVX = (dx / dist) * MOVE_SPEED;
    desiredVY = (dy / dist) * MOVE_SPEED;
  }
  // Smooth velocity toward desired
  state.velX[i] += (desiredVX - state.velX[i]) * VELOCITY_LERP;
  state.velY[i] += (desiredVY - state.velY[i]) * VELOCITY_LERP;
  state.posX[i] += state.velX[i] * dt;
  state.posY[i] += state.velY[i] * dt;
}

function maybeDespawnAtEdge(i: number, minX: number, maxX: number, minY: number, maxY: number): void {
  const x = state.posX[i];
  const y = state.posY[i];
  // Slightly outside bounds → gone
  if (x < minX - 0.5 || x > maxX + 0.5 || y < minY - 0.5 || y > maxY + 0.5) {
    despawn(i);
    return;
  }
  // Long-lifetime fallback despawn (keeps the field from leaking)
  if (state.ticksAlive[i] > LEAVE_TICKS * 2) {
    despawn(i);
  }
}
