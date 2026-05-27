# Session 1 — Handoff (paused mid-Phase-D)

**Status:** paused by Dixon to chase a parallel idea. Resume cleanly from here.
**Branch:** `feature/v2-overhaul` (uncommitted — see "Commit before resuming?" below)
**Plan reference:** [docs/VISUAL_REBUILD_PLAN.md](VISUAL_REBUILD_PLAN.md)

---

## What's done (verified working in browser)

### Phase A — multi-floor data foundation ✅

- `Room.floor: number`, `Property.floors: number`, `GridFloor`, `GridState.floors[]`, `UIState.currentFloor` added to [src/types/index.ts](../../src/types/index.ts)
- Save migration v2→v3 with backfill (`floor: 0`, `floors: 1`, grid restructure) in [src/store/saveManager.ts](../../src/store/saveManager.ts)
- `BuildingSystem.ts` fully floor-aware — `canPlaceRoom`, `isAdjacentToRoomOrWall`, `placeRoomOnGrid`, `removeRoomFromGrid` all take `floor`. New `hasSupportBelow` enforces upper-floor support rule.
- `gameStore.placeRoom(type, position, size, floor?)` — defaults to `ui.currentFloor`. New actions `setCurrentFloor`, `addFloorToProperty`.
- `initGrid` reads active property's `floors` count and seeds N floors.
- Properties data: Dusty Loft + Midtown = 2 floors, West 44th = 3, Times Square + Broadway Crown = 4.
- `FloorSwitcher` UI component at top-left of build view — toggle `G / 2 / 3 / 4 / +`. Adds floors up to property cap.
- Legacy renderer adapter in `GameCanvas.tsx` flattens `floors[currentFloor].cells` so the old `FloorPlanRenderer` keeps working.
- App.tsx tile-info readouts + Delete-key demolish updated to `floors[currentFloor]`.

**Verified in browser:** purchased Dusty Loft → 2-floor switcher appears → switching to floor 2 shows empty grid → switching to G shows ground grid. No console errors. No save/load tested live.

### Phase B — render2 scaffolding ✅

- `TILE.ISO_WIDTH = 128`, `TILE.ISO_HEIGHT = 64`, `TILE.FLOOR_HEIGHT_PX = 96`
- `USE_RENDER2 = import.meta.env.VITE_USE_RENDER2 === 'true'` in [constants.ts](../../src/game/data/constants.ts)
- New tree under [src/game/render2/](../../src/game/render2/):
  - `coords.ts` — `gridToScreen(gx, gy, floor)` / `screenToGrid` / `footprintAnchor`
  - `depth.ts` — `LAYER` enum + `zIndex(gx, gy, floor, layer)`
  - `IsoEngine.ts` — owns Application, ticker, worldContainer, centerOnGrid, applyCamera, dispose. Reuses legacy `CameraController` (preserves `wasDragging`).

### Phase C — palette only ✅ (Kenney downloads deferred)

- `assets/palette.ts` — Stage Door 16-color palette + per-room-type primary/secondary/accent map + ground tile colors.
- **NOT done:** Kenney pack downloads, atlas repacking, recolor pipeline, PIXI.Assets manifest. Defer to Session 2 — Phase D placeholders render fine without sprites.

---

## What's partially done (Phase D — written but UNVERIFIED in browser)

The render2 build view is wired but has NOT been visually confirmed. Dev server was stopped before the `.env.local` flag flip could verify it.

**Written:**
- [src/game/render2/tiles/TileLayer.ts](../../src/game/render2/tiles/TileLayer.ts) — procedural iso diamond ground + hover + selection
- [src/game/render2/entities/RoomSprite.ts](../../src/game/render2/entities/RoomSprite.ts) — placeholder colored iso "box" extruded from footprint, with 3 construction stages (foundation/framed/finished) derived from `constructionDaysLeft / buildDays`
- [src/game/render2/entities/constructionStages.ts](../../src/game/render2/entities/constructionStages.ts) — derives stage from data
- [src/game/render2/views/BuildView.ts](../../src/game/render2/views/BuildView.ts) — composes TileLayer + RoomSprites + placement ghost; floor-aware (inactive-floor rooms render at 22% alpha)
- [src/game/canvas/Render2Canvas.tsx](../../src/game/canvas/Render2Canvas.tsx) — React shell, mounts IsoEngine, wires pointer events for placement + selection
- `GameCanvas.tsx` now branches: `USE_RENDER2 ? <Render2Canvas /> : <LegacyGameCanvas />`
- `.env.local` written with `VITE_USE_RENDER2=true` (but dev server was killed before reload — flag is armed but unverified)

**What this should look like when verified:** iso diamond grid replaces the top-down floor plan. Placing a Lobby renders a small isometric box (cream-colored, brass roof) with depth. Switching floors fades inactive rooms to 22%.

---

## What's NOT done

### Phase E — procedural generator stubs ❌
Not written. Six files planned: `procedural/curtain.ts`, `marquee.ts`, `seats.ts`, `posters.ts`, `proscenium.ts`, `bulbStrip.ts`. Specs are in [VISUAL_REBUILD_PLAN.md §7](../VISUAL_REBUILD_PLAN.md). Session 1 was to stub them with simple shapes; full math lands in Session 2.

### Phase F — verification + screenshots ❌
Not done. Should include:
- Visual smoke: place all 15 room types on floor 0 with `USE_RENDER2=true`, screenshot each
- Multi-floor: place rooms on floor 1 above a floor 0 room, screenshot the stack
- Save round-trip: save a game, reload, verify scene matches
- Flag flip: `USE_RENDER2=false` → old renderer still works identically
- `npm run build` — currently UNTESTED. May have TS errors from the Phase A type changes that the dev server's HMR papered over.
- Screenshots dropped to `docs/visual-rebuild/session-1/`

---

## Known risks before resuming

1. **`npm run build` not yet run.** Dev server tolerates many things that `tsc -b` does not. Run it first thing.
2. **Render2Canvas not visually verified.** Most likely failure modes: a missed import, the IsoEngine init promise racing the React effect, the `screenToGrid` math being off by a half-tile, or the RoomSprite zIndex ordering producing weird overlaps. None of these are hard — but expect 15–30 min of "open Render2Canvas, screenshot, fix" cycles.
3. **placeRoom verification was incomplete.** In the one Phase-A interactive test, clicking a Lobby button + canvas did not deduct cash. Could be: my test's button selector matched the wrong element, OR placement silently failed adjacency check. Worth a manual play-through before pushing further.
4. **Save migration round-trip not tested.** Migration code looks right but un-exercised.
5. **`@pixi/react` is still in package.json.** Still unused. Defer cleanup to Session 5.

---

## How to resume the next session

```bash
cd ~/Code/broadway-tycoon-v2
git status                                # confirm uncommitted state matches this doc
npm run build                             # first — catch any TS that HMR hid
# If build clean: start dev server with flag on
VITE_USE_RENDER2=true npm run dev -- --port 5181
# OR: rely on .env.local being present (already written)
```

Then in browser:
1. New Game → name → Purchase Dusty Loft → land in Build view
2. Expect: iso diamond grid (not top-down). FloorSwitcher top-left showing G/2/+.
3. Click Lobby in panel → click on grid → should see a small isometric box render
4. Add a floor → place room above existing room → verify upper-floor support adjacency rule
5. Save → reload → load → verify
6. Set `VITE_USE_RENDER2=false` in `.env.local`, restart dev server → confirm legacy view still works
7. Drop screenshots into `docs/visual-rebuild/session-1/`

If Render2Canvas crashes or renders nothing: check console logs first. Likely fixes in `Render2Canvas.tsx` (the init effect) or `BuildView.ts` (the diamond corner math).

---

## Files touched this session

**New (12):**
```
docs/VISUAL_REBUILD_PLAN.md
docs/visual-rebuild/SESSION-1-HANDOFF.md          (this file)
.env.local                                         (VITE_USE_RENDER2=true)
src/game/render2/IsoEngine.ts
src/game/render2/coords.ts
src/game/render2/depth.ts
src/game/render2/assets/palette.ts
src/game/render2/tiles/TileLayer.ts
src/game/render2/entities/RoomSprite.ts
src/game/render2/entities/constructionStages.ts
src/game/render2/views/BuildView.ts
src/game/canvas/Render2Canvas.tsx
src/ui/components/FloorSwitcher.tsx
```

**Modified (8):**
```
src/types/index.ts
src/store/saveManager.ts
src/store/gameStore.ts
src/game/systems/BuildingSystem.ts
src/game/data/properties.ts
src/game/data/constants.ts
src/game/canvas/GameCanvas.tsx
src/App.tsx
```

**Outside repo (1):** `~/.claude/launch.json` — added `broadway-tycoon` server entry on port 5181.

---

## Commit before resuming?

Recommended: yes — a single commit at this point gives the parallel-Claude work a clean rollback point.

Suggested message:
```
feat(visual-rebuild): Phase A multi-floor + Phase B/C/D scaffolding (Session 1, paused)

- Phase A: multi-floor data foundation, save migration v2→v3, FloorSwitcher UI (verified)
- Phase B: render2 engine, coords, depth, palette (verified compile clean via HMR)
- Phase C: Stage Door palette only — Kenney pipeline deferred to Session 2
- Phase D: TileLayer + RoomSprite + BuildView + Render2Canvas written, USE_RENDER2 flag armed (NOT visually verified)
- Phase E/F: not started

See docs/visual-rebuild/SESSION-1-HANDOFF.md for full state.
```

Dixon: decide whether to commit now or after the parallel-Claude work merges.
