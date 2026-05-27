# CLAUDE.md — Broadway Tycoon

## What This Project Is
Broadway Tycoon is a browser-based theater management simulation game. The player buys real estate in NYC's Theater District, builds a theater from scratch, produces original shows, casts talent, and manages nightly performances for profit and reputation.

**Full Game Design Document:** `docs/BROADWAY_TYCOON_GDD.md` — this is the source of truth for all game design decisions. Read the relevant section(s) before implementing any feature.

## Tech Stack
- **Rendering:** PixiJS v8 — **imperative**, NOT `@pixi/react`. (CLAUDE.md previously misstated this; `@pixi/react` is in `package.json` but unused.)
- **UI:** React 19 + TypeScript (menus, panels, overlays)
- **Build:** Vite
- **State:** Zustand v5 — slice-composition pattern (see `src/store/slices/streetSlice.ts` for the canonical example)
- **Styling:** Tailwind CSS v4 (UI only, not canvas)
- **Save:** localStorage with versioned migration + custom Float32Array round-trip
- **Source control:** GitHub

## Architecture Rules — READ THESE FIRST
1. **PixiJS owns the game canvas.** All tile rendering, sprites, camera, isometric math = PixiJS. React does NOT render game objects.
2. **React owns UI chrome.** Menus, panels, dashboards, modals, toasts = React components.
3. **Zustand is the single source of truth.** Both PixiJS and React read/write the same store. Store must be JSON-serializable — NO functions, class instances, or circular refs.
4. **Game loop = PixiJS ticker.** Economy calcs, event checks, time progression all run in `app.ticker.add()`.
5. **Balance constants live in `src/game/data/constants.ts`.** Never hardcode game numbers in system logic. Always reference the constants file.
6. **Two views, one data model.** Isometric exterior and top-down floor plan both render from the same BuildingState. Switching views = different projection math, same data.

## How to Reference the GDD
The GDD is large (~20 sections). Don't read the whole thing every session. Instead:
- **Always read this CLAUDE.md first** for current state and priorities
- **Read the specific GDD section(s)** relevant to what you're building
- **GDD section map:**
  - Scaffolding/setup → Sections 2, 3
  - Game canvas/rendering → Section 5
  - Real estate/properties → Section 6
  - Building/rooms → Sections 7, 14
  - Shows/auditions → Sections 8, 10
  - Crew/staff → Section 15
  - Economy/money → Section 11
  - Events → Section 13
  - Run phase/idle → Section 9
  - Progression → Section 12
  - Save system → Section 17
  - MVP scope → Section 18
  - Art/assets → Section 16
  - Balance tuning → Appendix B

## Development Order
Follow this sequence. Each step should be a working, testable increment:

1. ✅ Project scaffolding (Vite + React + TS + PixiJS + Zustand + Tailwind)
2. ✅ Basic canvas (PixiJS Stage in React, pan/zoom camera)
3. ✅ Grid system (tile grid, floor plan rendering, cell selection)
4. ✅ Room placement (build palette, drag-to-place, validation, snapping)
5. ✅ Time system (day counter, speed controls, pause)
6. ✅ Property system (selection screen, purchase flow)
7. ✅ Economy basics (bank balance, construction costs)
8. ✅ Show system (generation, picker UI, archetypes)
9. ✅ Audition system (candidates, casting UI)
10. ✅ Crew hiring (roles, hiring panel, salaries)
11. ✅ Rehearsal system (readiness meter, events)
12. ✅ Marketing (options, buzz score)
13. ✅ Performance system (nightly loop, attendance, revenue)
14. ✅ Event system (random events, modals, consequences)
15. ✅ Run management (price adjustment, end conditions, summary)
16. ✅ Save system (serialize, localStorage, slots, auto-save)
17. ✅ Full loop integration (connect all phases, test full playthrough)
18. 🔲 UI polish (dashboards, graphs, notifications, tooltips)

Mark ✅ as each step completes.

## Current State
- **Active branch:** `feature/theatre-district` — building "Theatre District," a fusion of an expandable iso STREET city-builder with the existing show-production systems opened as click-into modals.
- **Last completed:** Theatre District shipped to gh-pages at `/broadway-tycoon/v3/` alongside legacy v2.1.0 at `/broadway-tycoon/`. Feature branch `feature/theatre-district` pushed to origin. 11 commits past main. main still on v2.1.0 (no merge done — too aggressive without Dixon's explicit go).
- **Live URLs:**
  - https://dixxxvhb.github.io/broadway-tycoon/ — legacy v2.1.0 (untouched)
  - https://dixxxvhb.github.io/broadway-tycoon/v3/ — Theatre District (Sessions 0–10 + Phase 9 + Phase 10)
- **Final handoff:** `docs/theatre-district/SESSION-8-HANDOFF.md`
- **Next priority:** Dixon-driven. Kenney atlases drop, agent building-collision, merge feature/theatre-district to main, push out new v3.0.0 release.
- **`main`** still has playable Broadway Tycoon v2.1.0. Theatre District work won't reach main until at least after MANDATORY STOP 2 (end of Session 4) plus user playtest sign-off.
- **`USE_RENDER2` flag** (`.env.local` → `VITE_USE_RENDER2=true`) toggles new street renderer vs legacy floor plan. Dev runs with it ON.

## Theatre District Plan
Multi-session autonomous build per the user's spec. Session sequence:
- ✅ Session 0 — Audit & architecture (mandatory stop 1, approved)
- ✅ Session 1 — Isometric street foundation
- ✅ Session 2 — Direct placement & street builder
- ✅ Session 3 — Buzz engine + heat-map overlay
- ✅ Session 4 — ParticleContainer crowd (STOP 2 marker; waived by user)
- ✅ Session 5 — Showtime rhythm
- ✅ Session 6 — Theatre layer reintegration (bridge)
- ✅ Session 7 — Reactive texture
- ✅ Session 8 — Visual cohesion + ship
- 🔲 Session 5 — Showtime rhythm
- 🔲 Session 6 — Reintegrate Theatre layer (cast/rehearsal/events/Tony as modal)
- 🔲 Session 7 — Reactive texture (litter, staff, amenity upgrades)
- 🔲 Session 8 — Visual cohesion (palette enforcement, lighting, UI restyle)

Hard rules: do not rewrite show logic (reuse); preserve & extend versioned save; no backend; no audio; no AI-generated art; do not redesign the Buzz spec; stop at every stop point.

## GDD Updates Needed
If implementation reveals a design issue, do NOT change the GDD. Instead:
1. Add the issue here with a description
2. Use a temporary value in code marked with `// TODO: GDD says X, using Y — needs Dixon review`
3. Dixon reviews and approves all design changes

*No pending GDD updates.*

## Known Issues
*None yet.*

## Session Log
- **2026-03-28:** GDD v1.0 written and approved. CLAUDE.md created. Project ready for scaffolding.
- **2026-03-28:** GDD v1.0 re-drafted (previous version lost from chat context). Full 18-section GDD at `docs/BROADWAY_TYCOON_GDD.md`. Pending Dixon review before scaffolding.
- **2026-03-28:** Step 1 complete. Vite + React 19 + TS + PixiJS v8 + @pixi/react + Zustand v5 + Tailwind v4 scaffolded. 13 Zustand slices, full type system, all balance constants. Dev server running at localhost:5173. Build passes clean.
- **2026-03-28:** Steps 2-17 complete in one session. Consolidated project from Desktop duplicates to ~/Documents/Claude Projects/Code/broadway-tycoon/. Complete GDD (1469 lines, 18 sections) restored. All systems built: canvas+camera, grid+tiles, room placement+validation, time system, property selection, economy, show generation+picker, auditions+casting, crew hiring, rehearsal system, marketing campaigns, nightly performance loop, event system (15 events), run management, save/load (5 slots + autosave), full game loop integration with phase transitions, toast notifications, keyboard shortcuts. Build passes clean. Game is playable end-to-end.
- **2026-05-27:** Theatre District pivot. Session 0 audit + architecture approved (LOW reuse cost, PerformanceSystem input refactor in-scope, slice composition adopted). Session 1 complete: salvaged iso renderer primitives from abandoned Phase A-D multi-floor work onto new `feature/theatre-district` branch off main; added street slice + `StreetState` types + save v3 (additive, Float32Array round-trip); rendered placeholder street smoke-verified. Pre-Theatre-District multi-floor snapshot preserved on `archive/session-1-multifloor`.
- **2026-05-27:** Session 2 — direct placement & street builder. BUILDING_DEFINITIONS + DECORATION_DEFINITIONS data file with cost/footprint/build days. Slice actions: placeBuilding/placeDecoration/removeBuilding/removeDecoration with full validation (bounds + ownership + no-overlap + can-afford) and cash deduction; acquirePlot now enforces adjacency + cost. BuildingSprite + DecorationSprite procedural classes (Kenney sprite swap is later — same constructor API). StreetView composer with additive Map&lt;id, sprite&gt; diff + ghost preview overlay. Render2Canvas pointer wiring for place/acquire/select. StreetBuildPanel UI gates legacy BuildPanel when USE_RENDER2=true. Smoke verified: $500k → $375.6k after placing 3 buildings + 6 decor + 1 plot; overlap rejected; bounds expanded; zero console errors.
- **2026-05-27:** Session 3 — Buzz engine + heat-map overlay (LOCKED spec, verbatim). BuzzSystem.computeBuzz pure function: Chebyshev 3-ring linear falloff, building anchors full-strength (theatre 8, restaurant 4, cart 2; unfinished don't emit), decoration per-tile diminishing-returns sort (k=0.6), litter negative emission. withRecomputedBuzz helper wraps every mutating action in streetSlice. BuzzOverlay class (single Graphics, gold↔filament for positive / coal↔ink for negative). Toggle in StreetBuildPanel "View" section. Math hand-verified across 7 sample tiles (theatre center 9.40, far corner 2.25, exact agreement). Visual gradient confirmed in browser. Zero console errors.
- **2026-05-27:** Session 4 — ParticleContainer crowd. CrowdSystem singleton outside Zustand (lives there because crowd ticks 60×/sec and never persists). SoA typed arrays: posX/Y, velX/Y, target, state, wallet (cents/Int32), mood, spendTicks, ticksAlive, active+freelist. Max 300 agents. Buzz-gradient pathfinding (Chebyshev neighbor sample with noise; greedy not A*). Spawn at owned edge tiles with rate proportional to total positive buzz. Wallet $10–$30 in cents. Per-kind spend: theatre $5/restaurant $3/cart $2 with N-tick spending lock. Mood bumps on spend; floor triggers LEAVING state. CrowdRenderer first PixiJS v8 ParticleContainer use — pre-allocated particle pool, procedural 4×4 white texture, tint per state. Integrated in StreetView; engine ticker drives tickCrowd + sync. Smoke verified: 5,401 amenity txns + $18.7k revenue in test window, agents visibly stream from edge toward theatre, zero console errors. STOP 2 surfaced; user waived → continued.
- **2026-05-27:** Session 5 — Showtime rhythm. TimeSystem.ts (independent of legacy GameLoop): 60s/day at normal, 5-phase cycle quiet→preshow→curtain→postshow→winddown, construction days tick, save v4 adds street.timeOfDay. Crowd modulation per phase (preshow 2× spawn, curtain 0.4× w/ theatre-tile despawn, postshow 3× from theatres, winddown 0.7×). Saturating spawn formula. Wallet tuned $5-$15, revenue tier theatre $3/restaurant $2/cart $1. StreetClock overlay (Day N · HH:MM · phase chip).
- **2026-05-27:** Session 6 — Theatre layer reintegration. TheatreStats adapter derives capacity/ambiance/facility from PlacedBuilding + nearby decoration (fountain unlocks VIP flair, posters raise ticket price, amenities boost facility). TheatrePerformance.runPerformance pure function with quality roll + popularity bands (hit/flop/drift). Reuses legacy generateShowTitle. runTheatrePerformance slice action credits revenue + updates building.popularity + lastPerformance. BuzzSystem reads theatre.popularity as emission multiplier. TheatreModal: Production Studio with stats grid + last-performance summary + Run a Performance button. Click theatre → Enter Theatre.
- **2026-05-27:** Session 7 — Reactive texture. Litter accumulates: 5% chance per crowd-spend, drops on adjacent owned non-building tile, stacks to amount 5. TimeSystem tickLitter decays 1/day (sweeper removes worst spot wholesale). Sweeper hire $50/day via tickSweeperPayroll. LitterLayer renders golden-angle scatter of coal dots. Amenity upgrade tier 1→2 (theatre $40k / restaurant $12k / cart $2.5k) gives +25% buzz + popularity floor 1.2. Staff + Upgrade UI in panel.
- **2026-05-27:** Session 8 — Visual cohesion + ship. initGame routes directly to building phase + auto-unpauses when USE_RENDER2. IsoEngine.setBackgroundColor tints canvas per dailyPhase (warm dusk / deep velvet / golden afterglow / cool slate / midnight). Save/load round-trip verified: 36.4KB saves preserve all 12 sampled fields incl. Float32Array buzzField. Final handoff at docs/theatre-district/SESSION-8-HANDOFF.md. Mostly-working condition achieved across 8 sessions / 9 commits on feature/theatre-district.
- **2026-05-27:** Phase 9 — Full show production reuse in TheatreModal. Tabbed flow (Show/Cast/Rehearse/Run) that drives legacy Show/CastMember/Role data + actions (generateShow, generateCastCandidate, castRole, startRehearsals, advanceRehearsal — all reused). Per-role audition reveals 3 candidates from generateCastCandidate. Rehearsal events log via existing RehearsalSystem REHEARSAL_EVENTS table. Run tab roll informed by show.scriptQuality so cast+script choices matter. closeTheatreShow finalizes popularity from avg attendance + critic score. End-to-end verified: commission → cast 4 roles → 21 rehearsal days → 3 performances → close with popularity settling per critic factors.
- **2026-05-27:** Phase 10 — Procedural visual upgrade. BuildingSprite v2: pitched roofs (slanted ridge), window grids on both walls (theatre 2×4, restaurant 1×3, cart 1×2), awning + door + door-slit light, theatre marquee with bulb dots (2 staggered rows). Lit-window effect at preshow/curtain/postshow phases: window fill switches to filament gold + 12% halo, door slit + marquee bulbs go bright with halos. TileLayer sidewalk detail: inner panel seam, deterministic cracks + manholes via prime-modulus pattern. DecorationSprite v2: cast-iron lamp pole with collar/bracket + double-halo, two-tier fountain with water sheen + droplet sprites. Visual jump confirmed in browser screenshot — placeholder sprites now read as "designed."
- **2026-05-27:** Phase 11 — Shipped to gh-pages. Built with `vite build --base /broadway-tycoon/v3/`, deployed via gh-pages worktree → /v3/ subdir, legacy v2.1.0 untouched at /broadway-tycoon/. Both URLs verified 200. Feature branch feature/theatre-district pushed to origin (open PR ready: github.com/dixxxvhb/broadway-tycoon/pull/new/feature/theatre-district). Main not merged — left for Dixon's explicit go.

## Dev Server
- Command: `npm run dev`
- Default port: 5173
- If port conflict, use next available and note it here

## Commit Convention
- `feat:` — New feature or system
- `fix:` — Bug fix
- `refactor:` — Code restructure without behavior change
- `docs:` — Documentation updates
- `balance:` — Game balance/constant changes
- `art:` — Asset additions or changes
