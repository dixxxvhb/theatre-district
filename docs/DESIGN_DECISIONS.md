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

## 2026-06-12 — STOP #1 answers (Dixon)

1. **Prior pivot attempt** (`feature/theatre-district`): **salvage quarry confirmed.** Build v2.1 fresh from `main`; lift only spec-compliant pieces (Buzz numerics, crowd data layout, iso math). Never build on top of it.
2. **Deploy address**: **rename everywhere.** GitHub repo `dixxxvhb/broadway-tycoon` → `dixxxvhb/theatre-district`; Pages URL becomes `dixxxvhb.github.io/theatre-district/`. Old game preserved at `/classic/` (rebuilt for the new base path since the rename breaks its asset paths anyway). Local checkout renamed to `~/Code/theatre-district`.
3. **The `/v3/` prototype deploy**: **taken down** (removed during the rename — the URL change broke it regardless; the branch and the `broadway-tycoon-v2` checkout remain as the salvage quarry).

**Why it matters:** clean identity for the new game, old game stays playable at a stable sub-path, and there's exactly one deployed Theatre District (the v2.1 one, from Stop #2 onward).
