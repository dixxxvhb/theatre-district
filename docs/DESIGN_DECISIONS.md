# Theatre District — Design Decisions Log

Every design/scope/feel question put to Dixon, with his answer. Routine engineering choices don't go here (they're Claude's per the v2.1 spec); anything that changes how the game looks, feels, or what it contains does.

Format: date · question · decision · why it matters.

---

## 2026-06-12 — Locked by the v2.1 spec itself (Dixon-authored)

These arrived pre-decided in the v2.1 prompt and are recorded for the trail:

- **Stack frozen** — React 19 / PixiJS v8 imperative / Zustand 5 / Tailwind 4 / Vite 6 / Vitest / GitHub Pages, no backend, no audio. Engine migration rejected.
- **Two layers, one street** — iso street-builder outside, Production Desk (no floor plan) inside theatres. Old room types become an upgrades list.
- **Buzz spec locked** — 3-tile spread, linear falloff, summation, decoration diminishing returns, negative buzz from neglect.
- **Art direction: Marquee Noir** — fully procedural, no asset packs; lighting is the art style; playbill UI vocabulary; no emojis.
- **No bankruptcy game-over** — Dark Week + patron rescue instead.
- **Old saves abandoned** — versioned-migration machinery kept for TD's own future, Broadway Tycoon saves version-gated, no cross-game migration.
- **World numbers locked** — street growth 20→64, day ≈ 90s at 1x, pacing targets, 1280×720 floor, desktop-first.
- **Memorial mark** — two overlapping outlined gold circles, quiet and permanent, no UI attached.

## 2026-06-12 — Open questions for STOP #1 (awaiting Dixon)

1. **Prior pivot attempt** (`feature/theatre-district`, live at `/v3/`): treat as salvage quarry and build v2.1 fresh from `main` (recommended), or build on top of it?
2. **Deploy address at 1.0**: keep `dixxxvhb.github.io/broadway-tycoon/` with Theatre District at the root and the old game moved to `/classic/` (default), or rename the GitHub repo to `theatre-district` for a clean URL (old links break)?
3. **The `/v3/` prototype deploy**: take it down when the Stop #2 demo deploys, or leave it up?
