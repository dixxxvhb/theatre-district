# CLAUDE.md — Broadway Tycoon

## What This Project Is
Broadway Tycoon is a browser-based theater management simulation game. The player buys real estate in NYC's Theater District, builds a theater from scratch, produces original shows, casts talent, and manages nightly performances for profit and reputation.

**Full Game Design Document:** `docs/BROADWAY_TYCOON_GDD.md` — this is the source of truth for all game design decisions. Read the relevant section(s) before implementing any feature.

## Tech Stack
- **Rendering:** PixiJS v8 + @pixi/react (game canvas)
- **UI:** React 19 + TypeScript (menus, panels, overlays)
- **Build:** Vite
- **State:** Zustand (single serializable store shared by PixiJS and React)
- **Styling:** Tailwind CSS v4 (UI only, not canvas)
- **Save:** localStorage (MVP), Firebase Firestore (post-MVP)
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

1. ✅/🔲 Project scaffolding (Vite + React + TS + PixiJS + Zustand + Tailwind)
2. ✅/🔲 Basic canvas (PixiJS Stage in React, pan/zoom camera)
3. ✅/🔲 Grid system (tile grid, floor plan rendering, cell selection)
4. ✅/🔲 Room placement (build palette, drag-to-place, validation, snapping)
5. ✅/🔲 Time system (day counter, speed controls, pause)
6. ✅/🔲 Property system (selection screen, purchase flow)
7. ✅/🔲 Economy basics (bank balance, construction costs)
8. ✅/🔲 Show system (generation, picker UI, archetypes)
9. ✅/🔲 Audition system (candidates, casting UI)
10. ✅/🔲 Crew hiring (roles, hiring panel, salaries)
11. ✅/🔲 Rehearsal system (readiness meter, events)
12. ✅/🔲 Marketing (options, buzz score)
13. ✅/🔲 Performance system (nightly loop, attendance, revenue)
14. ✅/🔲 Event system (random events, modals, consequences)
15. ✅/🔲 Run management (price adjustment, end conditions, summary)
16. ✅/🔲 Save system (serialize, localStorage, slots, auto-save)
17. ✅/🔲 Full loop integration (connect all phases, test full playthrough)
18. ✅/🔲 UI polish (dashboards, graphs, notifications, tooltips)

Mark ✅ as each step completes.

## Current State
- **Phase:** Pre-development
- **Last completed:** GDD written and approved
- **Current blocker:** None
- **Next priority:** Step 1 — Project scaffolding

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
