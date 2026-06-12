# Theatre District

A cozy isometric street-builder fused with a theatre-production sim. One
street grows across five eras; you place theatres, amenities, and
decoration, an emergent crowd navigates toward Buzz, and clicking a theatre
opens the **Production Desk** — commission scripts, cast roles, rehearse
through director decisions, run previews into critical openings.

**Play it:** [dixxxvhb.github.io/theatre-district/](https://dixxxvhb.github.io/theatre-district/)
**The classic game:** [.../classic/](https://dixxxvhb.github.io/theatre-district/classic/) (the original Broadway Tycoon)

## Controls

| Key | What |
|---|---|
| Space | Pause/Resume |
| 1 / 2 / 3 | Speed (1× / 2× / 4×) |
| B | Build palette |
| Tab | Buzz overlay (heatmap + hover readout) |
| N | The Daily Playbill |
| H | Almanac (read teach cards + era list) |
| P | Photo mode (UI hides) |
| Esc | Close Desk / cancel placement / clear selection |
| Shift + click | Repeat-place the same item |
| Right-click | Cancel placement |
| W A S D | Pan camera (drag works too) |
| Mouse wheel | Zoom |

## The pipeline

```
street → click a theatre → Production Desk
                                  ↓
   commission ($1,500 for 3 drafts) → choose script + buy rights
                                  ↓
        cast 4 roles (lead required, chemistry matters)
                                  ↓
  rehearse (director decisions auto-pause) → ready at 70%
                                  ↓
  3 preview nights (cheap tickets, no critics) → opening night
                                  ↓
   3 critics weigh in → momentum locks → open run begins
                                  ↓
   nightly box office → close on your terms, or after 5 dead nights
```

## Architecture (developer notes)

- **React 19** for UI chrome, **PixiJS v8 imperative** for the canvas, **Zustand 5** single store, **Tailwind 4**, **Vite 6**, **Vitest** for sim math.
- Fixed-timestep simulation (10 ticks/sec) with an accumulator; render is decoupled. Speed multipliers run more sim ticks per frame — never frame-scaled physics.
- Crowd agents live **outside** the store in a SoA typed-array module; they are never saved and respawn from game state on load.
- Every tunable lives in `src/game/config/balance.ts`. No magic numbers in logic code.
- Procedural art baked to RenderTextures once at boot; time-of-day is one world-container tint + an additive light layer + a single BlurFilter.
- Buzz field memoizes and recomputes only on placement / litter changes — never per frame.

## Sessions

This game was built in 10 sessions over 24 hours (2026-06-12):

0. Audit & pivot plan (from Broadway Tycoon)
1. Foundation — clock, calendar, topology, store, saves
2. Marquee Noir rendering kit
3. Placement & Buzz
4. Crowds, showtime rhythm, core loop (**Mandatory Stop #2** here)
5. Production Desk
6. Lifecycle, critics, Playbill, demographics, pricing
7. Seasons, weather, Dark Week
8. Eras, onboarding, Almanac, finale, photo mode
9. Juice & cohesion
10. QA, deploy, this README

Full per-session detail: `docs/BUILD_LOG.md` (one paragraph per session,
newest first).

## Development

```sh
npm install
npm run dev      # → http://localhost:5187/theatre-district/
npm run test     # 82 unit tests
npm run build
```

Add `?dev=1` to the URL for the dev panel (cash, day/week/season skip,
era jump, time-of-day jump, weather toggle, crowd surge, FPS/tick meters).

## Saves

Three manual slots + autosave (every day rollover). Schema is versioned
(`SAVE_VERSION = 2`); old Broadway Tycoon saves are version-gated out, not
migrated. Export/import JSON files for sharing between machines.

---

Built by Dixon Van Hoozer-Bowles with Claude Code. The memorial mark — two
small outlined gold circles by the stage door of the inherited playhouse —
is for Mom.
