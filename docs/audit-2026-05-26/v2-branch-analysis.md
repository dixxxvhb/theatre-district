# Broadway Tycoon — v2 Branch Analysis (2026-05-26)

Branch `feature/v2-overhaul` (HEAD `3609712`, base `c0231c7` — fully descends from current `main`, 15 commits ahead, 0 behind).

## Diff scope

```
30 files, +7,547 / −562
docs/superpowers/plans/2026-03-30-v2-overhaul.md             3,435
docs/superpowers/specs/2026-03-30-v2-overhaul-design.md        808
src/ui/modals/AuditionModal.tsx                                492
src/game/data/presets.ts                                       416 (NEW)
src/game/rendering/RoomRenderer.tsx                            342 (NEW)
src/ui/panels/StaffPanel.tsx                                   348
src/ui/modals/ShowPickerModal.tsx                              234
src/ui/modals/EndOfRunModal.tsx                                201
src/ui/panels/RehearsalView.tsx                                164 (NEW)
src/store/gameStore.ts                                         147 (mostly +)
src/game/rendering/ConnectionRenderer.ts                       142 (NEW)
src/game/systems/RivalSystem.ts                                134 (NEW)
src/App.tsx                                                    137
src/types/index.ts                                             115
src/ui/modals/TonyAwardsModal.tsx                               87 (NEW, ORPHANED)
src/game/data/rivals.ts                                         87 (NEW)
src/game/rendering/ConstructionRenderer.ts                      89 (NEW)
src/ui/modals/GameOverModal.tsx                                 76 (NEW)
+ smaller mods to GameLoop, BuildPanel, PerformanceSystem, ...
```

`src/store/saveManager.ts` is **untouched**. Tests folder doesn't exist on either branch.

## Spec summary (4 chunks)

1. **Renovate Anytime** — persistent "Renovate" button in topbar after build phase, slide-out mini build panel, real-time construction during any phase, 1.5x rush pricing.
2. **Illustrated Visuals** — replace solid-color room rects with PixiJS Graphics interiors per room type (lobby has chandelier + checker floor; stage has proscenium + curtain; etc.), 4-stage construction animation, auto-drawn connections between adjacent rooms.
3. **Room Presets** — 3 cosmetic+gameplay variants per major room type (lobby/stage/seating/backstage/box office/office), each with visual theme and modifier table (ticket bonus, cost multiplier, capacity, crew cap, etc.).
4. **Stakes System** — 5-act campaign tied to show count, 3 rivals appearing at acts II/III/IV with simulated buzz competition affecting attendance, 6 audience trends shifting genre appeal every 2-3 shows, 3 loss conditions (bankruptcy/reputation-death/outcompeted), Tony Awards modal at Act IV+, director-decision modal during rehearsal.

## Per-chunk implementation %

### Chunk 1 — Renovate Anytime: **~95% (SHIP)**
- ✅ `ui.isRenovating` flag in store, `toggleRenovate()` action (gameStore.ts:704)
- ✅ Rush multiplier wired into `placeRoom()` cost calc (gameStore.ts:326-327: `state.ui.currentPhase !== 'building' ? 1.5 : 1.0`)
- ✅ `RenovateOverlay` component in App.tsx:339, mounted in all 5 post-build phases
- ✅ "R" keyboard hint, escape-to-close, click-outside-to-close, BuildPanel reused inside overlay
- ⚠️ Demolish refund path doesn't apply rush multiplier (the spec didn't ask for it; fine).

### Chunk 2 — Illustrated Visuals: **~70% (SHIP after polish)**
- ✅ `RoomRenderer.ts` (342 LOC) handles 9 of 15 room types (lobby, stage, seating, backstage, box_office, office, dressing_room, orchestra_pit, rehearsal_hall). Missing: vip_lounge, concession, storage, tech_booth, green_room, restrooms — they fall through to a default style.
- ✅ `ConstructionRenderer.ts` 4 stages mapped to `constructionDaysLeft` percentage
- ✅ `ConnectionRenderer.ts` adjacency detection for lobby↔seating, stage↔seating, stage↔backstage, lobby↔box_office
- ✅ `FloorPlanRenderer.ts` calls into RoomRenderer per-room
- ⚠️ Phase animations (patrons milling, curtain open, occupied-seat dots) sound implemented but un-stress-tested at scale — no benchmark data
- ❌ `IsometricRenderer.ts` not updated. v2 still shows old basic cubes in isometric view. Spec called for "illustrated room views at angle."

### Chunk 3 — Room Presets: **~75% (SHIP with caveat)**
- ✅ `presets.ts` 416 LOC defines all 18 presets across 6 room types with full modifier shape (ticketPriceBonus, buildCostMultiplier, capacityMultiplier, qualityBonus, crewCapacity, genreBonus[])
- ✅ `room.presetId: string | null` field, `setRoomPreset()` action
- ✅ BuildPanel renders 3 preset cards after room-type select (BuildPanel.tsx:208)
- ❌ **Preset modifiers don't reach gameplay.** `PerformanceSystem.ts` v2 diff shows `+27 / -0` lines but they're all rival buzz share — **no preset modifier multiplications in attendance/quality/capacity/ticket-price calcs**. Office crewCapacity isn't read by StaffPanel either. Presets are currently cosmetic-only despite the data being there.

### Chunk 4 — Stakes System: **~50% (SALVAGE)**
- ✅ Campaign state: `act`, `showCount`, `condemnedShowCount`, `lowAttendanceWeeks`, `currentTrend`, `nextTrend`, `tonyNominations`, `tonyWins`, `gameOver`, `gameOverReason` — all in initialState
- ✅ Act transition + trend rotation logic in `GameLoop.triggerCloseShow` (lines 328-386)
- ✅ Loss conditions implemented (gameStore.ts:713) — bankruptcy / reputation_death / outcompeted
- ✅ `GameOverModal.tsx` mounted in App.tsx (8 phase locations)
- ✅ `RivalSystem.ts` ticks daily, generates rival shows, competes for buzz; `PerformanceSystem.ts:103` applies rival buzz share to attendance
- ✅ Rival ticker in RunDashboard (line 312)
- ✅ Director decisions data file + modal exist; `RehearsalView.tsx:17` has `activeDecision` state — but the trigger logic that spawns decisions every 5-7 rehearsal days is not visible in `RehearsalSystem.ts` (only the legacy progress + breakthrough/conflict events). Decisions modal is wired but never fires.
- ❌ **`TonyAwardsModal.tsx` (87 LOC) is defined but never imported or rendered anywhere.** Tony nomination *is* awarded (`state.nominateForTony`), but the ceremony never plays.
- ❌ `lowAttendanceWeeks` is read in loss-check but **never incremented anywhere** — outcompeted loss condition can never trigger.
- ❌ Rival "poaching fired crew" and "counter-programming" not implemented.

## v2 build verdict

`npm install && npm run build` on `/Users/dixxx/Code/broadway-tycoon-v2`:
- ✅ Builds clean, 1.86 s, 788 modules
- Main JS chunk: **674.62 KB / 204.16 KB gzip** (+47 KB raw, +13.5 KB gzip vs main's 627 KB)
- CSS: 74.76 KB / 11.17 KB gzip (+12 KB)
- Same 500 KB chunk-size warning
- Zero TS errors, zero test suite (none exists)

### [BROKEN] No save migration — v1 saves will crash v2
v2 adds `state.campaign.*`, `state.rivals[]`, `state.ui.isRenovating`, `room.presetId`. `saveManager.ts` is byte-identical to main. `gameStore.loadState` does `set(state)` which overwrites the new keys with `undefined`. v1 → v2 reads of `state.campaign.act` or `state.rivals.some(...)` will throw. Players with autosaves lose runs.
**Where:** `src/store/saveManager.ts` (unchanged from main), `src/store/gameStore.ts:701`
**Suggested fix:** Add `SAVE_VERSION` + migration that supplies defaults for missing v2 keys, before merging.

## Per-chunk verdict

| Chunk | Verdict | Why |
|---|---|---|
| **1. Renovate Anytime** | **SHIP** | Self-contained, complete, low risk. Land first. |
| **2. Illustrated Visuals** | **SHIP** (after iso polish) | The floor-plan visual rebuild is the big "wow" moment and works. Defer isometric to a follow-up or scope-cut iso entirely. |
| **3. Room Presets** | **SALVAGE** | Selector UI + data are great; *wire modifiers into PerformanceSystem/StaffPanel/RoomRenderer color use* before declaring done. 1-2 sessions of work. |
| **4. Stakes System** | **SALVAGE** | Rivals + campaign + game-over work. **Wire TonyAwardsModal, increment lowAttendanceWeeks, fire director decisions** before ship. Tony pretends to nominate then ghosts the player — that's worse than not having it. |

Overall: don't `git merge` and call it done. Two focused fix-up sessions (presets + stakes-stub-fills + save migration) and it ships.

## Merge risk

### [JANK] Branch base is current main; no main-since-cut commits to rebase
`git merge-base main origin/feature/v2-overhaul` = `c0231c7` (current main HEAD). `git log $(git merge-base)..main` returns empty. **There is no divergence** — `feature/v2-overhaul` is a strict fast-forward candidate. Rebase will be painless because there's nothing to rebase past.
**Where:** N/A
**Suggested fix:** Land fixes on the feature branch directly; final merge is a fast-forward.

### [JANK] Save manager untouched + 4 inflight wiring gaps
The merge itself is mechanical, but shipping the merge breaks: (a) any existing autosaves, (b) the implied promise of the Tony modal and director decisions, (c) the preset modifier table the player sees in the UI but doesn't get. Address before merging or document as known-incomplete.
**Where:** see findings above
**Suggested fix:** Sequence — `npm audit fix` on main, add save migration, fix preset-modifier wiring + Tony mount + lowAttendanceWeeks increment + director-decision trigger, then fast-forward merge.

## Quick wins on v2 before merge (1-2 sessions)

1. Add `SAVE_VERSION = 2` + migration (gameStore.loadState supplies defaults for v1 saves).
2. Mount `TonyAwardsModal` in EndOfRunModal when `campaign.tonyNominations.includes(activeShow.id)`.
3. Increment `lowAttendanceWeeks` in GameLoop running tick (currently dead code).
4. Wire director-decision trigger in `RehearsalSystem.advanceRehearsal` (every 5-7 days roll a decision from `DIRECTOR_DECISIONS`).
5. Apply preset modifiers in `PerformanceSystem.calculatePerformance` (ticket-price bonus, capacity multiplier) and `StaffPanel` (read office preset's crewCapacity).
6. Drop dead `src/App.css` and `src/types/enums.ts`; remove `@pixi/react` dep.
