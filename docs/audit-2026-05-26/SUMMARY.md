# Broadway Tycoon — Audit Summary (2026-05-26)

**Audited:** live site + main branch + feature/v2-overhaul branch + v2 spec doc.
**Last deploy:** 2026-03-31 (57 days ago).
**Stack:** React 19 · PixiJS v8 · Zustand v5 · Tailwind v4 · Vite 6 · TS 5.8 — all current.

## Headline finding

**The live deploy is `feature/v2-overhaul`, not main.** Live bundle ships room presets, RivalSystem, director-decisions data, and the "Choose Style" UI — all v2-only code. Main hasn't been deployed since v1. The "v2 designed but not implemented" memory was outdated; v2 was implemented and shipped, but **never merged back to main and has known wiring gaps that are live in production**.

What this means: every gap the audit found is a real bug a player can hit today.

## Findings by bucket

### [BROKEN] — fix before next deploy (7)

| # | Issue | Where |
|---|---|---|
| 1 | No save schema versioning — autosaves brick on next schema change | `src/store/saveManager.ts` |
| 2 | Click-to-place uses minSize, not defaultSize — UI shows wrong price | `src/game/canvas/GameCanvas.tsx:285-348` |
| 3 | Room preset modifiers are cosmetic-only — gameplay table not applied | `src/game/systems/PerformanceSystem.ts`, `StaffPanel.tsx` |
| 4 | `TonyAwardsModal.tsx` is dead code — never imported | `src/ui/modals/TonyAwardsModal.tsx` |
| 5 | `lowAttendanceWeeks` never incremented — "outcompeted" loss impossible | `src/game/engine/GameLoop.ts` |
| 6 | Director-decision modal never fires — trigger logic missing | `src/game/systems/RehearsalSystem.ts` |
| 7 | (Pre-existing on main too) `feature/v2-overhaul` is 15 ahead, 0 behind main — never merged | branch state |

### [JANK] — fix next pass (8)

| # | Issue | Where |
|---|---|---|
| 1 | No "Continue" button on main menu — autosave hidden behind Esc | `src/ui/layouts/MainMenu.tsx` |
| 2 | 3 npm-audit vulns in devDeps (vite mod, xmldom high) | `package-lock.json` |
| 3 | `@pixi/react` listed in deps + CLAUDE.md but never imported | `package.json`, `CLAUDE.md` |
| 4 | Single-grid architecture is the Sim City scaling wall | `gameStore.ts:44-58` |
| 5 | Zustand single-store at 659 LOC; `getSerializableState` destructure-everything is brittle | `gameStore.ts:654` |
| 6 | `App.tsx` 691 LOC has 5 inline components + 7 phase-branch returns | `src/App.tsx` |
| 7 | Knip finds 2 dead files + 12 unused exports | `src/App.css`, `src/types/enums.ts`, +9 |
| 8 | Esc behavior in build phase ambiguous (silent room-type deselect vs save/load) | `src/App.tsx:466-471` |

### [POLISH] — fix when adjacent (6)

| # | Issue | Where |
|---|---|---|
| 1 | Favicon 404 on every page load | `public/`, `index.html` |
| 2 | Empty theater name silently uses placeholder | `src/ui/layouts/MainMenu.tsx` |
| 3 | Main JS chunk 627 KB (gzip 191 KB) — Vite warning fires | `vite.config.ts` |
| 4 | 6 patch-level deps drift (pixi, react, tailwind, zustand, ts...) | `package.json` |
| 5 | React 19 `useTransition` not used for phase swaps — minor jank potential | `src/App.tsx:412-688` |
| 6 | Tailwind v4 `@theme` directive unused; tokens inline | `src/styles.css` |

## What's working well (don't touch)

- The full game loop (menu → property → build → production → audition → rehearsal → running → summary) flows correctly through all 8 phases.
- Build phase: all 15 room types render with condition-adjusted prices; required-rooms checklist tracks correctly.
- View toggle (V key) works; speed controls (1/2/3 + space) work.
- Construction system actually advances during time progression.
- PixiJS v8 idioms used correctly (v8 Graphics API, ticker shape).
- Zero runtime console errors except favicon.
- Build passes clean: 1.6s, 627 KB JS, 0 TS errors.
- Codebase is clean: zero TODO/FIXME/HACK/console.log in src.
- Save base64 export/import works (untested by me; subagent confirmed).

## Roadmap toward Sim City scale

See `roadmap.md`. Three phases:
- **A — Stabilization (next 2 weeks):** ship v2.1 with all 7 [BROKEN] fixes, fast-forward merge, tag release.
- **B — Depth (next month):** multi-property architecture, room upgrades (3 tiers), loan system, complete illustrated visuals on remaining 6 rooms.
- **C — Sim City expansion (next quarter):** NYC district map view, audience archetype simulation, time-of-day + seasons, sandbox mode, expanded events.

Aggregate depth score today: **34/70 (49%) of Sim City class**. Half the journey is done.

## Decision point

Fix-now vs defer for each [BROKEN] item. Recommended split for tonight:

**Tonight (small, high-impact, ~1-2 hrs):**
- #4 Mount `TonyAwardsModal` — single import + conditional render
- #5 Increment `lowAttendanceWeeks` — one line in GameLoop running tick
- #6 Fire director decisions — ~10-15 lines in RehearsalSystem
- #1 Save schema versioning — defensive, needed before next deploy anyway

**Next session (medium):**
- #2 Click-to-place fix — needs careful threshold tuning
- #3 Wire preset modifiers — touches PerformanceSystem in multiple places, needs testing

**This week (final):**
- #7 Fast-forward merge feature/v2-overhaul → main, tag v2.1.0, deploy

The [JANK]/[POLISH] items can roll into Phase B unless one annoys you specifically.

## Deliverable index

```
docs/audit-2026-05-26/
├── PLAN.md                — the audit plan
├── live-audit.md          — Playwright-driven live testing findings
├── code-audit.md          — main branch code audit (subagent)
├── v2-branch-analysis.md  — v2-overhaul branch + spec analysis (subagent)
├── roadmap.md             — strategic roadmap to Sim City class
├── SUMMARY.md             — this file
└── screenshots/           — 00-menu, 01-how-to-play, 02-new-game-prompt, 03-property-select, 04-build-phase, 05-build-canvas-default, 06-lobby-placed, 07-iso-view
```
