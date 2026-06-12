# Theatre District — Build Log

One paragraph per session, newest first. Screenshot when the session was visual.

---

## Session 0 — Audit & pivot plan (2026-06-12)

Read the full Broadway Tycoon codebase (~9.5k LOC on `main`, the fixed post-audit v2.1.0) plus the superseded prior pivot attempt on `feature/theatre-district` (deployed at `/v3/`, never merged). Produced `docs/THEATRE_DISTRICT_AUDIT.md`: preserved/replaced/new classification (show production, save machinery, and ~70% of production UI survive; rendering, game loop, and single-building framing get replaced; street/crowd/era layer is new), the 15 room-type → Theatre Upgrades mapping (+ new Fly System), the prior-attempt salvage table (BuzzSystem numerics verified spec-compliant, crowd SoA layout, iso math), and the buzz/hype naming-collision resolution. Rewrote `CLAUDE.md` with the locked v2.1 architecture rules, started `docs/DESIGN_DECISIONS.md` (3 open questions), renamed project surfaces to Theatre District (package name, page title, main menu, top-bar fallback). Branch `theatre-district` created from `main` @ e8f73d0. Build passes clean; game boots with zero console warnings/errors; renamed title screen verified live (screenshot: `docs/theatre-district/session-0-rename.png`). No tests yet — Vitest lands in Session 1. → MANDATORY STOP #1.
