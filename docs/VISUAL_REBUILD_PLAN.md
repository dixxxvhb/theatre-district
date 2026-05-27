# Broadway Tycoon — Visual Rebuild Plan (Session 0.5)

Status: planning complete, awaiting approval. No code shipped from this session.
Branch target: `feature/v2-overhaul` (current)
Anchor: PixiJS v8, Kenney 128×64 isometric tile family, "Stage Door" palette.

---

## 0. Locked decisions

| | |
|---|---|
| Tile anchor | **128×64 iso** (raised from initial 64×32 — see §5 rationale) |
| Palette | "Stage Door" Art Deco NYC c.1928 (16 colors, §6) |
| Cutover | `USE_RENDER2` feature flag, runtime-toggleable |
| itch.io | pre-approved to vet CC0 packs as needed |
| Review | Claude drives screenshots + dev server end of each session |
| Multi-floor | **YES** — scope expansion, breaks "visual-only" promise (§3) |
| Save compat | preserved via v2→v3 migration |
| AI image gen | excluded |
| Vintage theatre CC0 pack | none exists at Kenney quality — fill procedurally (§7) |

---

## 1. Codebase audit (verified findings)

### 1.1 Render layer

| Concern | File:line | Notes |
|---|---|---|
| Pixi app mount | [GameCanvas.tsx:204-423](src/game/canvas/GameCanvas.tsx:204) | imperative, `@pixi/react` imported but unused |
| Scene graph | [GameCanvas.tsx:227-247](src/game/canvas/GameCanvas.tsx:227) | bg → worldContainer (camera xform) → floorPlan / iso / ghost |
| Ticker | [GameCanvas.tsx:390-395](src/game/canvas/GameCanvas.tsx:390) | `cameraTick → gameLoop.update(ticker) → drawGhostPreview() → floorPlan.tick(deltaMS)` |
| Camera transform | [GameCanvas.tsx:457-462](src/game/canvas/GameCanvas.tsx:457) | mutates `worldContainer.x/y/scale` from `camera` store slice |
| `wasDragging` gate | [GameCanvas.tsx:81](src/game/canvas/GameCanvas.tsx:81), [:365](src/game/canvas/GameCanvas.tsx:365) | distinguishes click vs camera-drag — preserve |
| Floor plan view | [FloorPlanRenderer.ts](src/game/rendering/FloorPlanRenderer.ts) | 9 Graphics layers, 32px cells, all primitives |
| "Isometric" view | [IsometricRenderer.ts](src/game/rendering/IsometricRenderer.ts) | 64×32 empty diamonds — **placeholder**, no building geometry |
| Asset loading | — | **none.** No `PIXI.Assets`, no atlases, no sprites |

### 1.2 Placement pipeline

| Concern | File:line |
|---|---|
| `placeRoom` action | [gameStore.ts:315-380](src/store/gameStore.ts:315) — signature `(type, position, size) => boolean` |
| `canPlaceRoom` validator | [BuildingSystem.ts:12-38](src/game/systems/BuildingSystem.ts:12) — bounds + empty + adjacency |
| `isAdjacentToRoomOrWall` | [BuildingSystem.ts:43-88](src/game/systems/BuildingSystem.ts:43) — touches exterior or another room |
| `placeRoomOnGrid` | [BuildingSystem.ts:93-118](src/game/systems/BuildingSystem.ts:93) — flat `cells[y*w+x]` writes |
| `removeRoomFromGrid` | [BuildingSystem.ts:123-133](src/game/systems/BuildingSystem.ts:123) |
| `placeRoom` call sites | [GameCanvas.tsx:88](src/game/canvas/GameCanvas.tsx:88), [:347](src/game/canvas/GameCanvas.tsx:347), [:355](src/game/canvas/GameCanvas.tsx:355) — all in canvas, none in UI |
| Cost formula | [gameStore.ts:329-334](src/store/gameStore.ts:329) — area-scaled, rush 1.5× outside building phase |

### 1.3 Data shapes (verified)

```ts
GridCell  { type: 'empty'|'room'|'wall'|'door'; roomId; roomType; walkable }      // index.ts:243
GridState { width; height; cells: GridCell[] }                                     // index.ts:250
Room      { id; type; position:{x,y}; size:{w,h}; level; condition;                // index.ts:113
            isConstructing; constructionDaysLeft; presetId }
Property  { id; name; address; lot; cost; gridSize; locationBonus; condition;      // index.ts:125
            constructionCostModifier; maxSeats; unlockReputation; rooms[]; purchased }
```

### 1.4 Save + autosave

| | |
|---|---|
| `SAVE_VERSION` | [saveManager.ts:12](src/store/saveManager.ts:12) — currently `2` |
| Envelope | `{ version, state }` ([:14-17](src/store/saveManager.ts:14)) |
| Migration | [saveManager.ts:148-177](src/store/saveManager.ts:148) — idempotent, additive, defaults missing fields |
| Slots | 5 manual + 1 autosave |
| Autosave | 60 000 ms ([:204](src/store/saveManager.ts:204)) — non-blocking |
| `unwrap` | strips envelope, falls through to raw object for pre-v2 saves ([:140-145](src/store/saveManager.ts:140)) |

### 1.5 No clashing "floor" usage

Grep for `\bfloor\b|\bstory\b|\bstories\b` in non-types code returns only `Math.floor()` numerics and "newspaper feature story" event text. **No existing data field named `floor` to collide with.** Safe to add.

---

## 2. All 15 rooms — current + iso footprint map

Current min/default sizes from [rooms.ts:14-180](src/game/data/rooms.ts:14). Proposed iso column = same tile coverage at 128×64 (1 grid cell = 1 iso tile).

| Type | Current default (cells) | Min | Required | Iso footprint | Special-case |
|---|---|---|---|---|---|
| `lobby` | 3×3 | 2×2 | ✓ | 3×3 tiles, 2 stories tall (chandelier height) | Door faces street |
| `box_office` | 2×2 | 1×1 | ✓ | 2×2, 1 story, ticket window on street face | Always touches lobby or exterior |
| `seating` | 4×4 | 2×2 | ✓ | 4×4, raked rows (procedural), 1.5 stories | Must face stage; aisle if width ≥ 4 |
| `stage` | 4×3 | 2×2 | ✓ | 4×3, 2 stories (fly space), proscenium arch front-facing | **Pairs with orchestra_pit** — see below |
| `backstage` | 3×3 | 2×1 | ✓ | 3×3, 1 story | Must touch stage |
| `dressing_room` | 2×3 | 1×1 | — | 2×3, 1 story, mirrored vanity row | Walls show posters |
| `orchestra_pit` | 3×2 | 2×1 | — | 3×2, **sunk 0.5 story** (negative height) | Always in front of stage; render z behind stage |
| `rehearsal_hall` | 4×4 | 2×2 | — | 4×4, 1.5 stories, sprung-floor pattern | Mirrors on one wall |
| `vip_lounge` | 3×3 | 2×2 | — | 3×3, 1 story, brass + velvet upgrade tier | Bar fixture |
| `concession` | 2×2 | 1×1 | — | 2×2, 1 story, counter + glass case | Display popcorn/drinks |
| `storage` | 2×2 | 1×1 | — | 2×2, 1 story, crates/cases | Lowest visual priority |
| `office` | 2×2 | 1×1 | — | 2×2, 1 story, desk + filing | Window if exterior-facing |
| `tech_booth` | 2×2 | 1×1 | — | 2×2, **elevated** ½-story above seating | Render z above seating |
| `green_room` | 3×2 | 2×1 | — | 3×2, 1 story, sofa + coffee table | Casual lounge feel |
| `restrooms` | 2×2 | 1×1 | — | 2×2, 1 story, tile floor pattern | Door indicator |

**Special-case rules** (encoded in iso sprite composition, not in data):

- **Orchestra pit** renders at `y = floorBaseY + 16px` (half a tile below grade); seating in front of it gets clipped at its back edge to "look into" the pit.
- **Tech booth** renders at `y = floorBaseY - 32px` (one tile elevated) if placed adjacent to seating, regardless of multi-floor metadata. Cheap visual cue: this is the booth above the back of the house.
- **Stage** gets a procedural proscenium arch sprite drawn at its front face (1 tile tall above stage roofline). Curtain plane sits inside the arch.
- **Seating** gets a procedural raked-row sprite generator (see §7) instead of a static sprite — rakes correctly regardless of room dimensions.

---

## 3. Multi-floor v2→v3 migration spec

**Goal:** add `floor` to `Room`, add `floors` to `Property`, make all placement logic floor-aware, render multi-story buildings in iso view. Save-compatible with v2.

### 3.1 Type changes

```ts
// src/types/index.ts
export interface Room {
  // ...existing...
  floor: number;          // NEW — 0 = ground floor, 1 = second, etc.
}

export interface Property {
  // ...existing...
  floors: number;         // NEW — total stories this property supports (1..4)
}

// GridState becomes per-floor:
export interface GridFloor {
  cells: GridCell[];      // flat width*height, same as today
}

export interface GridState {
  width: number;
  height: number;
  floors: GridFloor[];    // CHANGED — was `cells: GridCell[]`
}
```

**Why per-floor cells array (not adding `floor` to each cell):** cells per floor = O(w·h·f). Adding floor to every cell wastes memory and complicates iteration. Per-floor is the canonical roguelike pattern.

### 3.2 Migration function

`migrate()` in [saveManager.ts:148](src/store/saveManager.ts:148) extends:

```ts
// pseudocode, illustrative
function migrate(raw: GameState): GameState {
  const migrated = { ...raw, /* existing v1→v2 defaults */ };

  // v2 → v3: add floors to properties, floor to rooms, restructure grid
  migrated.properties = migrated.properties.map((p) => ({
    ...p,
    floors: p.floors ?? 1,
    rooms: p.rooms.map((r) => ({ ...r, floor: r.floor ?? 0 })),
  }));

  // Grid: if old shape (cells: GridCell[]), wrap into floors[0]
  if (Array.isArray((raw as any).grid?.cells)) {
    migrated.grid = {
      width: raw.grid.width,
      height: raw.grid.height,
      floors: [{ cells: (raw as any).grid.cells }],
    };
  }
  return migrated;
}
```

Bump `SAVE_VERSION = 3`. `unwrap()` already handles pre-envelope saves — no change needed.

### 3.3 Validation changes (BuildingSystem.ts)

Every signature gains `floor: number` and indexes `grid.floors[floor].cells` instead of `grid.cells`:

```ts
canPlaceRoom(grid, position, size, floor, existingRooms)  // filter existing by floor for adjacency
isAdjacentToRoomOrWall(grid, position, size, floor)
placeRoomOnGrid(grid, roomId, roomType, position, size, floor)
removeRoomFromGrid(grid, roomId)   // unchanged signature — iterates all floors
```

**Adjacency rule update:** rooms on floor N are adjacent only to other rooms on floor N **or** to a room directly below on floor N-1 (counts as "structural support"). First room on floor N must be either on a perimeter or above an existing room — prevents floating second-floor lobbies.

### 3.4 Action signature changes

```ts
// gameStore.ts — placeRoom signature gains floor
placeRoom(type: RoomType, position: Position, size: Size, floor: number): boolean
```

Three call sites at [GameCanvas.tsx:88, :347, :355](src/game/canvas/GameCanvas.tsx:88) all pass `state.ui.currentFloor` (new ephemeral UI state, not persisted — derived default 0).

### 3.5 UI changes (build view)

- Floor switcher chip group above the canvas: `1 · 2 · 3 · 4` with `+` to add (caps at `Property.floors`).
- Up/Down arrow keys cycle floors.
- Mouse wheel + Cmd switches floors.
- Inactive floors render as 30% opacity "ghost" outlines for spatial context.

### 3.6 Iso view

Multi-floor renders as a literal Z-stack: floor N rooms get `y -= N * floorHeightPx`. Floor 1+ requires either (a) a floor on floor N-1 covering the same tile (room above room) or (b) a column/wall sprite below (visual support). Validation enforces this; iso renderer assumes it.

### 3.7 What does NOT change

- Cell indexing math `y * width + x` stays — just inside `floors[f].cells`.
- `crypto.randomUUID()` room IDs.
- Cost formula.
- All non-placement systems (events, performances, rivals, shows, cast, crew).
- Save envelope shape.
- The "two views, one data model" rule.

---

## 4. Renderer architecture (new code only)

```
src/game/render2/                          [NEW — old src/game/rendering/ untouched until cutover]
├── IsoEngine.ts                           Owns Application, ticker, root containers
├── coords.ts                              gridToScreen / screenToGrid — single source
├── depth.ts                               z-sort: (gx+gy)*1000 + layerOffset + floor*100000
├── camera.ts                              Port of CameraController (preserves wasDragging)
├── assets/
│   ├── manifest.ts                        Declares all bundles for PIXI.Assets
│   ├── loader.ts                          Assets.init + loadBundle('core')
│   ├── palette.ts                         Stage Door palette + recolor pipeline
│   ├── recolor.ts                         Nearest-color LAB recolor → RenderTexture cache
│   └── procedural/
│       ├── curtain.ts                     §7.1
│       ├── marquee.ts                     §7.2
│       ├── seats.ts                       §7.3
│       ├── poster.ts                      §7.4
│       ├── proscenium.ts                  §7.5
│       └── bulbStrip.ts                   §7.6
├── tiles/
│   ├── tileAtlas.ts                       Kenney sprite keys
│   └── TileLayer.ts                       Floor/ground tiles
├── views/
│   ├── BuildView.ts                       Replaces FloorPlanRenderer (now iso, floor-aware)
│   └── ExteriorView.ts                    Replaces IsometricRenderer (real building)
├── entities/
│   ├── RoomSprite.ts                      Sprite composition per (room, constructionStage)
│   ├── constructionStages.ts              Derive 3 stages from constructionDaysLeft/total
│   └── roomComposers/                     One file per room type — composes Kenney + procedural
└── adapter.ts                             ONLY file that reads gameStore — feeds views
```

**Untouched (rebuild MUST NOT modify):**
`src/store/`, `src/types/` (except the additive multi-floor fields), `src/game/systems/` (except BuildingSystem.ts gaining floor param), `src/game/data/`, `src/ui/`.

**Touched (rebuild MAY modify):**
`src/game/canvas/GameCanvas.tsx` (swap which renderer mounts, behind flag), `src/types/index.ts` (additive only), `src/store/saveManager.ts` (migration extension), `src/store/gameStore.ts` (placeRoom signature extension), `src/game/systems/BuildingSystem.ts` (floor-aware signatures), `src/game/data/constants.ts` (TILE.ISO_WIDTH/HEIGHT → 128/64; add FLOOR_HEIGHT_PX).

---

## 5. Asset pipeline

### 5.1 Source packs (Session 1 downloads, verified CC0)

| Pack | URL | Used for |
|---|---|---|
| **Isometric Tiles — Buildings** | https://kenney.nl/assets/isometric-tiles-buildings | Anchor — walls, floors, roofs |
| **Isometric Tiles — City** | https://kenney.nl/assets/isometric-tiles-city | Streets, sidewalks, lampposts |
| **Furniture Kit** (iso PNG renders) | https://kenney.nl/assets/furniture-kit | Lobby/office/dressing-room props |
| **Isometric Roads** (optional) | https://kenney.nl/assets/isometric-roads | Only if City road variety insufficient |
| **Modular Characters** (Session 4) | https://kenney.nl/assets/modular-characters | Crowd — requires Blender render step, defer |
| **UI Pack** (Session 5) | https://kenney.nl/assets/ui-pack | UI scaffold to recolor |

**Vintage theatre elements:** no acceptable CC0 pack exists. Author procedurally (§7) or as one-off SVG primitives in `assets/svg/` exported to PNG.

### 5.2 Repack pipeline

Kenney ships individual PNGs + XML atlas. PixiJS v8 Assets wants JSON Hash. Pipeline:

1. Download Kenney pack → unzip to `assets-src/kenney-<pack>/`
2. Run `free-tex-packer` (https://free-tex-packer.com) over the relevant subset of PNGs
3. Export: JSON Hash + PNG to `public/atlases/<bundle>.json` + `<bundle>.png`
4. `manifest.ts` declares the bundle for `PIXI.Assets.init()`
5. `loader.ts` calls `Assets.loadBundle('core')` before first paint

**Why repack vs. consume Kenney XML directly:** combining multiple packs into one optimized atlas reduces texture binds; JSON Hash is native to PixiJS v8 with zero conversion.

### 5.3 128×64 anchor decision

Kenney's iso family is authored at **128×64 base tile**. Downsampling 2:1 to current 64×32 destroys shading fidelity. Path: bump `TILE.ISO_WIDTH=128, TILE.ISO_HEIGHT=64` in [constants.ts:32](src/game/data/constants.ts:32). Add `TILE.FLOOR_HEIGHT_PX=96` (3/4 tile width — empirically correct for Kenney building heights).

**Impact:** purely visual. `gridToScreen()` already takes tile dimensions as parameters ([isometric.ts:16](src/utils/isometric.ts:16)) — math scales automatically. Camera world bounds derived from grid × tile size — also auto-scales.

---

## 6. "Stage Door" palette (locked, 16 colors)

```ts
export const STAGE_DOOR_PALETTE = {
  ink:       '#1A1622',  // outlines, shadow cores
  coal:      '#2D2638',  // roof, deep shade
  dust:      '#4A4156',  // walls in shadow
  bone:      '#E8DCC4',  // plaster, light walls
  cream:     '#F4E9D2',  // lobby, lit surfaces
  velvet:    '#7A1F2B',  // curtain mid
  crimson:   '#A82838',  // curtain highlight, seats
  burgundy:  '#4E1620',  // curtain shadow
  brass:     '#C8923D',  // marquee bulbs OFF
  filament:  '#F5C24A',  // marquee bulbs ON, warm light
  amber:     '#E89441',  // stage wash
  sidewalk:  '#6E6960',  // concrete
  slate:     '#3F4A55',  // stone trim, night
  midnight:  '#1E2B3C',  // night sky
  sage:      '#5C7864',  // awnings, accent doors
  brick:     '#8B4A3A',  // facade brick
} as const;
```

### 6.1 Recolor algorithm

Pixel-by-pixel nearest-color match in **CIE LAB** space (perceptually uniform — RGB nearest produces muddy mid-tones). Runs once per loaded texture at boot:

1. Convert each unique source pixel RGB → LAB once (cache in Map).
2. For each palette entry, precompute LAB.
3. For each source pixel: ΔE76 distance to all 16, pick min.
4. Write result to a new `RenderTexture` of same dimensions.
5. Register under `<original-key>:recolored` in `Assets.cache`.

Cost: ~150ms one-time at boot for the full Kenney bundle on M-series. Negligible runtime.

Procedural assets sample palette entries directly — no recolor pass.

### 6.2 Cohesion rule

All sprite consumers (`RoomSprite`, `TileLayer`, etc.) request the `:recolored` key, never the raw key. This guarantees Kenney + Furniture + custom SVG all read as one art-directed product.

---

## 7. Procedural generator specs

All generators output a PixiJS `Container` or `RenderTexture` and accept a `palette` argument. Math is concrete and implementable.

### 7.1 Curtain (`procedural/curtain.ts`)

Generates a hangable red velvet curtain plane.

```
Inputs:  widthTiles, heightTiles, palette, drawAmount (0=closed, 1=fully drawn)
Geometry: vertical strips, each 8px wide
  stripCount = widthTiles * (128 / 8) = widthTiles * 16
  for each strip i in 0..stripCount-1:
    foldPhase = (i % 4) / 4 * TAU
    shadowMix = 0.5 + 0.5 * sin(foldPhase)
    color = lerp(burgundy, velvet, shadowMix) with crimson highlight at shadowMix > 0.85
    stripHeight = heightTiles * 64
    if drawAmount > 0:
      // pull strips up + bunch toward sides
      lift = drawAmount * stripHeight * 0.7
      bunch = drawAmount * (distance from center / halfWidth) * 12px
      drawStrip(x + bunch, y - lift, 8, stripHeight - lift)
    else:
      drawStrip(x, y, 8, stripHeight)
```

Output: `Container` (not RenderTexture — animates).

### 7.2 Marquee (`procedural/marquee.ts`)

Static marquee chassis. Composed with `bulbStrip` for animated lights.

```
Inputs: widthTiles, palette, showTitle (string), showYear (string|null)
Geometry:
  marqueeBoxHeight = 96px (1.5 tile), widthPx = widthTiles * 128
  Outer frame: brass border 4px, ink outline 1px
  Bottom edge: scalloped (8 half-circles across width)
  Front face: cream background
  Text: showTitle in Bevan font, 36px, ink — auto-fit
  Subtext: showYear in Outfit 14px, slate
  Side panels (2): brass with vertical filament accent strip
  Top: bulbStrip(widthPx, palette, animation='chase')
  Bottom: bulbStrip(widthPx, palette, animation='chase-reverse')
```

Output: `Container`.

### 7.3 Seats (`procedural/seats.ts`)

Raked seating rows for a `seating` room.

```
Inputs: widthTiles, heightTiles, palette
Geometry:
  rows = heightTiles * 3        // 3 rows per tile depth
  seatsPerRow = widthTiles * 4   // 4 seats per tile width
  rakeAnglePx = 6px per row (back rows higher on screen)
  centerAisle = (widthTiles >= 4)
  for row r in 0..rows-1:
    yBase = isoBaseY + r * 16 - r * rakeAnglePx   // toward stage
    for seat s in 0..seatsPerRow-1:
      if centerAisle && s == seatsPerRow/2: skip
      x = isoBaseX + s * 8 - r * 2   // very subtle inward fan
      drawSeat(x, yBase, palette)    // crimson cushion, burgundy back, ink legs
  // Aisle stripe: bone-colored 4px strip if centerAisle
```

Output: `RenderTexture` cached per (widthTiles, heightTiles) tuple.

### 7.4 Poster (`procedural/poster.ts`)

Show posters for dressing rooms / lobby walls.

```
Inputs: palette, showTitle, showGenre, seed
Geometry:
  64×96 px poster
  Background: palette pick from {velvet, midnight, brass} seeded by hash(showTitle)
  Border: ink 2px
  Title: showTitle in Limelight 12px, color contrasts background
  Genre badge: bottom-right corner, sage circle 12px
  Decorative element seeded by hash(showTitle):
    seed % 3 == 0: sunburst rays from center
    seed % 3 == 1: stepped chevron pattern
    seed % 3 == 2: vertical stripe field
```

Output: `RenderTexture`.

### 7.5 Proscenium (`procedural/proscenium.ts`)

Stage arch — frames the curtain.

```
Inputs: widthTiles, palette
Geometry:
  Arch height = 1.5 tiles above stage
  Outer rect: brass 6px border
  Inner: stepped art-deco trim (3 steps, each 4px, alternating brass/cream)
  Top center: starburst medallion (10 brass rays from center point)
  Side columns: fluted (6 vertical brass lines on cream background) 16px wide
```

Output: `RenderTexture`.

### 7.6 Bulb strip (`procedural/bulbStrip.ts`)

Reusable animated bulb row (marquee, signage).

```
Inputs: widthPx, palette, animation='chase'|'chase-reverse'|'twinkle'|'solid', tickerTime
Geometry:
  bulbCount = floor(widthPx / 16) - 1
  spacing = widthPx / (bulbCount + 1)
  radius = 5px
  for bulb i:
    x = spacing * (i + 1)
    y = 8px
    phase = depends on animation:
      chase:         (tickerTime/16 + i) % bulbCount < 3
      chase-reverse: (tickerTime/16 - i) % bulbCount < 3
      twinkle:       sin(tickerTime/8 + i * 2.3) > 0.5
      solid:         true
    color = phase ? filament : brass
    drawCircle(x, y, radius, color)
    if phase: drawCircle(x, y, radius * 1.6, filament + alpha 0.3)  // glow
```

Output: `Container` that re-renders per tick.

---

## 8. Session 1 task list (file-by-file build order)

Each step is independently verifiable. Verification at each step listed.

### Phase A — multi-floor data foundation (no rendering work yet)

| # | File | Change | Verify |
|---|---|---|---|
| A1 | `src/types/index.ts` | Add `Room.floor`, `Property.floors`, restructure `GridState.cells → floors[].cells` | `tsc --noEmit` passes; no callers broken (will be — fix in next steps) |
| A2 | `src/store/saveManager.ts` | Bump `SAVE_VERSION=3`. Extend `migrate()` with floor backfill + grid wrap. | Load existing v2 save → state matches expected shape |
| A3 | `src/game/systems/BuildingSystem.ts` | Add `floor: number` param to all four exported fns. Index `grid.floors[floor].cells`. Update adjacency rule (same floor OR floor below). | Unit-test placement at floor 0 unchanged; floor 1 requires below-support |
| A4 | `src/store/gameStore.ts` | Extend `placeRoom` signature with `floor`. Add `ui.currentFloor` state slice + setter. Update grid init to seed `floors: [{cells:[...]}]`. | Round-trip: place room → demolish → place again |
| A5 | `src/game/canvas/GameCanvas.tsx` | Update 3 `placeRoom` call sites to pass `currentFloor`. | Build view still works in legacy renderer |
| A6 | Floor switcher UI (new component in `src/ui/components/FloorSwitcher.tsx`) | Chip group reading `ui.currentFloor` + setter | Click chip → state updates → ghost preview redraws for correct floor |

**Phase A checkpoint:** game playable with old renderer, multi-floor data live, old saves migrate cleanly, only floor 0 visible (since old renderer doesn't know floors).

### Phase B — render2 scaffolding

| # | File | Change | Verify |
|---|---|---|---|
| B1 | `src/game/data/constants.ts` | `TILE.ISO_WIDTH=128`, `TILE.ISO_HEIGHT=64`, `TILE.FLOOR_HEIGHT_PX=96`. Add `USE_RENDER2` import-from-env flag. | Old iso view scales up — should look bigger but render |
| B2 | `src/game/render2/coords.ts` | gridToScreen / screenToGrid (factored from `utils/isometric.ts`) | Inverse round-trip test |
| B3 | `src/game/render2/depth.ts` | `zIndex(gx, gy, floor, layer) = floor*100000 + (gx+gy)*1000 + layer` | Smoke: place 2 rooms diagonally + on different floors, assert z-order |
| B4 | `src/game/render2/camera.ts` | Port `CameraController` (preserve `wasDragging`, world bounds) | Pan/zoom works identically |
| B5 | `src/game/render2/IsoEngine.ts` | Owns `Application`, mounts root containers, registers ticker | Empty canvas paints, ticker invokes callbacks |
| B6 | `src/game/render2/adapter.ts` | Reads `useGameStore.getState()`, calls views | Console.log shape on tick |

### Phase C — asset pipeline

| # | File | Change | Verify |
|---|---|---|---|
| C1 | Download Kenney Buildings + City + Furniture packs → `assets-src/` | (manual, scripted via curl) | Files present, license confirmed |
| C2 | `scripts/repack-atlases.mjs` (new) | Free-tex-packer invocation, output to `public/atlases/core.json + .png` | Atlas file generated |
| C3 | `src/game/render2/assets/palette.ts` | STAGE_DOOR_PALETTE constant + utility helpers | typed |
| C4 | `src/game/render2/assets/recolor.ts` | LAB-space nearest-color recolor → RenderTexture | One sprite recolored — visual diff |
| C5 | `src/game/render2/assets/manifest.ts` | PIXI.Assets manifest declaring `core` bundle | `Assets.resolve()` finds keys |
| C6 | `src/game/render2/assets/loader.ts` | `Assets.init` + `loadBundle('core')` → recolor pass | Console log: load + recolor times |

### Phase D — placeholder iso build view

| # | File | Change | Verify |
|---|---|---|---|
| D1 | `src/game/render2/tiles/TileLayer.ts` | Renders empty ground tiles using Kenney floor sprite | Iso grid of tiles paints |
| D2 | `src/game/render2/entities/RoomSprite.ts` | Placeholder: solid colored quad per room (no Kenney sprites yet) | Place room → colored shape appears in iso |
| D3 | `src/game/render2/views/BuildView.ts` | Wires TileLayer + RoomSprite list + ghost preview | Click-to-place works in render2 |
| D4 | `src/game/canvas/GameCanvas.tsx` | Behind `USE_RENDER2` flag, mount IsoEngine instead of old renderers | Toggle flag → see new view |

### Phase E — procedural generators (placeholder versions)

| # | File | Notes |
|---|---|---|
| E1 | `procedural/seats.ts` | Single-color stub returning RenderTexture |
| E2 | `procedural/curtain.ts` | Single solid red rect |
| E3 | `procedural/marquee.ts` | Single solid box with text |
| E4 | `procedural/proscenium.ts` | Brass-colored arch outline |
| E5 | `procedural/bulbStrip.ts` | Static brass dots |
| E6 | `procedural/poster.ts` | Solid color rect |

(Full math from §7 lands in Session 2 — Session 1 stubs are visual placeholders so the build view is composable.)

### Phase F — Session 1 finish line

| # | Item | Verify |
|---|---|---|
| F1 | Visual smoke: place all 15 room types on floor 0, switch to render2, all render as colored placeholders. | screenshot |
| F2 | Multi-floor: add a 2nd floor to a property, place a room above an existing room, verify it renders elevated. | screenshot |
| F3 | Save a v3 file, reload, see same scene. Take a v2 file from before A2, load, see correct migration. | screenshot + log |
| F4 | Toggle `USE_RENDER2=false` → old renderer still works identically. | screenshot |
| F5 | `npm run build` passes clean. | terminal |

---

## 9. Verification & rollback plan

### 9.1 Feature flag

```ts
// src/game/data/constants.ts
export const USE_RENDER2 = import.meta.env.VITE_USE_RENDER2 === 'true';
```

Toggle via `.env.local`: `VITE_USE_RENDER2=true`. No code change required to flip.

GameCanvas reads `USE_RENDER2` once on mount and chooses old vs new renderer. **No hot-swap** — toggling requires page reload (simpler, safer).

### 9.2 Save round-trip test

After every Phase A step:
1. Open prod (legacy) build. Play 5 minutes. Save to slot-1.
2. Switch to feature branch. Load slot-1. Verify all rooms present, cash matches, day matches.
3. Save again. Reload. Re-verify.

If round-trip fails → migration bug → fix before progressing.

### 9.3 Rollback steps

If a Phase A change ships broken to a Dixon-tested branch:

```bash
# Revert just the type/save changes:
git revert <commitA1>..<commitA5>

# Saves on disk are now v3 — they will fail v2 isValid() check (silent null return).
# Recovery: localStorage entries can be edited by hand or auto-cleaned:
#   localStorage.removeItem('broadway-tycoon-save-slot-1')
# OR: add a one-shot v3→v2 reverse migration in saveManager and bump version back to 2.
```

**Mitigation:** during Phase A development, keep migration **forward-only and additive**. Never delete fields. v2 saves remain readable after v3 ships; v3 saves becoming unreadable on a revert is a documented one-way upgrade.

### 9.4 Per-session screenshots

I produce + drop into `docs/visual-rebuild/session-<N>/` at end of each session:
- old renderer baseline
- new renderer at same scene
- multi-floor showcase
- before/after of palette recolor

---

## 10. Risks + open questions

| Risk | Mitigation |
|---|---|
| Kenney repacked atlas + recolor pass slows boot >500ms | Bake recolored atlas at build time, ship pre-recolored PNG. Trade boot speed for build complexity. Decision in Session 1 after measurement. |
| Procedural seat generator looks bad at small room sizes | Fall back to single-row rendering below 2×2 |
| Multi-floor adjacency rule blocks legacy valid layouts | Backfill grandfathered: rooms migrated from v2 skip the adjacency check on next placement attempt; only NEW placements enforce. |
| Free-tex-packer not scriptable | If it's GUI-only, switch to `texture-packer-cli` (also CC0-compatible) or write a 100-line atlas packer in Node |
| iOS Safari `crypto.randomUUID()` in older versions | Already in use in existing code — no regression |
| 128×64 makes the existing UI feel cramped | Acceptable for Session 1 (placeholder). Real assessment after Session 2 art lands. |

**Open questions for Dixon — none blocking.** All Session 0 decisions cover Session 1. Will surface new questions if Session 1 measurement reveals trade-offs (e.g. boot-time recolor decision in §10).

---

## 11. Sessions 2–5 — preview (not for execution)

- **Session 2:** real Kenney sprites for all 15 room types (per §2 footprints), 3 construction stages derived from `constructionDaysLeft / totalDays`, full procedural math from §7.
- **Session 3:** ExteriorView with multi-story building (driven by `Property.floors`), animated marquee with active show title, time-of-day color grade (derived from `time.day % 7`).
- **Session 4:** `ParticleContainer` crowd seeded from `performanceHistory[].attendance`. Curtain-rise transition into running phase. Count-up money animations.
- **Session 5:** Final palette lock & recolor sweep, UI restyle, perf pass, remove legacy `src/game/rendering/`, drop `USE_RENDER2` flag and `@pixi/react` dependency.

---

End of plan. Awaiting Dixon approval before Session 1.
