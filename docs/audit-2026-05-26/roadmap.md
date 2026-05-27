# Broadway Tycoon — Strategic Roadmap (2026-05-26)

The audit confirms the foundation is solid. This is the path from "playable polished MVP+v2-partial" → "Sim City–scale Broadway empire builder."

## Depth audit — where we are vs where Sim City lives

Score current depth 1–10 per pillar. Sim City class = 10. Two Point Hospital ≈ 7. Game Dev Tycoon ≈ 5.

| Pillar | Current | Sim-City Class | Gap |
|---|---|---|---|
| **Building & placement** | 7 | 9 | Single-floor; no discrete walls/doors as entities; one active property at a time |
| **Economy** | 4 | 8 | No loans (deferred), no taxes, no multi-property bank logic, no investor mechanics |
| **Time & progression** | 6 | 8 | Day/week/year + day-of-week modifiers, but no seasonality, no event-on-specific-date system |
| **People simulation** | 3 | 9 | Cast/crew as stat cards; audience is an integer, not individuals |
| **Visual richness** | 6 | 8 | Illustrated rooms (9 of 15 done); no characters; no fluid scene animation |
| **Strategic depth** | 5 | 8 | Archetypes + critics + rivals (partial) + trends (partial); needs interconnection |
| **Endgame & sandbox** | 3 | 9 | Milestones present but no late-game progression past rep 100; no sandbox mode; no mod support |

**Aggregate: ~34/70 (49%) of Sim City class.** Half the journey done. The fundamentals are there; the depth multipliers aren't.

## Phase A — Stabilization (next 2 weeks)

Goal: ship the v2 work cleanly under "v2.1" and recover the trust that the published features actually work. Touch no new design.

Concrete checklist (in order):

1. **Save schema versioning** (BROKEN) — `SAVE_VERSION = 2` constant, envelope `{ version, state }`, migration that supplies defaults for missing v2 keys. Add before any other deploy.
2. **Fix click-to-place size bug** (BROKEN) — in `pointerup`, detect single-cell drag → fall to `handleCellClick` with `defaultSize`.
3. **Wire preset modifiers into gameplay** (BROKEN) — apply `ticketPriceBonus` + `capacityMultiplier` + `qualityBonus` in `PerformanceSystem.calculatePerformance`; read office preset's `crewCapacity` in `StaffPanel`.
4. **Mount TonyAwardsModal** (BROKEN) — sibling of `EndOfRunModal`, gated on `campaign.tonyNominations.length > 0`.
5. **Increment `lowAttendanceWeeks`** (BROKEN) — in `GameLoop` running tick, count weeks with `weeklyAttendanceRatio < 0.30`. Triggers the outcompeted loss.
6. **Fire director decisions** (BROKEN) — in `RehearsalSystem.advanceRehearsal`, every 5–7 days roll a decision from `DIRECTOR_DECISIONS`.
7. **Add "Continue" button on main menu** (JANK) — scan `broadway_tycoon_auto_save`, surface it above New Game.
8. **Favicon** (POLISH) — `public/favicon.png`, reference in `index.html`.
9. **Drop dead code** (JANK) — `src/App.css`, `src/types/enums.ts`, `@pixi/react` from package.json (also update CLAUDE.md stack section).
10. **`npm audit fix`** (JANK) — lifts vite to 6.4.2.
11. **Fast-forward merge `feature/v2-overhaul` → `main`** — no divergence, clean ff.

Deploy as **v2.1.0**. Tag the commit. Write a release notes section to README so future-Dixon remembers what changed.

Estimated time: 1–2 focused sessions.

## Phase B — Depth (next month)

Goal: pull the depth scores up where the codebase is closest to Sim City class. Build the foundation that future expansion needs.

### B1 — Architecture: multi-property as a first-class concept
The biggest existing wall. Today `gameStore.grid` and `camera` are global; only one property's rooms render. Sim City–scale wants 2–3 simultaneous theaters with independent grids and shared finances.

- Move `grid: GridState` and `camera: CameraState` onto `Property`. Active property still drives the rendered canvas; future view can show portfolio.
- `GameLoop` iterates `properties.filter(p => p.purchased)` and runs `processConstruction` / `processRehearsal` per property.
- Per-property reputation? Probably no — keep one company reputation but track per-property attendance/quality history.
- Property switcher UI in the top bar (only visible if ≥ 2 owned).

### B2 — Room upgrades (3 tiers per GDD §14)
Currently rooms are tier 1 only. GDD designed 3 tiers per room with specific cost/effect curves. Add the upgrade flow: click a built room → "Upgrade" button → modal showing tier 2 stats → confirm → construction.

Order matters: stage tier (caps show quality at 70/85/100), backstage tier (-15% quality penalty if missing → +10% if Professional), seating tier (premium seats: -10% capacity / +15% satisfaction).

### B3 — Loan system
GDD §11.5 fully designed; not implemented anywhere. Three loan tiers (Small/Medium/Large), unlocked at Reputation 15. Per-day repayment, default penalty.

Use case for Sim City scale: bridge between properties; expansion financing.

### B4 — Illustrated visuals coverage
v2 renders 9 of 15 room types with custom Pixi Graphics. Complete the remaining 6: VIP Lounge, Concession, Storage, Tech Booth, Green Room, Restrooms. Use the same `RoomRenderer.ts` extension pattern.

### B5 — Audience trend system completion
Trends data exists but the "+2-3 shows then rotate" mechanism in `GameLoop.triggerCloseShow` is partially there. Verify trend bonuses are applied to attendance / appeal. Add a UI surface (trend chip on top bar) so the player can read the market.

### B6 — Loss-screen polish
GameOverModal exists but the 3 loss reasons (bankruptcy / reputation_death / outcompeted) should each get a custom screen with stats and "Try Again" / "Start Over" CTAs. Currently appears generic.

Estimated time: 4–6 focused sessions.

## Phase C — Sim City expansion (next quarter)

Goal: depth that turns a "tycoon game" into a "city builder of theaters." The big swings.

### C1 — NYC district view (the "city" view)
Beyond the floor-plan + isometric of a single theater, add a third tier above: a map of midtown Manhattan showing the player's 1–3 owned theaters as marquees, plus the 3 rival theaters as competing marquees, plus the audience pool moving through the district. Click a marquee → zoom to that theater.

This is the single biggest visual jump toward Sim City. PixiJS already handles it.

### C2 — Individual audience archetypes
Replace `attendance: number` with a small simulation: a population of audience archetypes (tourist, regular subscriber, critic, student, A-lister) each with show-preference + price-sensitivity. Each night, a subset is drawn into the building based on appeal. Show their faces in the lobby illustration.

Doesn't need a full agent sim — even 5–6 archetypes with weighted random draws is a 5x depth jump.

### C3 — Time-of-day + season
Currently a day is atomic. Sim City scale wants time-of-day affecting building lighting, lobby foot traffic, marquee glow at night. Seasonal modifiers: summer tourist boom, January slump, holiday spike. Add a sun/season indicator to the top bar.

### C4 — Event system expansion
The 15 events implemented are mostly self-contained dilemmas. Sim City–scale events are interconnected: a critic event affects a rival event affects a marketing event. Add event chains, recurring story arcs (the rival who courts your lead, the patron whose donation gets withdrawn, the unionization story).

GDD §13 designed 4 categories — Critic, Cast Drama, Facility, Audience, Financial. Get all 4 to ~10 events each.

### C5 — Sandbox mode + difficulty
Campaign mode (5-act stakes) is the v2 frame. Add **sandbox** — no rivals, no loss conditions, infinite money toggle, unlocked everything. Pure creative mode. Required for Sim City-class replay value.

Difficulty modes: Story (current — easy), Producer (medium — rivals more aggressive), Broadway (hard — short runway, harder critics, more drama events).

### C6 — Mod or share infrastructure
Already half-built: save manager has base64 export/import. Surface that as "share my theater" feature with a copyable URL/code. Optional bigger step: schema for custom show archetypes / event packs.

Estimated time: full quarter, prioritized by what's most fun to build.

## Anti-roadmap — what NOT to add

- **Audio.** GDD §18 defers it. Stay deferred until the visual+gameplay loop is Sim City-class. Audio is a 1-week pass once the rest is ready.
- **Cloud saves / leaderboards.** Single-player offline game. Firebase deferral was right.
- **Pixel art / sprites.** The PixiJS Graphics illustrated style is working. Don't introduce a sprite pipeline.
- **Mobile / touch.** GDD §1 says desktop-first. Keep that scope discipline.
- **Multiplayer.** Don't.

## Sequence summary

```
Phase A (2 weeks)   → ship v2.1, foundation trusted
Phase B (1 month)   → multi-property + upgrades + loans → depth scores hit Two-Point-Hospital class (~6.5 average)
Phase C (1 quarter) → NYC view + audience archetypes + time-of-day + sandbox → depth scores hit Sim City class (~8 average)
```

Land Phase A this week. Land Phase B by end of June. Phase C through August.
