# BROADWAY TYCOON — Claude Code Kickoff Prompt

Copy everything below the line into Claude Code as your first prompt to start the project.

---

## PROMPT START

I'm starting a new game project called **Broadway Tycoon** — a browser-based theater management simulation game. I have a complete Game Design Document (GDD) and a CLAUDE.md ready.

### Your first task: Project scaffolding

**Before you do anything else:**
1. Read `CLAUDE.md` in the project root — it has your architecture rules, development order, and session protocol
2. Read Sections 2 and 3 of `docs/BROADWAY_TYCOON_GDD.md` — they define the tech stack and full project structure

**Then scaffold the project:**
- Initialize a Vite + React 19 + TypeScript project
- Install dependencies: `pixi.js@^8`, `@pixi/react`, `zustand`, `tailwindcss@^4`
- Create the full directory structure defined in GDD Section 3 (all folders, placeholder files with type stubs)
- Set up the Zustand store skeleton with slice files (empty but typed)
- Set up a basic PixiJS Stage rendering inside a React component
- Verify everything compiles and the dev server runs with a visible canvas
- Commit with message `feat: project scaffolding — vite + react + pixi + zustand + tailwind`

**After scaffolding:**
- Update CLAUDE.md: mark Step 1 complete, set next priority to Step 2, add session log entry
- Do NOT proceed to Step 2 unless I say so

### How this project works

**I am the creative director. You are the implementer.** The GDD is the source of truth for all game design decisions. If you hit a design question the GDD doesn't answer, flag it for me — do not make design decisions on your own. You CAN make implementation decisions (which library API to use, how to structure a function, etc.) without asking.

**The GDD is large (~20 sections).** You don't need to read the whole thing every session. CLAUDE.md tells you which GDD sections to read for whatever you're building. Always read CLAUDE.md first.

**Session protocol:**
- START of session: Read CLAUDE.md for current state and priorities
- DURING session: Read relevant GDD sections as needed
- END of session: Update CLAUDE.md (current state, session log, known issues, mark completed steps)
- ALWAYS commit with descriptive messages using the commit convention in CLAUDE.md

**Key architecture rules (also in CLAUDE.md):**
- PixiJS renders the game canvas. React renders UI. They share state via Zustand.
- Zustand store must be JSON-serializable at all times.
- Game loop runs in PixiJS ticker.
- All balance/tuning numbers go in `src/game/data/constants.ts`, never hardcoded.
- Two rendering views (isometric + floor plan) share the same data model.

Let's go — start with the scaffolding.
