# Broadway Tycoon — Code Audit (main, 2026-05-26)

Commit `c0231c7`, 9,021 LOC src/, baseline `npm install` & `npm run build` already done. Findings grouped by bucket. Severity: `[BROKEN]` (fix now) > `[JANK]` (next pass) > `[POLISH]` (later).

## Build & typecheck

### [POLISH] Build passes clean, but main bundle is 627 KB
`tsc -b && vite build` succeeds in 1.6 s, zero TS errors. CSS 62.6 KB / gzip 9.7 KB is fine. The single JS chunk is **627.19 KB (gzip 190.69 KB)** — Vite's 500 KB warning fires. Pixi's renderer code-splits cleanly (CanvasRenderer, WebGL, WebGPU all separate), so the bloat is in app code.
**Where:** `dist/assets/index-DJbfLV7M.js` (build output)
**Suggested fix:** `build.rollupOptions.output.manualChunks` to split modals/renderers, or `React.lazy` the heavy modals (SaveLoad, EndOfRun, Audition).

## Dependency health

### [JANK] 3 npm-audit vulnerabilities (2 high, 1 mod), all in dev deps
`@xmldom/xmldom` (high — CDATA injection + DoS) lives under devDeps. Vite 6.4.1 itself has a moderate advisory in the `>=6.0.0 <=6.4.1` range; `npm outdated` shows 6.4.2 wanted. None affect the shipped bundle but `npm audit fix` is cheap.
**Where:** `package-lock.json` (vite + transitive @xmldom/xmldom)
**Suggested fix:** `npm audit fix` (lifts vite to 6.4.2) and commit lockfile.

### [POLISH] Minor deps drift, no majors behind
Pixi 8.17.1 → 8.18.1, react 19.2.4 → 19.2.6, tailwind 4.2.2 → 4.3.0, zustand 5.0.12 → 5.0.13 — all patch/minor. `@vitejs/plugin-react` 4.7 → 6.0 and vite 6 → 8 are majors but the project doesn't need them. TS 5.8 → 6 also major, skip.
**Where:** `package.json`
**Suggested fix:** Patch sweep before v2 merge — no breaking risk.

## Dead code

### [JANK] knip finds 2 unused files, 1 unused dep, 9 unused exports
`src/App.css` and `src/types/enums.ts` are dead. **`@pixi/react` is in package.json but never imported anywhere** (the canvas uses raw `pixi.js` via class renderers — see Architecture below). Unused exports cluster in data files (`generateShowTitle`, `getCrewRoleDefinition`, `getEventEffects`, `applyBuzzGain`, `getVipSeats`, `shouldAutoClose`, etc.). All TimeManager date helpers (`getWeekNumber`/`getMonthName`/`getYear`/`getSeason`) are unused.
**Where:** `src/App.css`, `src/types/enums.ts`, `package.json` ("@pixi/react"), various
**Suggested fix:** Drop the two files, remove `@pixi/react` from package.json (CLAUDE.md still lists it as the stack — needs an architecture note), prune dead exports.

## Oversize files

### [JANK] Six files > 300 LOC; App.tsx and gameStore.ts heading toward unmanageable
- `App.tsx` 691 — 5 inline components (PhaseBreadcrumb, StatusBar, TopBar, TileInfo, RehearsalOverlay) plus 7 phase-branch returns
- `gameStore.ts` 659 — flat single store, 45+ actions, destructuring everything in `getSerializableState`
- `FloorPlanRenderer.ts` 526 — renderer + label drawing + dashed-rect helper + 4 graphics layers
- `EventSystem.ts` 492 — 15 event definitions inline
- `GameCanvas.tsx` 465 — Pixi init + pointer handlers + ghost preview + 4 effects
- `SaveLoadModal.tsx` 422 — slot UI + import/export base64 flows
**Where:** see paths above
**Suggested fix:** Extract `App.tsx` inline components into `ui/components/`; move event definitions to `data/events.ts`; split GameCanvas pointer logic into a hook.

## Pattern modernization

### [POLISH] React 19 features unused (no `use()`, no `useTransition`, no Suspense, no Activity)
Zero forwardRef (good — ref-as-prop ready). Zero `dangerouslySetInnerHTML`. Effects look clean — `App.tsx:426-447` autosave + transition effects have proper cleanup. But the 14 phase-branch returns in App.tsx render different layouts synchronously without `useTransition` — speed-toggle and view-toggle could be wrapped to avoid the visible jank when a phase swaps. No genuine async data, so `use()`/Suspense don't apply.
**Where:** `src/App.tsx:412-688`
**Suggested fix:** Wrap `setViewMode` / `setSpeed` in `startTransition` if the v2 illustrated renderer adds frame cost.

### [POLISH] PixiJS v8 API used correctly; container-event DOM workaround still warranted
`Graphics` uses the v8 `.rect().fill({color, alpha}).setStrokeStyle({...}).stroke()` chain — correct. Ticker callback receives `Ticker` (v8 shape), not deltaTime number — correct. Pointer events register on `canvas.addEventListener` (the DOM workaround flagged in CLAUDE.md memory) AND on the `Container.eventMode = 'static'` in `FloorPlanRenderer.ts:88-91`. With Pixi 8.6.6 (latest 8.18.1) container events still have known propagation oddities under transformed parents — workaround is still defensible.
**Where:** `src/game/canvas/GameCanvas.tsx:285-372`, `src/game/rendering/FloorPlanRenderer.ts:88-91`
**Suggested fix:** None for now. Re-test on Pixi 8.18 if v2 lands.

### [POLISH] Tailwind v4 set up minimally, `@theme` directive unused
`@import "tailwindcss"` only; no `@theme {}` block, no oklch palette, no design tokens — colors live inline as `bg-amber-900/40` etc. v3 idioms work fine, but if the v2 illustrated style codifies a palette, `@theme` is the lever.
**Where:** `src/styles.css`
**Suggested fix:** Add `@theme` with brand tokens when v2 visual rebuild begins.

### [JANK] Zustand v5 single-store strain: 14 files call `useGameStore`, but no `useShallow`, no `subscribeWithSelector`
Selector hygiene is actually good — every call is single-property `(s) => s.foo`. **But the store is one fat object** (45+ actions, all in `getSerializableState`'s destructure on line 654 — adding a new action requires editing that line, easy to forget). The 659-LOC store will balloon under v2's campaign + rivals + presets state. Single-store with manual destructure is at its limit.
**Where:** `src/store/gameStore.ts:654` (the destructure-everything trick)
**Suggested fix:** Either (a) split into slices via `create<A & B & C>()(...)` composition, or (b) flip the serialization to whitelist data keys instead of blacklisting action names. Future-proofs for v2.

## Architecture

### [JANK] @pixi/react listed in CLAUDE.md but not actually used
Stack section claims "PixiJS v8 + @pixi/react". The codebase uses raw `pixi.js` classes (`Application`, `Container`, `Graphics`) instantiated imperatively in renderer classes. `@pixi/react`'s declarative `<Stage>`/`<Sprite>` components are nowhere. Not broken — just docs drift.
**Where:** `CLAUDE.md` Tech Stack section vs `src/game/canvas/GameCanvas.tsx`
**Suggested fix:** Drop `@pixi/react` from CLAUDE.md and package.json; the imperative pattern is the right call for this engine.

### [JANK] Sim City scaling: properties as array, single active grid, no per-property camera state
`gameStore.properties: Property[]` with `activePropertyId` — only one property's rooms render at a time. `grid` is a single flat state. Adding concurrent properties (multi-theater empire) needs grid-per-property, camera-per-property, and the GameLoop's `processConstruction` / `processRehearsal` rewritten to iterate active properties. Not a bug for MVP; a wall for Sim City scale.
**Where:** `src/store/gameStore.ts:44-58`, `src/game/engine/GameLoop.ts:72-100`
**Suggested fix:** Future refactor — move `grid` and `camera` onto each Property; loop multi-property in GameLoop.

## Security

### [POLISH] Surface is small; base64 import/export trusts whatever it gets
No `dangerouslySetInnerHTML`. No external URLs except `import.meta`. Save manager uses `btoa`/`atob` for "share" import — `saveManager.ts:88-99` accepts any JSON shape if it has `theaterName: string` and `time.day: number`. A crafted save could inject arbitrary state (negative cash, unbounded reputation, etc.). Single-player, so the only "attacker" is the player cheating themselves.
**Where:** `src/store/saveManager.ts:88-99`
**Suggested fix:** None warranted. If anti-cheat ever matters, validate ranges + schema-version on import.

## Save/load

### [BROKEN] No schema version, no migration path — v2 saves will silently break
`saveManager.ts` writes `JSON.stringify(state)` raw, no version field. `loadGame` validates only `theaterName: string` and `time.day: number`. **The v2 branch adds `state.campaign`, `state.rivals`, `state.ui.isRenovating`, and `room.presetId` — none of these will exist on a v1 save**, but `loadState` does `set(state)` (gameStore.ts:658) which replaces state wholesale, including wiping the new keys back to `undefined`. v2 code that reads `state.campaign.act` will crash on a v1 load.
**Where:** `src/store/saveManager.ts:14-41`, `src/store/gameStore.ts:651-658`
**Suggested fix:** Add `SAVE_VERSION = 1` constant; write `{ version, state }` envelope; `loadGame` runs migration functions per version step. Implement *before* shipping v2.

## Bundle summary
| Metric | Value |
|---|---|
| Build time | 1.62 s |
| Main JS chunk | 627.19 KB / 190.69 KB gzip |
| CSS | 62.61 KB / 9.72 KB gzip |
| Pixi renderers (split) | ~230 KB / ~64 KB gzip across 7 chunks |
| Audit | 2 high + 1 mod (all devDeps) |
| Outdated | 6 patch, 0 major-needed |
| Knip dead | 2 files, 1 dep, 12 unused exports/types |
