# Theatre District — Session 2 Handoff

**Branch:** `feature/theatre-district`
**Status:** Session 2 complete + smoke-verified. Ready for Session 3 (Buzz engine).

---

## What shipped

### Definitions (`src/game/data/street.ts`)
- `BUILDING_DEFINITIONS` for theatre / restaurant / cart (cost, footprint, build days, label, description, isTheatre flag)
- `DECORATION_DEFINITIONS` for lamp / tree / fountain / bench / poster / string_lights (cost, label, description)
- `plotAcquisitionCost(count)` — starting 24 plots free, additional plots $5k+$500 per plot beyond starter

Balance is provisional. Real tuning after the playtest stop at end of Session 4.

### Slice actions (`src/store/slices/streetSlice.ts`)
- `placeBuilding(kind, position, day)` — validates bounds + ownership + no-overlap + can-afford; deducts cost via root `removeCash`. Returns `PlacementResult` (`{ok:true}` | `{ok:false, reason:string}`).
- `placeDecoration(kind, position, day)` — single-tile validation, same shape.
- `removeBuilding(id)` / `removeDecoration(id)` — no refund.
- `acquirePlot(x, y, day)` — now enforces N/S/E/W adjacency to existing owned plot + deducts plot cost. Float32Array buzz field resizes in-place preserving existing values.
- `setStreetTool(tool)` / `selectStreetEntity(id)` — drive the placement UI; setting one clears the other.

Pattern note: streetSlice imports `GameActions` from `gameStore` (now exported) to type-check root-store access like `s.removeCash`. Future slices follow the same shape.

### Sprites
- `src/game/render2/entities/BuildingSprite.ts` — iso-extruded box with foundation/framed/finished construction stages derived from `constructionDaysLeft`. Per-kind heights (theatre 180, restaurant 110, cart 70). Finished theatre gets a brass marquee strip. Walls use `BUILDING_PALETTE[kind].wall`, right wall light, left wall computed shadow blend with `PALETTE.coal`.
- `src/game/render2/entities/DecorationSprite.ts` — per-kind procedural geometry: lamp (pole + glow), tree (trunk + stacked diamond canopy), fountain (basin + spout), bench (top plank + back + legs), poster (board on stake), string_lights (slung bulb line with sag math). All read from `DECOR_PALETTE`.

### StreetView composer (`src/game/render2/views/StreetView.ts`)
- Owns `TileLayer` + `Map<id, BuildingSprite>` + `Map<id, DecorationSprite>` + ghost graphics
- `update(inputs)` runs the additive sprite diff: for each item, update if present else create + add to container; remove sprites whose id no longer exists in inputs
- `setGhost(state)` for per-tick ghost redraw without re-running the full diff
- `setHover(tile)` for per-tick hover redraw
- Ghost color: green (valid) / red (invalid), footprint-aware

### Render2Canvas rewrite (`src/game/canvas/Render2Canvas.tsx`)
- Thin React shell. Subscribes to street state, owns pointer events.
- Per-tick: `setHover` + `setGhost` from current hover + selected tool
- `paintAll()` triggers on state changes
- Click handler dispatches: place (if building tool), place decoration, acquire (if acquire mode), or select an entity at the clicked tile, or fall through to legacy `selectTile`
- All placement validation runs inside `streetSlice` actions (single source of truth). UI helpers (`canPlaceBuildingHere`, etc.) only drive the ghost color.

### Tool state on UIState (`src/types/index.ts`)
- `streetTool: StreetTool | null` — flat union of `BuildingKind | DecorationKind | 'acquire'`
- `streetSelectedId: string | null` — selected placed building/decoration id
- Both seeded `null` in initial UI state

### StreetBuildPanel (`src/ui/panels/StreetBuildPanel.tsx`)
- Replaces the legacy `BuildPanel` when `USE_RENDER2` is on (gated in `App.tsx`)
- Sections: Buildings / Decoration / Expand Street
- Each tool button: title + footprint/duration subtitle + price + hover hint; disabled state if not affordable; active state if tool is selected; toggle-on-second-click
- "Selected" panel appears when an entity is selected: shows label + construction status + Demolish/Remove button (no refund)
- Top header: panel title, cash, plot/building/decor counts
- Active tool banner: "Placing: X" / "Acquire mode" with Cancel button

---

## Smoke verification (2026-05-27, preview server :5181)

Via `?debug` build + `window.__bt` store access:

| Check | Result |
|---|---|
| Reload + initGame + setPhase('building') → StreetBuildPanel renders | ✅ |
| Cash header reads correctly | ✅ $500k |
| All 3 building entries + 6 decoration entries present | ✅ |
| `placeBuilding('theatre', {1,0}, 1)` | ✅ ok:true |
| `placeBuilding('restaurant', {4,0}, 1)` | ✅ ok:true |
| `placeBuilding('cart', {6,0}, 1)` | ✅ ok:true |
| 6 decoration items placed on row y=2 | ✅ all ok:true |
| Overlap rejection: place theatre on existing theatre tile | ✅ ok:false, reason "Tile occupied" |
| `acquirePlot(8, 1, 1)` (adjacent) | ✅ ok:true; bounds expanded to {0..8, 0..2}; buzz field resized to 9×3 |
| Cash math: $500k - $80k - $25k - $4k - $600 - $800 - $6k - $300 - $1.5k - $1.2k - $5k = $375.6k | ✅ exact |
| Construction stages render: theatre forced to finished (heights & marquee), restaurant to framed (hatch lines visible), cart still foundation | ✅ visible in screenshot |
| Zero console errors throughout | ✅ |
| StreetBuildPanel header counter updates (25 plots / 3 buildings / 6 decor) | ✅ |
| Acquire Plot button price updates ($5,000 → $5,500 after acquisition) | ✅ |

**Visual artifacts to ignore for now (Session 3+ work):**
- Canvas centerOnGrid puts world center under the panel; user can pan to see — workaround documented for Session 3 (recenter with panel-aware offset)
- No pointer-click smoke test performed; only programmatic action smoke. Visual proof via screenshot of rendered scene + the state inspector.

---

## What's NOT done (deliberately deferred)

| Item | Session |
|---|---|
| Drop Kenney isometric atlases into `public/assets/kenney/` + wire manifest entries | 3 (Buzz prep) or dedicated mini-session |
| Implement `recolorToPalette` (luminance LUT pass) | Same as above |
| Replace procedural BuildingSprite/DecorationSprite with sprite-atlas variants | After Kenney drop |
| `BuzzSystem.ts` — buzz spread w/ 3-tile linear falloff, decoration diminishing returns | **3 (next)** |
| Buzz heat-map overlay (toggleable, gold→dark) | 3 |
| ParticleContainer crowd | 4 |
| Daily-pulse rhythm | 5 |
| Reintegrate Theatre layer (cast/rehearsal/events/Tony as click-into modal) | 6 |
| `PerformanceSystem.ts` input refactor (rooms[] → TheatreStats blob) | 6 |
| Construction progression tick (`constructionDaysLeft` decrements per day) | Side-task before Session 6 — needs gameLoop integration |
| Pan-to-recenter that accounts for panel width | Session 3 cleanup |
| Pointer-click smoke test in browser via mcp tools | Manual verification on next dev cycle |
| Removal undo / partial cost refund | Deferred indefinitely (no design call yet) |

---

## Known risks before Session 3

1. **Sprite atlas vs procedural switchover.** When Kenney textures land, BuildingSprite/DecorationSprite need to switch from `Graphics` to `Sprite` for the same entities. Plan: keep procedural path as a fallback when `bundle === null`; new Sprite path takes over when bundle loaded. Same constructor API.
2. **`crypto.randomUUID()` requires secure context.** Works on `localhost` and `https`. If the game ships from `file://` or unsecure dev URL, this throws. The dev server is `http://localhost` which IS a secure context per spec, so currently fine. Note for future packaging.
3. **No `acquirePlot` UX safety net.** Currently you can click any non-adjacent tile and the action silently fails. The ghost shows red but there's no toast/popup explaining why. Add a `Notification` toast on validation failure when wiring pointer-click smoke (Session 3 cleanup).
4. **`streetSelectedId` references can dangle.** If a building is removed while selected, the selected id points at nothing. UI guards against this (`find(...)` returns undefined → renders nothing) but actions on dangling ids are no-ops. Acceptable.
5. **Construction days don't tick yet.** The `constructionDaysLeft` field decrements nowhere. Session 6's gameLoop refactor will wire this in alongside Theatre interior reintegration.

---

## How to resume

```bash
cd ~/Code/broadway-tycoon-v2
git status                                # clean on feature/theatre-district after Session 2 commit
npm run build                             # passes clean
# Dev server already on :5181 with VITE_USE_RENDER2=true
# http://localhost:5181/broadway-tycoon/?debug for window.__bt
```

**Session 3 (next):** Buzz engine + heat-map overlay. Spec is **LOCKED** per prompt — do not redesign.
- New module `src/game/systems/BuzzSystem.ts` (pure functions, no PixiJS)
- 3-tile linear falloff from each source, summed across all sources
- Buildings: full-strength anchors (theatre/restaurant/cart)
- Decoration: per-tile diminishing-returns pool — i-th item adds less than the previous
- Litter / neglect: negative emitters
- Recompute trigger: event-driven only (on place/remove/litter change), never per-frame
- Float32Array buzz field is already in place + resizes on plot acquisition
- Heat-map overlay: single Graphics at `LAYER.UI_OVERLAY`, gold→dark interpolation, toggleable via UI flag

**Files to read first when resuming:**
- This file
- `src/store/slices/streetSlice.ts` — buzzField writes go here
- `src/types/index.ts` — `StreetState.buzzField`/`buzzFieldWidth`/`buzzFieldHeight` already defined
- `src/game/render2/assets/palette.ts` — for heat-map gradient colors
- The Theatre District prompt section "THE BUZZ SYSTEM — LOCKED SPEC, DO NOT REDESIGN"
