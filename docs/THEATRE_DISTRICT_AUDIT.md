# Theatre District — Session 0 Audit & Pivot Plan

**Date:** 2026-06-12 · **Branch:** `theatre-district` (from `main` @ e8f73d0) · **Spec:** Theatre District v2.1 (supersedes all earlier prompts)

This is the canonical inventory of what exists, what gets preserved, what gets replaced, and what gets built new. Written before any pivot code. Companion docs: `CLAUDE.md` (architecture rules every session inherits), `docs/DESIGN_DECISIONS.md` (answered design questions), `docs/BUILD_LOG.md` (per-session log).

---

## 1. What exists on `main` (the inherited game)

Broadway Tycoon, playable MVP + v2 overhaul, ~9.5k LOC TypeScript. React 19 + PixiJS v8 (imperative) + Zustand 5 + Tailwind 4 + Vite 6. The 2026-05-26 audit's [BROKEN] findings were fixed on main before this pivot (save versioning v2, preset modifiers wired, Tony ceremony mounted, low-attendance loss, director-decision persistence).

### Core simulation (`src/game/`)

| Module | LOC | What it does | Fate |
|---|---|---|---|
| `systems/ShowSystem.ts` + `data/shows.ts` | 112 + 275 | Show generation: 5 genres, 6 archetypes, quality/appeal ranges, title generator | **PRESERVE** |
| `systems/RehearsalSystem.ts` + `data/decisions.ts` | 81 + 107 | Rehearsal progress, readiness, 5 director decisions | **PRESERVE** |
| `systems/PerformanceSystem.ts` | 208 | Nightly attendance/revenue, matinee/Saturday modifiers, word-of-mouth weight | **PRESERVE** (wrapped by new show lifecycle) |
| `systems/EventSystem.ts` | 492 | 15 random events (positive/negative/choice) | **PRESERVE** (re-presented: toasts vs auto-pause modals) |
| `systems/RivalSystem.ts` + `data/rivals.ts` | 134 + 87 | AI rival producers, show competition | **PRESERVE** (reframed as off-screen rival district) |
| `systems/MarketingSystem.ts` + `data/trends.ts` | 92 + 72 | Marketing campaigns → "buzz" 0–100, genre trends | **PRESERVE logic, RENAME concept** (see §6 naming collision) |
| Tony logic (store + `TonyAwardsModal`) | — | Nominations, wins, reputation effects | **PRESERVE** |
| `data/staff.ts` | 244 | 11 crew roles, salaries, candidate generation | **PRESERVE** |
| `systems/BuildingSystem.ts` + `data/rooms.ts` + `data/properties.ts` + `data/presets.ts` | 133 + 185 + 107 + 416 | Spatial room placement, 15 room types, property lots, cosmetic presets | **REPLACE** (rooms → upgrades list §5; presets superseded by art direction) |
| `engine/GameLoop.ts` + `engine/TimeManager.ts` | 422 + 104 | Ticker-driven day loop (frame-delta accumulator, 60 ticks/day) | **REPLACE** (fixed-timestep 10 ticks/sec sim, decoupled render) |
| `data/constants.ts` | 206 | All balance numbers (good discipline already) | **REPLACE** with `src/game/config/balance.ts` (carry values that survive) |

### Rendering (`src/game/canvas/`, `src/game/rendering/`)

All six classes — `GameCanvas` (465), `FloorPlanRenderer` (547), `IsometricRenderer` (157), `RoomRenderer` (342), `ConnectionRenderer` (142), `ConstructionRenderer` (89), `CameraController` (229) — render the single-building floor plan. **REPLACE** entirely with the Session 2 rendering kit. `CameraController`'s pan/zoom/bounds logic and `utils/isometric.ts` projection math are adaptable references.

Notable: rendering is fully imperative PixiJS (correct per spec). `@pixi/react` is in package.json but never imported — dead dependency, removing in Session 1.

### State & saves (`src/store/`)

- `gameStore.ts` (826): single Zustand store, serializable, ~45 actions. **PRESERVE pattern, RESHAPE state** in Session 1 (street/buildings/calendar/era replace grid/rooms/property).
- `saveManager.ts` (205): versioned envelope (`SAVE_VERSION = 2`), forward-migration, 5 manual slots + autosave, index, base64 export/import. **PRESERVE machinery.** Theatre District starts its own schema at TD-v1 under a new key prefix (`theatre-district-save-`); Broadway Tycoon saves are version-gated and abandoned (Dixon-approved, sole player). Export/import upgrades from base64 string to one-click JSON file download/upload.

### UI (`src/ui/`, `src/App.tsx`)

~70% of the UI layer is pure show-production presentation with zero spatial coupling and re-skins cleanly to Marquee Noir: `ShowPickerModal` (367), `AuditionModal` (501), `SaveLoadModal` (422), `EndOfRunModal` (202), `EventModal` (96), `GameOverModal` (76), `TonyAwardsModal` (87), `DirectorDecisionModal` (50), `RunDashboard` (350), `MarketingPanel` (149), `RehearsalView` (164), `StaffPanel` (490), `NotificationToast`, `MoneyDisplay`, `RivalTicker`. These become the panels inside the **Production Desk**.

**REPLACE:** `App.tsx` (691 — 7-branch phase tree + 5 inline components; becomes street-first shell), `BuildPanel` (room placement), `PropertySelect` (single-building framing), `MainMenu` (re-skin).

Zero emojis in src/ (good — spec bans them). Stars use Unicode ★/☆ glyphs.

### Infrastructure gaps

- **No tests.** No Vitest, no config, no test files. Session 1 adds Vitest + first unit tests (calendar math, save round-trip).
- **No CI/CD.** Deploys are manual builds pushed to `gh-pages`. Fine for now; revisit at Session 10.
- `vite.config.ts` base is `/broadway-tycoon/` — deploy path decision parked for Stop #1 / Session 10.
- 3 npm vulns in devDeps; Session 1 housekeeping.

---

## 2. The prior pivot attempt (`feature/theatre-district`)

The v2.1 prompt states the earlier pivot "was never executed." On disk, a prior attempt **exists**: branch `feature/theatre-district` (11 commits, Sessions 1–8 + Phases 9–11), deployed to `dixxxvhb.github.io/broadway-tycoon/v3/`, never merged to main. It is a playable street-builder prototype — but it does **not** meet the v2.1 spec, and v2.1 supersedes it.

**Disposition (recommended): salvage quarry, not the base.** Build v2.1 fresh from `main` on this branch; lift verified pieces from the prior attempt where they already match the locked spec.

Where it fails v2.1:

| v2.1 locked requirement | Prior attempt |
|---|---|
| Fixed-timestep sim (10 ticks/sec, accumulator, render interpolates) | Frame-delta ticking on the PixiJS ticker — time drifts with framerate |
| Bake procedural art to textures at boot | Per-entity per-frame `Graphics` drawing; bake pipeline scaffolded, never implemented |
| Single time-of-day color grade + additive light layer | Background tint only; sprites unlit |
| All tunables in `balance.ts` | Tuning constants scattered across 4+ files |
| Production Desk (curtain-framed full-screen) | Tabbed `TheatreModal` bridge |
| Unit-tested sim math | Zero tests |
| Marquee Noir art direction, day/night lighting story, weather, particles | None of it |
| Eras/seasons/critics/demographics/lifecycle/teach cards/photo mode | None of it |

What's worth lifting (verified by this audit):

| Salvage | Why |
|---|---|
| `BuzzSystem.ts` numerics | Hand-verified against 7 test cases; exactly matches the locked spec (3-tile spread, linear falloff 1.0/0.75/0.5/0.25→0, summation, decoration diminishing-returns pool, litter negative, event-driven recompute). Port + give it the unit tests it never had. |
| `render2/coords.ts`, `depth.ts` | Iso projection + layer/z-sort math, spec-agnostic |
| Crowd SoA layout (`CrowdSystem.ts`) | Typed-array structure-of-arrays agent storage, agents outside the store, buzz-gradient steering (not A*) — right shape, wrong tick model; adapt to fixed timestep |
| `TheatreStats.ts` / `TheatrePerformance.ts` patterns | Pure-function derivations of theatre stats from street context |
| `withRecomputedBuzz()` slice pattern | Buzz recalc wrapped around every placement mutation — correct trigger discipline |
| ParticleContainer crowd rendering | Pre-allocated 300-particle pool, O(n) sync, no per-frame allocation |

---

## 3. Preserved / Replaced / New — summary

**PRESERVED (logic intact, re-presented):** versioned save machinery · show generation (5 genres, 6 archetypes) · audition/casting + chemistry · 11-role crew system · rehearsal + 5 director decisions · nightly performance math · 15-event system · rivals (→ rival district) · Tony endgame · marketing logic (renamed, §6) · trends (→ season/era texture) · ~15 production-facing UI components (re-skinned into the Production Desk).

**REPLACED:** floor-plan/iso renderers + GameCanvas → Session 2 rendering kit · ticker game loop → fixed-timestep sim · single-building framing (PropertySelect/BuildPanel/BuildingSystem/properties/grid) → street topology + direct placement · spatial room placement → Theatre Upgrades list (§5) · presets.ts → Marquee Noir building factory · constants.ts → balance.ts · App.tsx phase tree → street-first shell · MainMenu re-skin.

**NEW:** iso street grid + era growth (20→64 columns) · calendar (day pulse, weekday/weekend, 4 seasons) · spatial Buzz field + overlay · crowd sim module (outside store) + peep thoughts (~40 lines) · showtime rhythm + marquee ignition · Marquee Noir rendering kit (palette, grading, building factory, bake pipeline, light/bloom layer, particles, weather) · amenities (6) + decoration (12) · litter/maintenance/street crew · show lifecycle wrapper (announce→previews→opening→review→run→closing) · 3 named critics · Daily Playbill · 4 demographics weighting tables · ticket elasticity · Dark Week + patron rescue · 5 eras + milestone gates + turnover beats + finale Gala · authored first 15 min + skip · teach-on-first-encounter cards + Almanac · ≥8 street events · 3 archetype recognitions + photo mode · dev panel (`?dev=1`) · Vitest + sim unit tests · JSON-file save export/import · memorial mark.

---

## 4. Old campaign → era mapping

The existing 5-act campaign (`ACT_THRESHOLDS: [0, 2, 5, 8, 10]` by show count) and rival pressure map onto the five eras: act-gating logic is replaced by milestone checklists (era gates are multi-condition, not show-count), and `RivalSystem`'s rivals become the off-screen rival district that generates pressure events from Era 4. Tony quality/performance thresholds (80/60, min act 4) carry into Era 5's endgame via `balance.ts`.

---

## 5. Room types → Theatre Upgrades mapping (required deliverable)

The 5 *required* rooms exist as the baseline of every placed theatre (a theatre works on day one); their upgrade forms improve that baseline. The 10 optional rooms convert directly. Same logical bonuses, no spatial placement. Exact numbers land in `balance.ts` (Session 5).

| # | Old room (cost/days) | TD Upgrade | Carried-over logical bonus |
|---|---|---|---|
| 1 | Lobby — req ($15k/3d) | **Grand Lobby** | Bigger pre-show gathering outside (buzz emission ↑), ambiance ↑ |
| 2 | Box Office — req ($8k/2d) | **Modern Box Office** | Faster queues (fewer queue-complaint peep thoughts), small attendance ↑ |
| 3 | Seating — req ($25k/5d) | **House Expansion** | +capacity (within theatre-tier cap) |
| 4 | Stage — req ($30k/5d) | **Stage Renovation** | Show quality ceiling ↑ |
| 5 | Backstage — req ($20k/4d) | **Backstage Complex** | Faster show turnaround, supports larger casts |
| 6 | Dressing Room ($12k/3d) | **Star Dressing Rooms** | Cast morale ↑, star-casting appeal ↑ |
| 7 | Orchestra Pit ($18k/4d) | **Orchestra Pit** | Musical-genre quality bonus |
| 8 | Rehearsal Hall ($22k/5d) | **Rehearsal Hall** | Rehearsal speed/outcome ↑ (spec's own example) |
| 9 | VIP Lounge ($35k/4d) | **VIP Lounge** | Premium revenue ↑, society-crowd appeal ↑ |
| 10 | Concession ($10k/2d) | **House Bar & Concessions** | Per-guest revenue ↑ (spec's "bar" example) |
| 11 | Storage ($5k/1d) | **Scenic Storage** | Show changeover cost ↓ |
| 12 | Office ($8k/2d) | **Production Office** | Crew capacity ↑ (carries the 3/5/7 crew caps) |
| 13 | Tech Booth ($15k/3d) | **Lighting & Sound Booth** | Production quality ↑, fewer technical-mishap events |
| 14 | Green Room ($12k/3d) | **Green Room** | Cast/crew morale ↑ on long runs |
| 15 | Restrooms ($6k/2d) | **Renovated Restrooms** | Audience-satisfaction floor (removes negative-review drag) |
| 16 | — (new, from spec example) | **Fly System** | Unlocks spectacle staging (big_spectacle archetype bonus) |

---

## 6. Naming collision — "buzz"

The old game's marketing system produces a 0–100 **buzz** score per show. Theatre District's **Buzz** is the spatial tile field. Two different concepts, one word. Resolution: the old marketing/word-of-mouth concept is renamed **hype** when wrapped into show momentum (Session 6); **Buzz** refers exclusively to the street tile field from Session 3 onward. Recorded here so no session conflates them.

---

## 7. Open items for Stop #1 (Dixon decides)

1. **Prior attempt disposition** — confirm salvage-quarry approach (recommended) vs. building on top of the old `feature/theatre-district` branch.
2. **Deploy address** — keep `dixxxvhb.github.io/broadway-tycoon/` (Theatre District replaces the game at the existing URL, old game preserved at a sub-path) vs. rename the GitHub repo to `theatre-district` (cleaner URL, old links break). Decision needed by Session 10; default if no preference: keep repo name, deploy TD at root, old game moves to `/classic/`.
3. **The `/v3/` prototype** — leave the prior attempt's deploy up or take it down once v2.1's demo deploys at Stop #2.

---

## 8. Session plan readiness

No blockers found. Session 1 (foundation) can start immediately on approval: the store reshape, fixed-timestep loop, calendar, save schema TD-v1, and dev panel have no dependency on unresolved questions. Open items in §7 only gate Session 10 (deploy) and cleanup.
