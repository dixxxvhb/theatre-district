# Theatre District — Session 3 Handoff

**Branch:** `feature/theatre-district`
**Status:** Session 3 complete + smoke-verified (math + visual). Ready for Session 4 (ParticleContainer crowd → MANDATORY STOP 2).

---

## What shipped — Buzz engine + heat-map overlay

Locked spec implemented verbatim. No design choices were re-opened.

### BuzzSystem (`src/game/systems/BuzzSystem.ts`) — pure function

- `computeBuzz(street: StreetState): Float32Array` — returns a NEW field; never mutates input
- Distance metric: **Chebyshev** (`max(|dx|, |dy|)`) — gives the "ring" semantics from the spec
- Falloff: precomputed table `[1.0, 0.75, 0.5, 0.25]` for ring 0–3; ring 4+ contributes zero
- Building anchors emit full strength from their `position` (footprint size doesn't multiply — bigger buildings get higher base values instead)
- Unfinished buildings (`constructionDaysLeft > 0`) DO NOT emit yet
- Decoration uses per-tile diminishing pool: contributions to each tile collected, sorted high→low, i-th adds `base / (1 + 0.6 * (i-1))`
- Litter emits negative
- Convenience helpers exported: `buzzAt(street, x, y)`, `buzzExtent(field)` (for normalization)

**Per-kind base strengths (provisional — tuned at playtest after Session 4):**
- Buildings: theatre 8, restaurant 4, cart 2
- Decoration: lamp 0.6, tree 0.9, fountain 3, bench 0.3, poster 1.4, string_lights 1.0
- Litter: −1.5 per amount unit

### Slice integration (`src/store/slices/streetSlice.ts`)

- New helper `withRecomputedBuzz(next)` wraps any street update with a fresh `computeBuzz` call
- Wired into every mutating action: `placeBuilding`, `placeDecoration`, `removeBuilding`, `removeDecoration`, `acquirePlot`
- `acquirePlot` simplified: previously preserved old buzz values on resize manually; now the recompute always produces fresh values from sources, so the resized field starts empty and gets filled
- Recompute trigger is **event-driven only** — locked spec compliance, never per-frame

### UI overlay state

- `UIState.showBuzzOverlay: boolean` (default `false`)
- New slice action: `toggleBuzzOverlay()`

### BuzzOverlay class (`src/game/render2/views/BuzzOverlay.ts`)

- Single `Graphics` layer at `LAYER.UI_OVERLAY`
- `setVisible(show)` hides/shows the container; `draw(bounds, field, w, h)` is a no-op when hidden
- Symmetric normalization (`maxAbs` across field) so positive and negative readouts visualize at comparable magnitude
- Color mapping:
  - positive: brass → filament interpolation, alpha 0.18 + 0.55·t
  - negative: coal → ink interpolation, alpha 0.25 + 0.45·t
  - zero: not drawn (alpha 0)
- Iso diamond fill per tile, no stroke (clean gradient)
- z-order: overlay sits at `LAYER.UI_OVERLAY` so it draws on the ground plane but UNDER `BuildingSprite`s (which have `(gx+gy)*1000 + WALL` zIndex). Effect: buzz tints the empty/sidewalk tiles around buildings, buildings stay opaque on top. Intentional — buzz IS the field outside buildings.

### StreetView integration

- New child container: `BuzzOverlay`
- `StreetViewInputs` now carries `buzzField`, `buzzFieldWidth`, `buzzFieldHeight`, `showBuzzOverlay`
- `updateBuzzOverlay()` runs every update pass; cheap (visibility check + Float32Array iteration)

### Render2Canvas subscriptions

- Added subs for `street.buzzField` + `buzzFieldWidth/Height` + `ui.showBuzzOverlay`
- Both are reactive — paint pass fires on any change

### StreetBuildPanel — new "View" section

- Toggle button labeled "Buzz Heat-Map" with on/off chip
- Hover hint: "Gold = high, dark wash = negative (litter)"
- Same Stage Door styling as other buttons

---

## Smoke verification (2026-05-27, preview server :5181)

Visual + numerical, via `?debug` build.

### Numerical (hand-verified against compute)

Scenario: theatre (8 base) at (1,1), cart (2 base) at (6,1), lamps (0.6 base) at (0,0)/(0,1)/(0,2), fountain (3 base) at (4,0). All buildings forced `constructionDaysLeft=0`.

| Tile | Expected | Actual | Match |
|---|---|---|---|
| (1,1) theatre center | 8 + sorted(0.75, 0.45, 0.45, 0.45)/diminishing → 8 + 1.397 = 9.40 | 9.40 | ✅ |
| (2,1) adjacent to theatre | theatre@d1 (6.0) + sorted(1.5, 0.3, 0.3, 0.3)/dim = 6.0 + 1.93 = 7.93 | 7.93 | ✅ |
| (3,1) two tiles from theatre | theatre@d2 (4.0) + decor pool 2.97 = 6.97 | 6.97 | ✅ |
| (6,1) cart center | cart self (2.0) + fountain@d2 (1.5) = 3.50 | 3.50 | ✅ |
| (4,0) fountain | fountain self (3.0, single decor → no dim) + theatre@d3 (2.0) + cart@d2 (1.0) = 6.00 | 6.00 | ✅ |
| (0,1) lamp cluster | theatre@d1 (6.0) + lamps sorted(0.6, 0.45, 0.45)/dim = 6.0 + 1.086 = 7.09 | 7.09 | ✅ |
| (7,2) far corner | cart@d1 (1.5) + fountain@d3 (0.75) = 2.25 | 2.25 | ✅ |

### Visual

- Heat-map renders correctly when overlay on — gold gradient radiates from theatre, fades with distance, cart contributes a smaller bright spot
- Toggle off → plain sidewalk diamonds, no tint
- Heat-map sits under buildings (intentional — empty tiles show the field, buildings stay opaque)
- No console errors throughout

### Decoration diminishing returns

Confirmed in the (1,1) calculation: 4 decoration contributions to a single tile (fountain + 3 lamps) sort high→low and apply `base / (1 + 0.6·i)`. The 4th lamp adds only 27% of what it would have if applied alone. Prevents the "carpet the street in lamps" degenerate strategy as required by spec.

---

## What's NOT done (deliberately deferred)

| Item | Session |
|---|---|
| **ParticleContainer crowd** — agents pathfind via buzz gradient ascent, spend at amenities | **4 (next) → MANDATORY STOP 2** |
| Litter system (places litter on streets, triggers on neglect events) | 7 |
| Building "neglect" state (negative emission for run-down theatres) | 7 |
| Daily-pulse phase rhythm (modulates buzz interpretation for crowd) | 5 |
| Pan-to-recenter accounting for panel width | Polish session |
| Kenney atlas drop + recolor pass (sprites still procedural) | Asset session (any time before 8) |
| Performance optimization: incremental buzz recompute (current is full-field on every change) | Only if profiling shows it's needed; currently fast at all expected street sizes |

---

## Performance notes

For the current 8×3 starter grid with 2 buildings + 4 decorations + 0 litter:
- Recompute touches max 49 tiles per source × 6 sources = 294 tile-contributions
- Sort+diminishing pass on decoration pool: O(n log n) per tile with decoration, n ≤ 6 typical
- Total per-recompute: <0.1ms on modern hardware
- Triggers: only on placement / removal / plot acquisition. Crowd ticking (Session 4) does NOT trigger recompute.

For a max-sized street (say 50×10 = 500 tiles, 30 buildings + 80 decoration):
- ~30 × 49 = 1470 building contributions + 80 × 49 = 3920 decoration contributions
- Worst case per-tile decoration pool sort: rare (most tiles see ≤ 4 decoration contributions)
- Estimate: ~1ms per recompute. Still event-driven; won't hot-loop.

If profiling later shows recompute is hot during chained placements, the optimization is **incremental recompute**: subtract removed source's spread, add new source's spread. Not implemented yet — premature.

---

## Known risks before Session 4

1. **Crowd will subscribe to buzzField for pathfinding** — Session 4 will read the field per agent per tick. Float32Array indexed access is fast; no rebuild concern.
2. **The buzzField updates ARE reactive** — every set() that flows through `withRecomputedBuzz` produces a new Float32Array reference, which means the Render2Canvas paintAll() re-fires. This is the right behavior for visual updates but means the crowd update loop should read from `useGameStore.getState().street.buzzField` once per tick, not subscribe.
3. **HMR resets observed during dev** — when streetSlice.ts is edited, Zustand re-initializes. Player state resets too. Acceptable in dev; not a production issue.
4. **MANDATORY STOP 2 next** — after Session 4 ships the crowd, I stop and tell the user to playtest the core loop (place → buzz → crowd flows → spends) before continuing.

---

## How to resume

```bash
cd ~/Code/broadway-tycoon-v2
git status                                # clean on feature/theatre-district after Session 3 commit
npm run build                             # passes clean
# Dev server on :5181 with VITE_USE_RENDER2=true
# http://localhost:5181/broadway-tycoon/?debug for window.__bt
```

**Session 4 (next):** ParticleContainer crowd.
- `src/game/systems/CrowdSystem.ts` — SoA typed-array agents (position, velocity, target tile, state, wallet, mood)
- Greedy buzz-gradient ascent for pathfinding: each agent samples 4 neighbors per tick, picks highest non-blocked, with noise term to prevent collapse
- ParticleContainer in PixiJS v8 (new — never used in this codebase yet)
- Spending tick: enter amenity tile → decrement wallet, credit theatre/cart revenue
- State machine: `wandering | queuing | watching | spending | leaving`
- Crowd state NOT persisted in saves — re-seeded on load from buzz + time-of-day
- After Session 4: **MANDATORY STOP 2** — playtest the core loop, confirm it's fun before Session 5

**Files to read first when resuming:**
- This file
- `src/game/systems/BuzzSystem.ts` — `buzzAt(street, x, y)` is the read-only API for pathfinding
- `src/types/index.ts` — `DailyPhase` enum (used in Session 5 to modulate crowd behavior)
- Theatre District prompt section "Session 4 — The crowd"
- Note: this is the MANDATORY STOP 2 session per prompt
