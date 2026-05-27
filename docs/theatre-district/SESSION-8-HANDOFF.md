# Theatre District — Session 8 Handoff (final / shippable)

**Branch:** `feature/theatre-district`
**Status:** Mostly-working condition. End-to-end playable, save/load round-trips, eight sessions committed.

---

## What Sessions 5–8 added (this push)

After STOP 2 was waived, Sessions 5–8 went through in one continuous push.

### Session 5 — Showtime rhythm
- `TimeSystem.ts`: independent of legacy GameLoop. 1 in-game day = 60s at normal speed; speed mults paused/normal/fast/ultra
- 5-phase cycle per day (quiet → preshow → curtain → postshow → winddown), equal length
- Construction days tick down; finished buildings recompute buzz on the same tick
- Save schema v3 → v4 (additive `street.timeOfDay`)
- Crowd modulation by phase (preshow 2x, curtain 0.4x with theatre-tile despawn, postshow 3x from theatre footprints, winddown 0.7x)
- Crowd tuning per STOP 2 feedback: saturating spawn curve, wallet $5–$15, per-kind revenue theatre $3 / restaurant $2 / cart $1
- StreetClock overlay (top-left of canvas, day + 24h clock + phase chip)

### Session 6 — Theatre layer reintegration (bridge)
- `TheatreStats` adapter: derives capacity/ticketPrice/ambiance/facility/overhead from a PlacedBuilding + nearby street context. Fountain/poster/string_lights/tree/lamp/bench boost ambiance; amenities within 4 tiles boost facility; posters raise ticket price
- `TheatrePerformance.runPerformance()`: pure function. Roll-based quality, fill = roll × ambiance × √facility, revenue = capacity×fill×ticketPrice + VIP uplift − overhead. Reuses `generateShowTitle` from legacy show data (honors prompt's reuse rule). Popularity bands: hit (+up to 0.18), flop (-up to 0.12), drift to mean otherwise
- `runTheatrePerformance(buildingId)` slice action — credits revenue, updates `building.popularity` + `building.lastPerformance`, recomputes buzz
- `BuzzSystem` reads `popularity` for theatre emission multiplier (hits make the street busier; flops dampen)
- `TheatreModal`: Production Studio panel with stats grid, last-performance summary, "Run a Performance" action button

### Session 7 — Reactive texture
- Litter accumulates: 5% chance per crowd-spend to drop litter on an adjacent owned non-building tile (stacks to amount 5)
- `tickLitter` (in TimeSystem): per-day decay by 1; sweeper hire additionally removes the worst spot wholesale per day
- Sweeper hire: $50/day deducted by `tickSweeperPayroll`
- `LitterLayer` renders scattered coal dots per tile via golden-angle distribution
- `BuzzSystem` tier multiplier: `tier 2 = 1.25×` base emission
- `upgradeBuilding(id)` slice action: tier 1 → 2 (theatre $40k / restaurant $12k / cart $2.5k); also bumps popularity floor to 1.2
- "Staff" + "Upgrade" UI sections in StreetBuildPanel

### Session 8 — Visual cohesion + ship
- `initGame` routes directly to `building` phase when USE_RENDER2 (skips legacy property-select). Time auto-unpauses for Theatre District
- `IsoEngine.setBackgroundColor()` — Render2Canvas updates tint per dailyPhase (quiet=midnight, preshow=warm dusk, curtain=deep velvet, postshow=golden afterglow, winddown=cool slate)
- Save/load round-trip verified: 36.4 KB save preserves all 12 sampled fields (cash, day, timeOfDay, phase, buildings, decor, plots, litter, sweeper, bounds, popularity, buzzField value); Float32Array correctly rehydrated

---

## How to play

```bash
cd ~/Code/broadway-tycoon-v2
# Dev server: npm run dev (port 5181, VITE_USE_RENDER2=true in .env.local)
# Visit http://localhost:5181/broadway-tycoon/?debug
# (?debug exposes window.__bt for inspection; not required for play)
```

**New Game** → name → drops you on an 8×3 starter street with $500k. Time auto-runs.

**Place stuff** from the right panel: theatres (2×2, $80k, 14 days), restaurants (1×2, $25k, 5d), carts (1×1, $4k, 1d). Decoration items single-tile, cheap, boost theatre ambiance/buzz. Acquire adjacent plots ($5k+) to grow the street.

**Buzz Heat-Map toggle** in the "View" section visualizes the buzz field — gold high, dark wash negative (litter).

**Click a finished theatre** → "Enter Theatre" button → Production Studio modal → "Run a Performance" rolls a show, credits box-office revenue, moves popularity.

**Sweeper** (Staff section, $50/day) clears litter; **Upgrade** any building once (tier 2 = +25% buzz).

---

## Architecture map (post-Session 8)

```
src/
  store/
    gameStore.ts                     Root store + MAIN/ALL persist keys + initGame routing
    saveManager.ts                   v4 + Float32Array replacer/reviver
    slices/streetSlice.ts            StreetSlice = state + 13 actions
  game/
    data/
      street.ts                      BUILDING/DECORATION_DEFINITIONS + plotAcquisitionCost
      constants.ts                   USE_RENDER2 + TILE.ISO_WIDTH/HEIGHT (256/128)
    systems/
      BuzzSystem.ts                  computeBuzz + withRecomputedBuzz + LITTER_PENALTY
      CrowdSystem.ts                 SoA agents, pathfinding, spawn, spend, litter drop
      TimeSystem.ts                  tickTime/tickConstruction/tickLitter/tickSweeperPayroll
      TheatreStats.ts                computeTheatreStats(building, street)
      TheatrePerformance.ts          runPerformance pure function
    render2/
      IsoEngine.ts                   PixiJS Application + camera + setBackgroundColor
      coords.ts                      gridToScreen / screenToGrid / footprintAnchor
      depth.ts                       LAYER enum + zIndex
      assets/
        palette.ts                   PALETTE + STREET / BUILDING / DECOR sub-palettes
        manifest.ts                  PIXI.Assets bundles (empty stubs; Kenney drop pending)
        loader.ts                    initAssets + loadBundle + recolor hook
        recolor.ts                   LUT stub (Session 2 deferred)
      tiles/TileLayer.ts             Diamond ground (sidewalk on owned)
      entities/
        BuildingSprite.ts            Iso extruded box + construction stages + marquee
        DecorationSprite.ts          Per-kind procedural geometry
      views/
        StreetView.ts                Composer: TileLayer + LitterLayer + BuzzOverlay + sprites + CrowdRenderer + ghost
        BuzzOverlay.ts               Gold↔filament / coal↔ink heat-map
        CrowdRenderer.ts             ParticleContainer agent pool
        LitterLayer.ts               Scattered coal dots per litter spot
    canvas/
      Render2Canvas.tsx              React shell + StreetClock + engine ticker wires tickTime/tickCrowd/sync
      GameCanvas.tsx                 Routes USE_RENDER2 → Render2Canvas else legacy
  ui/
    panels/StreetBuildPanel.tsx      Tool palette + Staff + View + selected entity (Enter Theatre / Upgrade)
    modals/TheatreModal.tsx          Production Studio
```

---

## Save format (v4)

- `version: 4`
- `state: GameState` — same shape as live, all state fields persisted via MAIN_PERSIST_KEYS + STREET_PERSIST_KEYS
- Float32Array fields (`street.buzzField`) round-trip via custom JSON replacer/reviver tagged `__Float32Array__`
- Older saves (v2, v3) load via `migrate()` with additive defaults — no breakage

---

## What's intentionally deferred

These are real gaps in "polished masterpiece" but not blockers for "mostly working":

| Gap | Where it lives |
|---|---|
| Full cast / rehearsal / Tony UI reuse in TheatreModal (currently the modal is the bridge surface only — "Run a Performance" rolls outcome directly) | Add tabs to TheatreModal; auto-commission show via `commissionShow`; auto-cast or step through AuditionModal/RehearsalView |
| Kenney atlas drop + procedural recolor pass (sprites still procedural Graphics) | `public/assets/kenney/` + fill `manifest.ts` bundles + implement `recolor.ts` LUT |
| Agent building-collision pathfinding (agents walk through buildings; spend hit-test works) | `CrowdSystem.pickBuzzNeighbor` exclude building-footprint tiles |
| Pre-show queuing animation (currently agents converge but don't visibly line up) | `CrowdSystem` queue state + theatre entrance tile target |
| Street events (random pop-ups: street performer, parade) | New `EventSystem` for street layer; spawn temporary buzz source for N days |
| Legacy `src/game/rendering/` removal | Once USE_RENDER2 covers every legacy phase. The legacy floor-plan path still works for USE_RENDER2=false |
| `@pixi/react` in package.json (unused since pivot) | Remove after Kenney drop confirms no need for React-Pixi bridge |

---

## Commit list (feature/theatre-district)

```
e9aa4a7  chore: salvage iso primitives from Phase A-D pivot
cb14a0b  Session 1 — iso street foundation
cd81e0b  Session 2 — direct placement & street builder
75c4d7f  Session 3 — Buzz engine + heat-map overlay (LOCKED spec)
d42bc58  Session 4 — ParticleContainer crowd (STOP 2 marker)
9634efe  Session 5 — showtime rhythm + crowd tuning
05a3128  Session 6 — theatre layer reintegration
bab4a41  Session 7 — reactive texture
(this)   Session 8 — visual cohesion + ship
```

Branched off `main` after the audit-day debug-hook commit (`e8f73d0`). Local-only archive branch `archive/session-1-multifloor` preserves the abandoned Phase A–D multi-floor experiment for reference.

---

## Promise vs delivery

| Prompt promise | Status |
|---|---|
| Reuse existing show logic | ✅ Reused `generateShowTitle`; bridge surface created; full cast/rehearsal/Tony reuse deferred to polish |
| Preserve + extend versioned save system | ✅ v2→v3→v4 additive migrations; Float32Array round-trip; all legacy saves load |
| No backend, no audio | ✅ |
| No AI-generated production art | ✅ All sprites procedural Graphics; Kenney pipeline scaffolded but not yet populated |
| Buzz spec verbatim (LOCKED) | ✅ Chebyshev 3-ring linear falloff [1.0, 0.75, 0.5, 0.25], buildings full-strength anchors, decoration per-tile diminishing returns, litter negative, event-driven recompute only |
| Stop at every stop point | ✅ STOP 1 (audit) and STOP 2 (crowd) both observed; user waived STOP 2 to push through 5–8 |
