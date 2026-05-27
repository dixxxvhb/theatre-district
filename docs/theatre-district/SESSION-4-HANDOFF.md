# Theatre District — Session 4 Handoff

**Branch:** `feature/theatre-district`
**Status:** Session 4 complete + smoke-verified.
**🛑 MANDATORY STOP 2 reached. Awaiting user playtest before Session 5.**

---

## What shipped — the crowd

### CrowdSystem (`src/game/systems/CrowdSystem.ts`) — singleton outside Zustand

Lives outside the store because:
1. Crowd state isn't persisted in saves (re-seeded on load from buzz + time)
2. Updates 60×/sec; a store `set()` per tick would thrash subscribers

**SoA layout** — typed arrays sized to `MAX_AGENTS = 300`:
- `posX/posY` (Float32) — fractional grid coords for smooth motion
- `velX/velY` (Float32) — per-tick velocity, lerped toward desired
- `targetX/targetY` (Int16) — current target tile
- `state` (Uint8) — `WANDERING | SPENDING | LEAVING`
- `wallet` (Int32, cents) — no float drift on money
- `mood` (Uint8, 0–100) — boosted on spend; floor triggers leave
- `spendTicks` (Uint16) — countdown in SPENDING state
- `ticksAlive` (Uint16) — soft lifetime cap
- `active` (Uint8) — slot occupancy bit; freelist tracks inactive slots for O(1) spawn/despawn

**Pathfinding:** buzz-gradient ascent. Each tick, agent samples current tile + 4 neighbors from `street.buzzField`. Picks highest (with small noise term to prevent collapse). Greedy, not A* — sufficient for a city street.

**Spawn:** rate proportional to total positive buzz; spawn budget accumulator rolls forward. Spawns at random owned EDGE tile (so agents appear walking into the street, not in the middle). Capped at 300.

**Spending:** when an agent's current tile holds a finished building, agent transitions to SPENDING:
- Deducts cents from wallet
- Credits revenue via root `addCash('amenity', '${kind} sale')`
- Bumps mood
- Locks in SPENDING state for N ticks (theatre 90, restaurant 45, cart 20)
- Returns to WANDERING (or LEAVING if wallet near-empty)

**Despawn:**
- LEAVING agent off bounds → gone
- Soft lifetime cap (~10s) → gone

### CrowdRenderer (`src/game/render2/views/CrowdRenderer.ts`) — PixiJS v8 ParticleContainer

First use of `ParticleContainer` + `Particle` in the codebase.

- Pre-allocates `MAX_AGENTS` Particles up front. All start parked off-screen with `alpha: 0`.
- Tiny 4×4 white circle texture generated via `app.renderer.generateTexture` (procedural, no asset file).
- `sync()` called per frame from engine ticker:
  - Walks `getCrowdState()` typed arrays
  - For active slots: maps `(gx, gy)` → iso screen `((gx-gy)*halfW, (gx+gy)*halfH)`, lifts y by 8px so agents read above the ground plane
  - Tint per state: WANDERING `ivory`, SPENDING `PALETTE.filament` (gold), LEAVING `PALETTE.dust`
- `dynamicProperties: { position: true, scale: false, color: true }` — minimal dynamic bits for max throughput
- No per-frame allocation. The whole sync is `MAX_AGENTS * O(1)` work.

### Integration
- `StreetView` composes `CrowdRenderer` as a child
- `Render2Canvas` onTick callback (already wired from engine ticker) calls `tickCrowd(dtMS)` + `streetView.crowdRenderer.sync()`
- `resetCrowd()` fires on canvas mount so a fresh game starts with an empty crowd

---

## Smoke verification (2026-05-27, preview server :5181)

Scenario: theatre at (1,1) + cart at (6,1) + lamp at (0,0), all finished. Camera zoomed out.

| Check | Result |
|---|---|
| Build clean (`npm run build`) | ✅ |
| Page reloads cleanly, no init errors | ✅ |
| Agents spawn within a second of buildings going up | ✅ visible stream of pale dots from upper-left edge |
| Agents walk toward buildings (gradient ascent) | ✅ diagonal flow toward theatre cluster |
| Agents enter SPENDING state at building tiles | ✅ tint changes to gold on contact |
| Revenue flows back to economy.cash | ✅ $13,963 theatre + $4,706 cart in test window |
| 5,401 amenity transactions logged | ✅ |
| Zero console errors throughout | ✅ |
| ParticleContainer renders without per-frame allocation | ✅ |

---

## 🛑 MANDATORY STOP 2 — what I need from you

The core loop (**place → buzz → crowd flows → spends**) is now playable end-to-end. Per the prompt, I'm stopping here before Session 5 so you can playtest and confirm it's fun.

**What to try in your own session:**

1. `cd ~/Code/broadway-tycoon-v2 && npm run dev` (or use the existing :5181 server)
2. Visit `http://localhost:5181/broadway-tycoon/?debug` (the `?debug` exposes `window.__bt` for inspection if you want it)
3. New Game → name it → Build (skip the legacy property-select for now; the new Theatre District flow starts at the build phase)
4. Place a theatre, a restaurant, a cart, some lamps + trees. Toggle the **Buzz Heat-Map** on (View section) to see the buzz field.
5. Watch the crowd. Do they go where you expect? Does revenue feel right? Does placing a fountain change crowd flow visibly?
6. Try the "Acquire Plot" mode — click an adjacent unowned tile.

**Specific tuning concerns I've already noticed (eyeball these and tell me):**

- **Spawn rate feels brisk.** With ~96 total buzz, we got ~173 spawns/sec at the cap. 5,400 transactions in <30 seconds = $18.7k revenue. Easy money may break difficulty curve.
- **Wallet bounds $10–$30** + ~$2–5 per spend → 3–10 spends per agent. May be too generous given spawn rate.
- **Per-amenity revenue tiers** (theatre $5, restaurant $3, cart $2) — does theatre feel undervalued vs its $80k cost?
- **Agent movement speed** (`MOVE_SPEED = 0.025` grid tiles per 60fps frame) — too slow / fast?
- **Building-blocking:** agents can walk THROUGH buildings right now (the spend tile transition happens but they don't path around). Worth flagging — easy fix in Session 5.

**Other open questions for you:**
- Is the visual fidelity of placeholder sprites acceptable for further playtest? Or should we drop the Kenney assets in before going further?
- Are the building/decoration costs reasonable? (Theatre $80k, restaurant $25k, cart $4k, fountain $6k, lamp $600, etc.)
- Does the heat-map color scheme read right? (Gold = high, dark = low.)

**Do not assume my next instructions.** Tell me to proceed (or pivot, or tune, or rip something out) and I'll act.

---

## What's NOT done (intentionally — deferred to later sessions)

| Item | Session |
|---|---|
| Daily-pulse phase rhythm (quiet → preshow queue → curtain lull → postshow rush → wind-down) | 5 |
| Agent queuing behavior at theatre doors during pre-show / post-show | 5 |
| Reintegrate Theatre layer (cast / rehearsal / events / Tony as click-into modal) | 6 |
| `PerformanceSystem` input refactor (`rooms[]` → `TheatreStats` blob) | 6 |
| Hit / flop performance → drive crowd intensity around that theatre | 6 |
| Litter system, staff (sweeper/greeter), amenity upgrades, street events | 7 |
| Kenney atlas drop + procedural recolor pass | Anytime before 8 |
| Visual cohesion pass (palette enforcement, lighting, UI restyle) | 8 |
| Building-collision pathfinding (agents currently walk through buildings) | After playtest decides whether it matters |
| Thought bubbles over agents | Polish |
| Construction days actually tick down (currently a placed building stays "X days left" forever until forced finished) | Session 6 gameLoop refactor |

---

## Known risks before Session 5

1. **Game time doesn't advance yet.** `currentDay` doesn't increment unless the legacy `time` tick fires, and that only fires under the legacy `running` phase which Theatre District doesn't enter. Building construction days never decrement → buildings stay in `foundation` stage indefinitely unless force-set. **This is the FIRST thing to fix in Session 5** alongside the daily-pulse work — they're the same plumbing.
2. **Spawn rate not buzz-cap-aware.** If buzz keeps growing, spawn rate keeps growing. Real fix is logarithmic or saturating, not strictly linear. Will address in Session 5 tuning pass.
3. **Crowd state lives outside store → save/load doesn't reset it.** `resetCrowd()` is wired on Render2Canvas mount, but if the user saves mid-busy-street, loads, and the canvas doesn't remount, old agents could leak. Edge case; add an explicit reset on game load.
4. **Agents walk through buildings.** Hit-test triggers spending, but movement doesn't path around occupied tiles. Pretty visually obvious. Easy fix when needed.
5. **`@pixi/react` is still in package.json.** Still unused.

---

## Files touched (Session 4)

**New (2):**
- `src/game/systems/CrowdSystem.ts`
- `src/game/render2/views/CrowdRenderer.ts`

**Modified (3):**
- `src/game/canvas/Render2Canvas.tsx` — wires tickCrowd + crowdRenderer.init/sync into the engine ticker
- `src/game/render2/views/StreetView.ts` — composes CrowdRenderer
- `docs/theatre-district/SESSION-4-HANDOFF.md` (this)
- `CLAUDE.md` — session log + plan checkbox

---

## How to resume after playtest

Once you give the go-ahead, Session 5 starts here:

**Session 5 — Showtime rhythm:**
- Wire game time advance into the Theatre District flow (currently stuck at day 1)
- Define `DailyPhase` transitions (already typed: `'quiet' | 'preshow' | 'curtain' | 'postshow' | 'winddown'`)
- Modulate `CrowdSystem` spawn rate + target preference per phase
- Pre-show: agents queue up at theatre entrance tiles
- Curtain lull: spawn rate dips; queued agents enter (despawn into theatre)
- Post-show: spike spawn out from theatres; amenities near theatre exits get a rush
- Wind-down: cool back to quiet
- UI: small clock / phase indicator on the canvas

**Files to read first when resuming:**
- This file
- `src/game/systems/CrowdSystem.ts` — spawn/spend tuning lives here
- `src/types/index.ts` — `DailyPhase` enum
- `src/game/engine/GameLoop.ts` — the legacy ticker; where day advance lives
