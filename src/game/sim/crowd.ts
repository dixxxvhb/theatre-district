// Crowd simulation — the street's visible life.
//
// ARCHITECTURE (rule #4): agents live HERE, outside the Zustand store, in
// structure-of-arrays typed arrays. They are never saved; they respawn from
// game state after load. The store only ever receives BATCHED effects
// (litter drops, amenity spending) and the UI reads throttled aggregates.
//
// Movement is lane-based steering along the sidewalks (NOT A* — it's a
// straight street): walk along your sidewalk toward a target column, cross
// the road only when your target is on the other side.

import { AMENITIES, CROWD, ISO, TIME } from '../config/balance';
import { dayPhase, isWeekend, type DayPhase } from './calendar';
import { getBuzzField } from './buzzCache';
import { gridToWorld } from '../render/iso';
import { sidewalkRowFor } from '../street/topology';
import { columnsForEra } from '../street/topology';
import { isTheatre } from '../street/buzz';
import { useTDStore } from '../../store/store';
import type { PlacedBuilding } from '../../types/td';

export const AgentState = {
  OFF: 0,
  WALKING: 1, // toward target column on own sidewalk
  CROSSING: 2, // crossing the road to the other sidewalk
  QUEUEING: 3, // lined up at a theatre
  WATCHING: 4, // inside (invisible)
  SPENDING: 5, // paused at an amenity
  PHOTO: 6, // paused, admiring
  LEAVING: 7, // heading to a street end
} as const;
export type AgentStateValue = (typeof AgentState)[keyof typeof AgentState];

export const Need = {
  SHOW: 0,
  FOOD: 1,
  DRINK: 2,
  SOUVENIR: 3,
  PHOTO: 4,
  REST: 5,
} as const;

const N = CROWD.MAX_AGENTS;

export class CrowdSim {
  // SoA agent storage.
  state = new Uint8Array(N);
  need = new Uint8Array(N);
  posX = new Float32Array(N);
  posY = new Float32Array(N);
  side = new Uint8Array(N); // 0 north sidewalk, 1 south
  targetCol = new Int16Array(N);
  targetId: Array<string | null> = new Array(N).fill(null);
  lane = new Float32Array(N); // per-agent lane offset within the sidewalk
  timer = new Int16Array(N);
  wallet = new Float32Array(N);
  satisfied = new Uint8Array(N); // 1 after a good show — feeds momentum
  bobPhase = new Float32Array(N);

  /** Batched effects, flushed periodically / at phase beats. */
  pendingLitter: Array<{ x: number; y: number }> = [];
  amenityTakings = 0;
  /** Per-theatre queue membership, rebuilt as agents arrive. */
  queues = new Map<string, number[]>();
  /** Stats for the showtime resolution + dev meters. */
  deniedAtDoor = 0;

  private ticksSinceLitterFlush = 0;
  private rng = 1234567;

  private random(): number {
    // xorshift — deterministic enough for a cozy crowd, no Math.random in sim.
    this.rng ^= this.rng << 13;
    this.rng ^= this.rng >>> 17;
    this.rng ^= this.rng << 5;
    return ((this.rng >>> 0) % 100000) / 100000;
  }

  reset(): void {
    this.state.fill(AgentState.OFF);
    this.pendingLitter = [];
    this.amenityTakings = 0;
    this.queues.clear();
    this.deniedAtDoor = 0;
  }

  count(): number {
    let c = 0;
    for (let i = 0; i < N; i++) if (this.state[i] !== AgentState.OFF && this.state[i] !== AgentState.WATCHING) c++;
    return c;
  }

  /** One fixed sim tick. */
  tick(): void {
    const s = useTDStore.getState();
    if (!s.initialized) return;
    const phase = dayPhase(s.time.tickOfDay);
    const cols = columnsForEra(s.street.era);

    this.spawn(s, phase, cols);

    for (let i = 0; i < N; i++) {
      switch (this.state[i]) {
        case AgentState.WALKING:
          this.tickWalk(i, s, phase, cols);
          break;
        case AgentState.CROSSING:
          this.tickCross(i);
          break;
        case AgentState.SPENDING:
        case AgentState.PHOTO:
          if (--this.timer[i] <= 0) this.afterPause(i, s, phase, cols);
          break;
        case AgentState.LEAVING:
          this.tickLeave(i, cols);
          break;
        // QUEUEING and WATCHING hold position until showtime resolves them.
      }
    }

    if (++this.ticksSinceLitterFlush >= CROWD.LITTER_FLUSH_TICKS) {
      this.ticksSinceLitterFlush = 0;
      if (this.pendingLitter.length > 0) {
        s.addLitter(this.pendingLitter);
        this.pendingLitter = [];
      }
    }
  }

  /** Dev panel: a burst of arrivals. */
  surge(count: number): void {
    const s = useTDStore.getState();
    const cols = columnsForEra(s.street.era);
    for (let i = 0; i < count; i++) this.spawnOne(s, cols);
  }

  // --- showtime hooks (called by the runtime at phase edges) ---------------------

  /** Curtain: queued agents enter (up to capacity); the rest are turned away. */
  admit(theatreId: string, capacity: number): { admitted: number; turnedAway: number } {
    const queue = this.queues.get(theatreId) ?? [];
    let admitted = 0;
    let turnedAway = 0;
    for (const i of queue) {
      if (this.state[i] !== AgentState.QUEUEING) continue;
      if (admitted < capacity) {
        this.state[i] = AgentState.WATCHING;
        this.targetId[i] = theatreId;
        admitted++;
      } else {
        turnedAway++;
        this.deniedAtDoor++;
        this.need[i] = this.random() < 0.5 ? Need.FOOD : Need.REST;
        this.state[i] = AgentState.WALKING;
        this.retarget(i, useTDStore.getState(), 'quiet', columnsForEra(useTDStore.getState().street.era));
      }
    }
    this.queues.set(theatreId, []);
    return { admitted, turnedAway };
  }

  /** Post-show: the audience floods back out hungry and thirsty. */
  release(theatreId: string, doorX: number, side: 'north' | 'south', goodShow: boolean): number {
    let released = 0;
    const y = sidewalkRowFor(side);
    for (let i = 0; i < N; i++) {
      if (this.state[i] !== AgentState.WATCHING || this.targetId[i] !== theatreId) continue;
      const { wx, wy } = gridToWorld(doorX, y);
      this.posX[i] = wx + (this.random() - 0.5) * 40;
      this.posY[i] = wy + this.lane[i];
      this.side[i] = side === 'north' ? 0 : 1;
      this.satisfied[i] = goodShow ? 1 : 0;
      this.need[i] = this.random() < 0.55 ? Need.FOOD : this.random() < 0.5 ? Need.DRINK : Need.REST;
      this.state[i] = AgentState.WALKING;
      this.targetId[i] = null;
      this.retarget(i, useTDStore.getState(), 'postshow', columnsForEra(useTDStore.getState().street.era));
      if (this.random() < CROWD.LITTER_CHANCE) this.pendingLitter.push({ x: doorX, y });
      released++;
    }
    return released;
  }

  /** Wind-down: everyone still outside starts heading home. */
  lastCall(): void {
    for (let i = 0; i < N; i++) {
      if (this.state[i] === AgentState.WALKING || this.state[i] === AgentState.QUEUEING) {
        this.state[i] = AgentState.LEAVING;
      }
    }
    this.queues.clear();
  }

  /** Flush the night's amenity takings (returns and resets the pot). */
  collectTakings(): number {
    const t = this.amenityTakings;
    this.amenityTakings = 0;
    return Math.round(t);
  }

  // --- internals -------------------------------------------------------------------

  private spawn(s: ReturnType<typeof useTDStore.getState>, phase: DayPhase, cols: number): void {
    const { field } = getBuzzField(s.street, s.upkeep);
    let appeal = 0;
    for (let i = 0; i < field.length; i++) if (field[i] > 0) appeal += field[i];
    appeal = Math.sqrt(appeal); // diminishing street-level returns

    const weekend = isWeekend(s.time.day) ? CROWD.WEEKEND_SPAWN_MULT : 1;
    const eventMod = s.dayMods && s.dayMods.untilDay >= s.time.day ? s.dayMods.spawnMult : 1;
    const expected = appeal * CROWD.SPAWN_PER_APPEAL * CROWD.PHASE_SPAWN[phase] * weekend * eventMod;
    let spawns = Math.floor(expected);
    if (this.random() < expected - spawns) spawns++;
    spawns = Math.min(spawns, CROWD.SPAWN_MAX_PER_TICK);
    for (let i = 0; i < spawns; i++) this.spawnOne(s, cols);
  }

  private spawnOne(s: ReturnType<typeof useTDStore.getState>, cols: number): void {
    const i = this.state.indexOf(AgentState.OFF);
    if (i === -1) return;
    const side = this.random() < 0.5 ? 0 : 1;
    const fromWest = this.random() < 0.5;
    const y = sidewalkRowFor(side === 0 ? 'north' : 'south');
    const { wx, wy } = gridToWorld(fromWest ? 0 : cols - 1, y);
    this.state[i] = AgentState.WALKING;
    this.side[i] = side;
    this.lane[i] = (this.random() - 0.5) * 2 * CROWD.LANE_SPREAD;
    this.posX[i] = wx;
    this.posY[i] = wy + this.lane[i];
    this.wallet[i] = CROWD.WALLET[0] + this.random() * (CROWD.WALLET[1] - CROWD.WALLET[0]);
    this.satisfied[i] = 0;
    this.bobPhase[i] = this.random() * Math.PI * 2;
    const phase = dayPhase(s.time.tickOfDay);
    this.need[i] =
      phase === 'preshow' && this.random() < 0.7
        ? Need.SHOW
        : ([Need.FOOD, Need.DRINK, Need.PHOTO, Need.SOUVENIR] as const)[Math.floor(this.random() * 4)];
    this.retarget(i, s, phase, cols);
  }

  /** Choose a destination serving the agent's need; fall back to strolling. */
  private retarget(i: number, s: ReturnType<typeof useTDStore.getState>, phase: DayPhase, cols: number): void {
    const target = this.findTarget(i, s, phase);
    if (target) {
      this.targetId[i] = target.id;
      this.targetCol[i] = target.doorX;
      const targetSide = target.side === 'north' ? 0 : 1;
      if (targetSide !== this.side[i]) {
        // Walk to the door column first, cross there (handled on arrival).
      }
      return;
    }
    // Stroll toward a random column; leave if bored (small chance).
    this.targetId[i] = null;
    if (this.random() < 0.18) {
      this.state[i] = AgentState.LEAVING;
      return;
    }
    this.targetCol[i] = Math.floor(this.random() * cols);
  }

  private findTarget(
    i: number,
    s: ReturnType<typeof useTDStore.getState>,
    phase: DayPhase,
  ): { id: string; doorX: number; side: 'north' | 'south' } | null {
    const operational = (b: PlacedBuilding) => b.constructionDaysLeft === 0 && b.condition >= 0.4;
    const doorOf = (b: PlacedBuilding) => b.x + Math.floor(this.widthOf(b) / 2);

    if (this.need[i] === Need.SHOW && (phase === 'preshow' || phase === 'quiet')) {
      // Only theatres with a show actually on tonight draw a queue.
      const theatres = s.street.buildings.filter(
        (b) => isTheatre(b.kind) && operational(b) && s.productions[b.id]?.stage === 'running',
      );
      if (theatres.length > 0) {
        const t = theatres[Math.floor(this.random() * theatres.length)];
        return { id: t.id, doorX: doorOf(t), side: t.side };
      }
      return null;
    }
    const amenityKinds: Record<number, string[]> = {
      [Need.FOOD]: ['restaurant', 'food_cart', 'cafe'],
      [Need.DRINK]: ['bar', 'late_lounge', 'cafe'],
      [Need.SOUVENIR]: ['gift_shop', 'newsstand'],
    };
    const kinds = amenityKinds[this.need[i]];
    if (kinds) {
      const options = s.street.buildings.filter((b) => kinds.includes(b.kind) && operational(b));
      if (options.length > 0) {
        const a = options[Math.floor(this.random() * options.length)];
        return { id: a.id, doorX: doorOf(a), side: a.side };
      }
    }
    return null; // PHOTO/REST and unmet needs stroll
  }

  private widthOf(b: PlacedBuilding): number {
    return isTheatre(b.kind) ? (b.kind === 'theatre_grand' ? 6 : b.kind === 'theatre_midhouse' ? 4 : 3)
      : AMENITIES[b.kind as keyof typeof AMENITIES].width;
  }

  private tickWalk(i: number, s: ReturnType<typeof useTDStore.getState>, phase: DayPhase, cols: number): void {
    const y = sidewalkRowFor(this.side[i] === 0 ? 'north' : 'south');
    const target = gridToWorld(this.targetCol[i], y);
    const dx = target.wx - this.posX[i];

    if (Math.abs(dx) > CROWD.WALK_SPEED) {
      this.posX[i] += Math.sign(dx) * CROWD.WALK_SPEED;
      this.posY[i] = rowY(this.posX[i], y) + this.lane[i];
      return;
    }

    // Arrived at the target column.
    const tid = this.targetId[i];
    if (!tid) {
      // Strolling arrival: maybe pause for a photo, then re-target.
      if (this.need[i] === Need.PHOTO && this.random() < 0.5) {
        this.state[i] = AgentState.PHOTO;
        this.timer[i] = CROWD.PHOTO_TICKS[0] + Math.floor(this.random() * (CROWD.PHOTO_TICKS[1] - CROWD.PHOTO_TICKS[0]));
        return;
      }
      this.retarget(i, s, phase, cols);
      return;
    }
    const b = s.street.buildings.find((bb) => bb.id === tid);
    if (!b || b.constructionDaysLeft > 0 || b.condition < 0.4) {
      this.targetId[i] = null;
      this.retarget(i, s, phase, cols);
      return;
    }
    const targetSide = b.side === 'north' ? 0 : 1;
    if (targetSide !== this.side[i]) {
      this.state[i] = AgentState.CROSSING;
      return;
    }
    if (isTheatre(b.kind)) {
      this.state[i] = AgentState.QUEUEING;
      const queue = this.queues.get(tid) ?? [];
      queue.push(i);
      this.queues.set(tid, queue);
      // Line up west of the door, spaced along the sidewalk.
      const slot = queue.length - 1;
      const qPos = gridToWorld(this.targetCol[i], y);
      this.posX[i] = qPos.wx - 14 - slot * 13;
      this.posY[i] = rowY(this.posX[i], y) + this.lane[i] * 0.3;
    } else {
      this.state[i] = AgentState.SPENDING;
      this.timer[i] = CROWD.SPEND_TICKS[0] + Math.floor(this.random() * (CROWD.SPEND_TICKS[1] - CROWD.SPEND_TICKS[0]));
    }
  }

  private tickCross(i: number): void {
    const toSide = this.side[i] === 0 ? 1 : 0;
    const y = sidewalkRowFor(toSide === 0 ? 'north' : 'south');
    const targetY = rowY(this.posX[i], y) + this.lane[i];
    const dy = targetY - this.posY[i];
    if (Math.abs(dy) > CROWD.WALK_SPEED * 0.8) {
      this.posY[i] += Math.sign(dy) * CROWD.WALK_SPEED * 0.8;
      return;
    }
    this.side[i] = toSide;
    this.state[i] = AgentState.WALKING;
  }

  private tickLeave(i: number, cols: number): void {
    const y = sidewalkRowFor(this.side[i] === 0 ? 'north' : 'south');
    const exitCol = this.posX[i] < gridToWorld(Math.floor(cols / 2), y).wx ? 0 : cols - 1;
    const target = gridToWorld(exitCol, y);
    const dx = target.wx - this.posX[i];
    if (Math.abs(dx) > CROWD.WALK_SPEED) {
      this.posX[i] += Math.sign(dx) * CROWD.WALK_SPEED;
      this.posY[i] = rowY(this.posX[i], y) + this.lane[i];
      return;
    }
    this.state[i] = AgentState.OFF;
  }

  private afterPause(i: number, s: ReturnType<typeof useTDStore.getState>, phase: DayPhase, cols: number): void {
    if (this.state[i] === AgentState.SPENDING) {
      const spend = Math.min(
        this.wallet[i],
        CROWD.AMENITY_SPEND[0] + this.random() * (CROWD.AMENITY_SPEND[1] - CROWD.AMENITY_SPEND[0]),
      );
      this.wallet[i] -= spend;
      this.amenityTakings += spend;
      if (this.random() < CROWD.LITTER_CHANCE) {
        const y = sidewalkRowFor(this.side[i] === 0 ? 'north' : 'south');
        this.pendingLitter.push({ x: this.targetCol[i], y });
      }
    }
    this.targetId[i] = null;
    this.need[i] = this.wallet[i] < 8 ? Need.REST : ([Need.PHOTO, Need.REST, Need.FOOD, Need.DRINK] as const)[Math.floor(this.random() * 4)];
    if (this.need[i] === Need.REST && this.random() < 0.6) {
      this.state[i] = AgentState.LEAVING;
      return;
    }
    this.state[i] = AgentState.WALKING;
    this.retarget(i, s, phase, cols);
  }

}

/** World-space wy of grid row `y` at horizontal position wx — the iso lane.
 *  From gridToWorld: wy = (gx + y)·HH with wx = (gx − y)·HW
 *  ⇒ wy = wx·(HH/HW) + 2y·HH. */
export function rowY(wx: number, y: number): number {
  return wx * (ISO.TILE_HEIGHT / ISO.TILE_WIDTH) + 2 * y * (ISO.TILE_HEIGHT / 2);
}

export const crowd = new CrowdSim();

// Tick-of-day fraction helper for spawn/need decisions elsewhere.
export function timeFraction(tickOfDay: number): number {
  return tickOfDay / TIME.TICKS_PER_DAY;
}
