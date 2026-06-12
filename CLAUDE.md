# CLAUDE.md — Theatre District

## What This Project Is
**Theatre District** — a cozy isometric street-builder fused with a theatre-production sim. One street that grows across five eras; the player places theatres, amenities, and decoration, an emergent crowd navigates toward Buzz, and clicking a theatre opens the **Production Desk** (the preserved Broadway Tycoon show-production systems: casting, rehearsal, events, Tony endgame). Formerly "Broadway Tycoon" — pivoted 2026-06-12 under the **Theatre District v2.1 spec**, which is the design source of truth. The old GDD (`docs/BROADWAY_TYCOON_GDD.md`) is historical reference for inherited show-production systems only.

**Read first, in order:** this file → `docs/THEATRE_DISTRICT_AUDIT.md` (what's preserved/replaced/new + room→upgrade mapping) → `docs/DESIGN_DECISIONS.md` (answered design questions) → `docs/BUILD_LOG.md` (session history).

## Who You're Working With
Dixon — creative director and product owner, not a developer. Explain in plain English, present design options with reasoning, never assume he reads diffs. **Routine engineering choices are yours; design/scope/feel choices are his** — stop and ask when one comes up, and record every answer in `docs/DESIGN_DECISIONS.md`.

## Stack — LOCKED, DO NOT CHANGE
React 19 + TypeScript · PixiJS v8 **imperative** (NOT @pixi/react — remove if you see it) · Zustand 5 single store · Tailwind 4 (React UI chrome only) · Vite 6 · Vitest · GitHub Pages · no backend · no audio. Engine migration was evaluated and rejected — do not propose Phaser/Godot/Three.

## Architecture Rules — MANDATORY
1. **PixiJS owns the canvas, React owns UI chrome.** Game loop runs in the PixiJS ticker.
2. **Fixed-timestep sim, decoupled from render.** 10 sim ticks/sec at 1x via an accumulator; render interpolates. Speed (2x/4x) = more sim ticks per frame — NEVER scale sim by frame delta. Clamp accumulated delta at ~250ms (backgrounded-tab protection).
3. **Pause sim when tab hidden** (`visibilitychange`). No offline progress — session game by design.
4. **Zustand holds only serializable game state** (money, buildings, shows, calendar, era, settings). **Crowd agents live OUTSIDE the store** in a plain sim module, never saved, respawn from game state on load. UI never subscribes to per-tick sim data — aggregates only, on a throttle.
5. **Bake procedural art to textures.** Building/people variants drawn with PixiJS Graphics ONCE, baked to RenderTextures/sprite sheets at boot. Time-of-day = one color-grade on the world container + an additive light layer. Never per-sprite filters, never re-bake per phase.
6. **Buzz recalculates on placement/removal/state change. Never per frame.**
7. **Every tunable number lives in `src/game/config/balance.ts`.** No magic numbers in logic code. Tuning must be a five-minute job.
8. **Sim math gets unit tests** (buzz, economy, momentum, calendar, save round-trip). UI does not — playtest covers it.

## World Spec — LOCKED NUMBERS
- Horizontal iso strip: 2-tile road, 1 sidewalk tile each side, lots 3 tiles deep both sides. Buildings auto-face the road.
- Street length by era: 20 → 28 → 40 → 52 → 64 columns.
- Footprints: Playhouse ~3×3, Mid-house ~4×3, Grand ~6×3; amenities 2×3/3×3; decoration 1×1 (string lights span two anchors). Finalize exact sizes Session 1.
- Time: 1 day ≈ 90 real seconds at 1x. Week = 7 days, season = 4 weeks, year = 4 seasons.
- Speeds: Pause/1x/2x/4x, always visible. Space = pause. Decision modals auto-pause.
- Pacing targets (tune balance.ts to hit): first opening night min 12–15 · second theatre min 30–40 · Era 1→2 at 35–45 min · full campaign 8–12 h.
- Desktop browser, min viewport 1280×720. No touch pre-1.0.

## Buzz — LOCKED SPEC
Spread 3 tiles, linear falloff (1.0 source → 0 at 4th ring). Tile value = SUM of sources. Empty lots emit zero; litter/neglect emit negative. Decoration has diminishing returns per overlapping pool (buildings don't). Overlay heatmap toggleable (Tab), OFF by default, colorblind-safe diverging palette + numeric hover readout. Prior-attempt `BuzzSystem.ts` (branch `feature/theatre-district`, broadway-tycoon-v2 checkout) matches this spec — port it and add the unit tests it never had.

## Art Direction — "Marquee Noir"
Fully procedural vector art in code. No external asset packs, ever. Golden-hour-into-night street: deep blue-black sky, tungsten marquee glow, neon accents — lighting IS the art style. Buildings: clean iso vector forms, marquee shows current show name, chase lights on hits. People: silhouettes with warm rim-light, 2-frame walk bob. Bloom on a dedicated light layer (ONE filter on the container), film grain, steam, wind particles; rain doubles every light via wet-street reflection — the most beautiful state in the game. Signature: nightly marquee-ignition cascade (functional S4, polished S9). UI chrome: playbill/ticket-stub — cream paper, black ink, sparse gold foil. Theatrical, never corporate, never cutesy. **NO emojis anywhere** — drawn glyphs/SVG only. Rendering kit built in Session 2; all later sessions draw from it.

**Memorial mark (required, subtle):** somewhere quiet and permanent — two overlapping OUTLINED gold circles (#c9a96e + #e2b955), right circle slightly smaller and a touch higher, unfilled. No label, no tooltip, no function. Do not theme it, animate it loudly, or attach UI.

## Theatre Interiors — Production Desk
Clicking a theatre opens a full-screen curtain-framed management view — NOT a spatial floor plan. Existing show systems (cast/rehearsal/decisions/run/Tonys) as styled panels. Old 15 room types → **Theatre Upgrades** purchase list — mapping table in `docs/THEATRE_DISTRICT_AUDIT.md` §5.

## Economy
~$50k start, derelict playhouse restore ~$15k, first production ~$20–25k all-in (exact values in balance.ts). **No bankruptcy game-over** — at $0 the street enters **Dark Week** (lights dim, construction locked, once-per-era patron rescue). Income in legible beats (nightly box office, post-show amenity surge), not trickle.

## Naming Collision — "buzz"
**Buzz** = the spatial tile field, exclusively. The old marketing/word-of-mouth 0–100 score is renamed **hype** when folded into show momentum (Session 6). Never conflate them.

## Saves
Versioned envelope machinery preserved from BT (`src/store/saveManager.ts`). Theatre District schema starts at TD-v1, key prefix `theatre-district-save-`. Broadway Tycoon saves: version-gated, abandoned, NOT migrated (Dixon-approved). Autosave at day rollover + 3 manual slots + one-click JSON file export/import. Keep migration machinery for TD's own future versions.

## Controls (target)
Space pause · 1/2/3 speed · B build menu · Esc/right-click cancel placement · P photo mode · Tab buzz overlay · H Almanac. Ghost preview with validity tint, shift-click repeat-place, demolish confirms on buildings only.

## Dev Tooling
`?dev=1` debug panel (Session 1): add money, advance day/week/season, jump-to-era (constructs representative street), crowd surge, force weather/event, FPS/sim-tick meter. First-class deliverable — eras 3–5 are playtested through it.

## Session Plan & Status
Campaign runs Sessions 0–10 (see v2.1 spec). **Mandatory stops:** #1 after Session 0 (audit approval) · #2 after Session 4 (core-loop fun check + demo deploy). Anytime-stop on design/scope/feel questions.

- ✅ **Session 0** (2026-06-12) — audit, pivot plan, CLAUDE.md, surface renames. → STOP #1 PASSED (salvage-quarry · rename everywhere · /v3/ down)
- ✅ **Session 1** (2026-06-12) — foundation shipped: balance.ts, SimClock (fixed 10t/s), calendar, topology, TD store, saves TD-v1 + JSON file export/import, new shell, camera, debug street view, dev panel, 33 unit tests. Legacy BT store/UI quarantined (unimported, compiles) until Session 5 folds the show systems in.
- ✅ **Session 2** (2026-06-12) — Marquee Noir kit shipped (`src/game/render/kit/`): palette + 6-keyframe grade (one world tint + sky tints + light-layer alpha), bake-once pipeline, building factory with base/emissive texture pairs, additive light layer w/ single BlurFilter bloom, sky/grain/steam atmosphere, era-aware lamp dressing, derelict playhouse seeded in newGame (carries the memorial mark), dev-panel time jumps. Screenshots in docs/theatre-district/.
- 🔲 Session 3 — placement UX + Buzz + overlay + litter (unit tests: spread/falloff/sum/diminishing)
- 🔲 Session 4 — crowds, showtime rhythm, marquee ignition, core loop closes (4a/4b split allowed) → STOP #2, deploy demo
- 🔲 Session 5 — Production Desk (full show-system reuse, upgrades list, zero logic regressions)
- 🔲 Session 6 — show lifecycle, 3 critics, Daily Playbill, demographics, pricing elasticity (tests: momentum, elasticity)
- 🔲 Session 7 — seasons, weather + rain reflections, word-of-mouth, weekend pulse, maintenance, Dark Week (tests: economy tick × season/weather)
- 🔲 Session 8 — 5 eras, gates/turnovers, authored opening + skip, teach cards + Almanac, rival events, recognitions, finale Gala, photo mode
- 🔲 Session 9 — juice & cohesion, marquee-ignition showcase, perf pass
- 🔲 Session 10 — QA, full playthrough, deploy, README

**Every session ends with:** typecheck clean (`npm run build` — the real build, not `tsc --noEmit`) · tests green · game boots · save/load round-trips · one-paragraph `docs/BUILD_LOG.md` entry (+ screenshot when visual) · clean commits.

## Content Floor (1.0 minimums)
3 theatre tiers · 6 amenities · 12 decorations · 5 genres · 3 critics · 4 demographics · ≥8 new street events + 15 existing theatre events · ~40 peep thoughts · ~10 teach cards · 5 gated eras.

## Budgets
60fps mid-tier laptop, full street, 150+ agents (cull off-screen, pool particles/agents, baked textures). Load < 3MB.

## Repo Layout
- This checkout (`~/Code/theatre-district`): branch `theatre-district` — ALL v2.1 work here. GitHub repo: `dixxxvhb/theatre-district` (renamed from `broadway-tycoon` at Stop #1). Merge to main + deploy at Stop #2 and Session 10. Commit per coherent change, no monoliths.
- `~/Code/broadway-tycoon-v2`: second checkout of the same repo, on old branch `feature/theatre-district` — the superseded prior pivot attempt (salvage quarry, see audit §2). Read from it; don't work in it.
- Live: `dixxxvhb.github.io/theatre-district/` — root gets the TD demo at Stop #2 (placeholder until then); old Broadway Tycoon preserved playable at `/classic/`; the prior-attempt `/v3/` deploy was removed at Stop #1 (Dixon's call).

## File Map (target shape — Session 1 establishes)
```
src/
├── game/
│   ├── config/balance.ts      ← EVERY tunable number
│   ├── sim/                   ← fixed-timestep loop, calendar, crowd module (outside store)
│   ├── street/                ← topology, tiles, buzz field, placement validation
│   ├── render/                ← Marquee Noir kit: palette, grading, building factory, light layer, particles, weather
│   ├── systems/               ← preserved show-production systems
│   └── data/                  ← shows, staff, decisions, events, critics, peep thoughts
├── store/                     ← Zustand store + saveManager (TD-v1)
└── ui/                        ← React chrome: Production Desk, build palette, Playbill, Almanac, dev panel
```

## Commands
- Dev: `npm run dev` (5173) · Build/typecheck: `npm run build` · Tests: `npm run test` (Vitest, from Session 1)

## Commit Convention
`feat:` `fix:` `refactor:` `docs:` `balance:` `art:` `test:` — scope prefix `(theatre-district)` optional; branch carries context.
