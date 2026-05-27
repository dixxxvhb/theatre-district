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
- **Last completed:** Theatre District Session 3 — Buzz engine + heat-map overlay (LOCKED spec, implemented verbatim). `BuzzSystem.computeBuzz()` pure function with Chebyshev 3-ring linear falloff, building anchors full-strength, decoration per-tile diminishing returns sort (k=0.6), litter negative emission. Event-driven recompute on every placement / removal / plot acquisition. Toggleable heat-map overlay (gold = high, dark = negative). Math hand-verified across 7 sample tiles.
- **Live handoff:** `docs/theatre-district/SESSION-3-HANDOFF.md`
- **Next priority:** Session 4 — ParticleContainer crowd. Then MANDATORY STOP 2 (playtest sign-off before continuing).
- **`main`** still has playable Broadway Tycoon v2.1.0. Theatre District work won't reach main until at least after MANDATORY STOP 2 (end of Session 4) plus user playtest sign-off.
- **`USE_RENDER2` flag** (`.env.local` → `VITE_USE_RENDER2=true`) toggles new street renderer vs legacy floor plan. Dev runs with it ON.

## Theatre District Plan
Multi-session autonomous build per the user's spec. Session sequence:
- ✅ Session 0 — Audit & architecture (mandatory stop 1, approved)
- ✅ Session 1 — Isometric street foundation
- ✅ Session 2 — Direct placement & street builder
- ✅ Session 3 — Buzz engine + heat-map overlay
- 🔲 Session 4 — ParticleContainer crowd → MANDATORY STOP 2 (user playtest)
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
