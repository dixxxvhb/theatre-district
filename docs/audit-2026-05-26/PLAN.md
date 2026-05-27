# Broadway Tycoon — Audit Plan (2026-05-26)

**Scope:** C (Strategic). Live + main code audit + v2-overhaul branch analysis + Sim City roadmap.

## State as of clone (2026-05-26)
- Local repo had been deleted (recovered fresh from `dixxxvhb/broadway-tycoon`).
- **Live site:** https://dixxxvhb.github.io/broadway-tycoon/ — last-modified Mar 31, 2026, builds from `main`.
- **Branches:**
  - `main` (c0231c7) — what's deployed. CLAUDE.md says steps 1-17 of 18 complete ("game is playable end-to-end").
  - `feature/v2-overhaul` (3609712) — substantial unmerged work (+7,547 LOC / 30 files): rivals, trends, presets, Tony Awards, director decisions, illustrated rendering, construction visuals.
  - `gh-pages` — deploy artifact.
- **Stack:** React 19.1.0 · PixiJS 8.6.6 · @pixi/react 8.0.2 · Zustand 5.0.3 · Tailwind 4.1.3 · Vite 6.3.1 · TypeScript 5.8.3. All current.
- **Code health (initial scan):** 9,021 LOC src; **zero** TODO/FIXME/HACK/console.log/debugger. Clean.

## Phases
0. Recover & inventory — DONE
1. Live audit — Playwright + qa-tester. Test every phase + button + room type + edge case. Output: `live-audit.md`.
2. Code audit — typecheck, build, deps, dead code, React 19 / Pixi v8 / Tailwind v4 / Zustand pattern check. Output: `code-audit.md`.
3. v2 branch & spec analysis — diff + % implementation + SHIP/SALVAGE/ABANDON per chunk. Output: `v2-branch-analysis.md`.
4. Sim City roadmap — depth score per pillar + phased plan. Output: `roadmap.md`.
5. Synthesis — three buckets ([BROKEN], [JANK], [POLISH]). Output: `SUMMARY.md`.

## Deliverables
All under `docs/audit-2026-05-26/`. Decision point at end: fix-now vs defer; ship fix-nows tonight.
