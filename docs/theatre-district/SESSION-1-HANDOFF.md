# Theatre District — Session 1 Handoff

**Branch:** `feature/theatre-district` (off `main`)
**Status:** Session 1 complete + smoke-verified. Ready for Session 2 (direct placement & street builder).
**Prior session report:** [SESSION-0-AUDIT.md is in the conversation transcript](../visual-rebuild/SESSION-1-HANDOFF.md) was the archived multi-floor work; Session 0 audit/architecture report lives in chat.

---

## What shipped

### Salvage (commit `e9aa4a7`)
Cherry-picked the iso renderer foundation from the abandoned Phase A–D multi-floor work; scrubbed every multi-floor reference.

- `src/game/render2/IsoEngine.ts` — PixiJS v8 `Application`, sortable `worldContainer`, `CameraController`, `ResizeObserver`, ticker
- `src/game/render2/coords.ts` — `gridToScreen` / `screenToGrid` / `footprintAnchor` (clean signatures, no `floor` param)
- `src/game/render2/depth.ts` — `LAYER` constants (GROUND/FOOTPRINT/WALL/PROP/AWNING/ROOF/MARQUEE/UI_OVERLAY) + `(gx+gy)*1000` z-sort
- `src/game/render2/assets/palette.ts` — Stage Door 16-color palette + `STREET_PALETTE` / `BUILDING_PALETTE` / `DECOR_PALETTE`
- `src/game/render2/tiles/TileLayer.ts` — dynamic-bounds diamond ground (sidewalk-on-owned, dirt-on-unowned)
- `src/game/canvas/Render2Canvas.tsx` — React shell that mounts IsoEngine + TileLayer
- `src/game/canvas/GameCanvas.tsx` — branches to `Render2Canvas` when `USE_RENDER2` is true
- `src/game/data/constants.ts` — `TILE.ISO_WIDTH=256`, `TILE.ISO_HEIGHT=128` (Kenney standard, locked per spec), `USE_RENDER2` flag

**Archived:** `archive/session-1-multifloor` branch (commit `433aba5`) preserves the original Phase A–D work for reference. Not pushed to origin.

### Session 1 proper (next commit)

**Slice-composition pattern** introduced as the standard for new state surfaces:
- `src/store/slices/streetSlice.ts` — `StreetSlice` interface, `createStreetSlice` factory, `STREET_PERSIST_KEYS`. Pattern is documented in the file header.
- `gameStore.ts` now uses `MAIN_PERSIST_KEYS` + `STREET_PERSIST_KEYS` (concat into `ALL_PERSIST_KEYS`) instead of the 70-action destructure footgun. Adding a new persisted field is a 1-line edit, not a regex hunt.

**StreetState types** in `src/types/index.ts`:
- `StreetBounds`, `StreetPlot`, `PlacedBuilding`, `PlacedDecoration`, `StreetLitter`, `DailyPhase`
- `BuildingKind = 'theatre' | 'restaurant' | 'cart'`
- `DecorationKind = 'lamp' | 'tree' | 'fountain' | 'bench' | 'poster' | 'string_lights'`
- `StreetState` carries `bounds`, `plots`, `placedBuildings`, `decoration`, `litter`, `buzzField: Float32Array`, `buzzFieldWidth/Height`, `dailyPhase`
- Added `street: StreetState` to `GameState`

**Save migration v2 → v3** in `src/store/saveManager.ts`:
- `SAVE_VERSION = 3`. Additive — pre-v3 saves get `street: createEmptyStreet()` default in `migrate()`.
- Float32Array survives JSON round-trip via a custom `serializeReplacer` / `deserializeReviver` keyed off a `__Float32Array__` tag. Catches typed arrays anywhere in state, not just `street.buzzField`.
- v3 round-trip verified end-to-end in the smoke test (see below).

**Expandable street + iso render:**
- Starting bounds `{minX:0, maxX:7, minY:0, maxY:2}` — an 8×3 block. All 24 starting tiles owned.
- `acquirePlot(x, y, currentDay)` action expands bounds and resizes the buzz field in place. Negative coords work (street can grow in any direction).
- `Render2Canvas` reads `street.bounds` + `street.plots`; redraws ground + recenters camera on bounds change.

**Asset pipeline scaffolding** under `src/game/render2/assets/`:
- `manifest.ts` — PIXI.Assets manifest with 5 bundles (`street-ground`, `buildings-theatre`, `buildings-amenity`, `decoration`, `people`). All empty for Session 1; Kenney drops + entries land in Session 2.
- `loader.ts` — `initAssets()` / `loadBundle(name)`. Idempotent. Will fire recolor pass on each loaded texture in Session 2.
- `recolor.ts` — STUB. API surface for the Stage-Door luminance-to-palette mapping. Implementation in Session 2 (needs textures to test against).

---

## Smoke verification (2026-05-27, in `preview` server on :5181)

Via `?debug` build + `window.__bt` store access:

| Check | Result |
|---|---|
| Initial street state present | ✅ bounds {0..7, 0..2}, 24 plots, Float32Array buzzField of 24 cells |
| `Render2Canvas` mounts on building phase | ✅ iso ground tiles visible (sidewalk checker pattern) |
| No console errors | ✅ |
| `acquirePlot(8,1,1)` expands bounds | ✅ bounds → {0..8, 0..2}, 25 plots, buzzField 27 cells |
| `acquirePlot(-1,0,2)` works with negative coords | ✅ bounds → {-1..8, 0..2} |
| Float32Array round-trip via save replacer/reviver | ✅ types + values + length all preserved |
| Tile dimensions render at 256×128 | ✅ visible iso diamonds match spec |

**Known cosmetic issues (not blockers):**
1. Legacy `BuildPanel` overlays the canvas in `building` phase. Will be replaced by the new direct-placement UI in Session 2.
2. `centerOnGrid` centers world on viewport center, which is hidden behind the legacy panel. Works correctly when viewing the canvas directly.

---

## What's NOT done (deliberately deferred)

| Item | Session |
|---|---|
| Drop Kenney atlases into `public/assets/kenney/`, wire manifest entries | 2 |
| Implement procedural recolor pass | 2 |
| Direct placement UI (RollerCoaster-Tycoon-style click to place buildings) | 2 |
| Building sprite rendering (currently no buildings can be placed) | 2 |
| Plot acquisition UI + adjacency check (tile must touch existing plots) | 2 |
| `BuzzSystem.ts` — buzz spread, decoration diminishing-returns pool | 3 |
| Buzz heat-map overlay | 3 |
| `ParticleContainer` crowd | 4 |
| Daily-pulse rhythm | 5 |
| Reintegrate Theatre layer (cast / rehearsal / events / Tony) as click-into modal | 6 |
| `PerformanceSystem.ts` input refactor (rooms[] → TheatreStats blob) | 6 |
| Litter, staff, amenity upgrades, street events | 7 |
| Visual cohesion pass (palette enforcement, lighting, UI restyle) | 8 |

---

## Known risks before Session 2

1. **HMR resets Zustand state.** Hot-reloading any source file under `src/store/` re-initializes the store. Workaround: full page reload after structural changes. Not a production issue.
2. **`@pixi/react` is still in `package.json`** as a transitive remnant. Unused. Defer cleanup until Session 8 (visual cohesion pass touches PixiJS deps anyway).
3. **Legacy `src/game/rendering/` lives on for the `USE_RENDER2=false` path.** Don't delete until the new renderer covers every phase the legacy one does — including running/performance views. That's mostly Session 6 work.
4. **Slice composition is incremental.** Only the `street` slice uses the new pattern. The other 9 subsystems still live in the giant `gameStore.ts`. New work should follow the slice pattern (see `streetSlice.ts` header). Older code refactors as files are touched.

---

## How to resume

```bash
cd ~/Code/broadway-tycoon-v2
git status                                # should be clean on feature/theatre-district after Session 1 commit
npm run build                             # passes clean as of commit
# Dev server already running at :5181 with VITE_USE_RENDER2=true in .env.local
# Visit http://localhost:5181/broadway-tycoon/?debug for window.__bt access
```

**Session 2 (next):** direct placement & street builder.
- Wire pointer events in Render2Canvas: hover ghost → click to place
- Implement `placeBuilding(kind, position)` in streetSlice (footprint validation, plot ownership check, cost deduction from economy)
- Implement `placeDecoration(kind, position)`
- Plot acquisition UI: click empty-adjacent tile, confirm cost, expand bounds
- Drop Kenney isometric packs, wire manifest entries, fire recolor pass

**Read first when resuming:**
- This file
- `src/store/slices/streetSlice.ts` (pattern reference for placeBuilding action shape)
- `src/types/index.ts` `PlacedBuilding` / `PlacedDecoration` (already defined)
- Theatre District prompt section "Session 2 — Direct placement & street builder"
