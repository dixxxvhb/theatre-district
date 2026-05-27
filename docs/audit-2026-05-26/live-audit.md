# Broadway Tycoon — Live Site Audit (2026-05-26)

Tested at https://dixxxvhb.github.io/broadway-tycoon/ via Playwright. Desktop viewport 1440×900. Severity tags: [BROKEN] / [JANK] / [POLISH].

## TL;DR — the live site is v2-overhaul, not main

The deployed bundle (`assets/index-CFl_kp-g.js`, last-modified 2026-03-31) contains room-preset code, RivalSystem, director-decision data, and the "Choose Style" UI — all of which exist **only on `feature/v2-overhaul`**, never on `main`. Conclusion: **Dixon deployed the v2 branch directly to GitHub Pages and never merged it back to main.** That means every wiring gap the code-audit subagent found on v2 (preset modifiers cosmetic-only, Tony Awards modal dead code, director decisions never fire, no save migration) is **live in production** today.

This is the most important finding of the audit. Treat the code-audit + v2-branch-analysis files as additive — they're describing live behavior, not theory.

## Tested flow

`Menu → How to Play → Back → New Game → blank-name submit → Property Select → Buy "The Dusty Loft" ($250K) → Build phase → click-place Lobby → select Box Office → press V (view toggle) → press 2 (2x speed) → wait → press Esc`

Screenshots: `docs/audit-2026-05-26/screenshots/00-menu.png` through `07-iso-view.png`.

## What works (verified)

- Title screen loads cleanly, no boot errors except favicon (below)
- "How to Play" modal opens, content readable, close button works
- "New Game" → theater name input
- Property select shows all 5 properties with correct reputation locks (West 44th @25, Times Sq @50, Crown @80)
- Purchase confirmation modal accurate ($250K → $250K cash remaining)
- Build phase loads, breadcrumb shows full phase flow (Build › Show & Crew › Audition › Rehearsal › Running)
- All 15 room types render in the build palette with condition-adjusted prices (+50% for Poor — Lobby $15K base shows as $22.5K, Box Office $8K → $12K, etc.)
- Required rooms checklist tracks correctly (Lobby went `[ ] → [~] → [+]`)
- Click-to-place lobby succeeds, money deducts, construction starts
- V key toggles view between "Floor Plan" and "Isometric"
- 2x speed advances time (Jan 1 → Jul 30 over ~30 seconds of real time, lobby completed construction)
- Room-style preset picker (Traditional / Modern / Vintage / Skip) opens after selecting a room type — **the v2 feature surface**

## Live bugs

### [BROKEN] Click-to-place uses minSize, not defaultSize
**Where:** `src/game/canvas/GameCanvas.tsx:285-348`
**What I did:** Selected Lobby (UI shows "$22,500 3d 2x2–3x3"), clicked once on the canvas.
**What happened:** A 2×2 Lobby was placed; $10,000 was deducted from cash (not $22,500).
**Why:** `pointerdown` sets `isDraggingRoomRef.current = true` whenever a room type is selected. `pointerup` then unconditionally enters the drag-placement branch with `rawW = rawH = 1`, which the placement-rect computer clamps to `minSize` (2×2 for Lobby). The `handleCellClick` path (line 87) — which correctly passes `roomDef.defaultSize` — is dead code, never reached.
**User impact:** The GDD and tooltips both say "Click to place" yields default size. The player sees a $22.5K tag, clicks, gets a $10K 2×2 instead of a $22.5K 3×3. Cost is right for what they got, but the displayed cost on the palette button is misleading.
**Suggested fix:** In `pointerup`, detect `dragStartRef.current.x === cell.x && dragStartRef.current.y === cell.y` (or distance < 1 cell) → fall through to `handleCellClick` instead of taking the drag branch.

### [BROKEN] Save migration absent — every existing autosave will brick on the next v2 schema change
Documented in `code-audit.md` and `v2-branch-analysis.md`. Live behavior: the autosave timer runs (`AUTOSAVE_INTERVAL_MS` in App.tsx), serializing the entire Zustand state to localStorage with no version header. If you ever change the state shape (which v2 already did and v3 will), v1 autosaves silently corrupt the new state — `state.campaign.act` reads `undefined`, code crashes.
**Suggested fix:** Add `SAVE_VERSION` + migration envelope. **Do this before the next deploy.**

### [BROKEN] Room-preset modifiers are cosmetic-only
**Where:** `presets.ts` defines 18 presets with `ticketPriceBonus`, `capacityMultiplier`, `buildCostMultiplier`, `qualityBonus`, `crewCapacity`, `genreBonus[]`. Per the subagent's read of `PerformanceSystem.ts`, none of these multipliers are applied to attendance, quality, ticket-price, or capacity calcs. `StaffPanel` doesn't read office presets' `crewCapacity` either.
**User impact:** The UI implies these are gameplay-affecting choices ("+5% ticket price bonus"), but they only change room colors. The player picks Vintage for the ticket bonus and gets nothing.
**Suggested fix:** Apply preset modifiers in `PerformanceSystem.calculatePerformance` and `StaffPanel` crew-capacity check. ~1 hour.

### [BROKEN] Tony Awards modal exists but is never shown
`TonyAwardsModal.tsx` (87 LOC) defines the ceremony UI. It is never imported anywhere. `state.nominateForTony` records nominations, but the player never sees them. Worse than the feature not existing — the player accumulates invisible nominations.
**Suggested fix:** Mount the modal in `EndOfRunModal` (or as a sibling) gated on `campaign.tonyNominations.length > 0`.

### [BROKEN] "Outcompeted" loss condition is dead code
`lowAttendanceWeeks` is checked in the game-over logic but never incremented anywhere in the codebase. The third loss condition the spec promised (bankruptcy / reputation_death / outcompeted) is impossible to trigger.
**Suggested fix:** Increment in `GameLoop` during running phase whenever weekly attendance < threshold.

### [BROKEN] Director-decision modal never fires
`DirectorDecisionModal` is wired into `RehearsalView` with an `activeDecision` state, but no code path sets `activeDecision` to a non-null value. Decisions data exists (107 LOC of dilemmas), modal exists, but they never meet.
**Suggested fix:** In `RehearsalSystem.advanceRehearsal`, every 5–7 days roll a decision from `DIRECTOR_DECISIONS` (matching the spec).

### [JANK] No "Continue" or "Load Game" button on main menu
**Where:** `src/ui/layouts/MainMenu.tsx`
**What I did:** Loaded the deployed site fresh.
**What happened:** Only "New Game" and "How to Play" buttons appear. Autosave is silently writing to localStorage, but the only way to access saves is to start a new game first, then press Esc.
**User impact:** A returning player who closed the tab loses their visible session-continuation path. They will start a new game, and only by accident discover the Esc-key save menu.
**Suggested fix:** On menu mount, scan localStorage for `broadway_tycoon_auto_save` (the AUTOSAVE_SLOT_ID); if present, render a "Continue" button above "New Game" that loads it.

### [JANK] Esc behavior in build phase deselects room type silently
**Where:** `src/App.tsx:466-471`
**What I did:** Selected Box Office (showed preset picker), pressed Esc.
**What happened:** Nothing visible — the snapshot still showed the preset picker. The Esc handler is supposed to deselect the room type before falling through to save/load.
**Suggested fix:** Either confirm the behavior visually (the preset picker should close on Esc), or treat Esc as save/load in all phases and add a separate "X" / cancel button for room deselection.

### [POLISH] Favicon 404
**Where:** Console error on every page load.
```
[ERROR] Failed to load resource: 404 @ https://dixxxvhb.github.io/favicon.ico
```
The site is hosted at `/broadway-tycoon/` but the browser requests `/favicon.ico` from the root. `index.html` doesn't link a favicon.
**Suggested fix:** Add a 16×16 / 32×32 PNG (or theatrical SVG mark) to `public/` and reference via `<link rel="icon" href="/broadway-tycoon/favicon.png">` in `index.html`.

### [POLISH] Empty theater name silently uses placeholder
**Where:** New Game name prompt.
**What I did:** Left the input blank, clicked Begin.
**What happened:** Game proceeded with theater name = "" (empty string), top bar displayed the placeholder text "The Majestic".
**Suggested fix:** Either require a non-empty name (validation message) or commit the placeholder string as the actual name if blank.

## Not tested (couldn't reach via Playwright)

- Production phase / Show Picker
- Audition system
- Rehearsal phase + director decisions (would be invisible per finding above)
- Marketing panel
- Running phase + nightly performances
- Rivals interface (would appear in Acts II/III/IV)
- Save/Load modal contents (Esc didn't open it in build phase as expected)
- All 15 room types' placement (only Lobby placed successfully via real click; Box Office click via synthetic event was ignored by PixiJS handlers)
- Mobile / tablet viewports (game is desktop-only by design per GDD §1)

Suggest a follow-up testing session using direct Zustand state injection to skip past the build-phase gate and reach the later phases.

## Console state at end of session

```
Errors: 1 (favicon 404 — see above)
Warnings: 0
```

Clean. No React warnings, no Pixi errors, no Zustand action errors. The codebase is well-behaved at runtime.
