# Broadway Tycoon v2.0 — "From Off-Off-Broadway to Legend"

## Context

Broadway Tycoon is a playable MVP (Step 17 complete) with a full game loop: buy property → build rooms → pick show → hire crew → audition cast → rehearse → run performances → summary → repeat. The core systems work but the experience is flat — colored rectangles for rooms, text lists for hiring, a progress bar for rehearsal, and numbers ticking for performances. There's no real way to lose, no competitive pressure, and no visual payoff for your decisions.

This spec covers a v2.0 overhaul across 4 areas: (1) fix the build menu accessibility bug, (2) illustrated visual overhaul for all rooms and phases, (3) theater customization with gameplay-impacting presets, and (4) a full stakes/progression system with rivals, trends, and meaningful loss conditions.

**Art style:** Stylized 2D illustrated — warm theatrical aesthetic, hand-drawn feel. PixiJS + CSS/SVG, no paid assets.
**Campaign length:** 2-4 hours, 8-12 shows across 5 acts.
**Tech constraints:** PixiJS v8 + @pixi/react for canvas, React 19 for UI, Zustand single store (JSON-serializable), Tailwind v4, localStorage persistence. No paid dependencies.

---

## 1. Build Menu Fix — "Renovate Anytime"

### Problem
Once the player clicks "Done Building" to enter production, there is no way to return to the build menu until the entire show cycle completes. If the hiring panel says "Build an Office to increase crew capacity," the player is stuck — they can't build an office without restarting the show cycle.

### Solution
Add a persistent **"Renovate"** button accessible in ALL phases after the initial building phase (production, audition, rehearsal, running, summary).

**Behavior:**
- Button appears in the top toolbar (next to speed controls)
- Opens a slide-out mini build panel (same room list, same grid interaction)
- Player can place new rooms or demolish existing ones
- Construction happens in real-time alongside whatever phase is active
- **Rush premium:** Construction during a show run costs 1.5x normal build price (the `constructionCostModifier` is multiplied by an additional 1.5)
- Construction countdown continues ticking via the existing game loop
- Closing the renovate panel returns to the current phase UI

**Store changes:**
- Add `ui.isRenovating: boolean` to toggle the renovate overlay
- The existing `placeRoom()` and `demolishRoom()` actions work as-is — no phase gating needed
- Add a `rushMultiplier` factor to room cost calculation when `currentPhase !== 'building'`

**Files to modify:**
- `src/store/gameStore.ts` — add `isRenovating` state, `toggleRenovate()` action, rush multiplier logic in `placeRoom()`
- `src/App.tsx` — add Renovate button to top bar (conditionally shown when phase !== 'building' && phase !== 'menu' && phase !== 'property_select')
- `src/ui/panels/BuildPanel.tsx` — extract room list into a reusable component that works in both full build mode and renovate overlay mode

---

## 2. Campaign Structure — "Five Acts"

### The Arc
The game is structured as a 5-act theatrical campaign. Acts are defined by show count, not calendar time. Each act introduces new mechanics, rivals, and pressure.

| Act | Name | Shows | What's New |
|-----|------|-------|------------|
| I | The Dream | 1-2 | Tutorial-adjacent. Small venue, limited options. Survive your first show. |
| II | Growing Pains | 3-5 | Rival 1 appears (Scrappy Upstart). Audience trends begin. Option to upgrade property or move. Loans unlock at Rep 15. |
| III | The Stakes | 6-8 | Rival 2 appears (Corporate Machine). Critics matter more (+/- 15 rep per review). Tony nominations teased. Season trends shift faster. |
| IV | The Gauntlet | 9-10 | Rival 3 appears (Legacy House). Tony Awards ceremony event. All-or-nothing show bets. Reputation swings amplified. |
| V | Legacy | 11-12 | Final push. All 3 rivals active and aggressive. Broadway Legend status (Rep 90+) or bust. Win condition: reach Legend status. |

**Act transitions:** Triggered by show count (not calendar). A notification announces the new act with flavor text ("Act II: The competition heats up..."). New mechanics are introduced via in-game notifications, not tutorials.

**Win condition:** Reach Broadway Legend status (reputation >= 90) by end of Act V. If you haven't reached it after show 12, you get one final show (show 13) — last chance.

**Store changes:**
- Add `campaign.act: number` (1-5), `campaign.showCount: number`
- Add `campaign.actMilestones: { act: number, showThreshold: number, unlocks: string[] }[]`
- `closeShow()` increments `showCount` and checks for act transition

### Loss Conditions

Three ways to lose:

1. **Bankruptcy:** Cash <= 0 with no way to recover. Specifically: cash is negative, no rooms to demolish for refund, and no active show generating revenue. Triggered at end of any day. Game over screen: "The lights go dark on [Theater Name]."

2. **Reputation Death:** Reputation drops below 10. Doesn't end the game immediately — instead enters "Condemned" state: critic review scores halved, top-tier candidates won't appear, audience attendance capped at 40%, rival theaters mock you in notifications. Player CAN recover (grind back above 10), but it's very hard. If rep stays below 10 for 3 consecutive shows, game over: "The critics have spoken. [Theater Name] is no more."

3. **Outcompeted:** During the running phase, if your attendance stays below 20% for 4 consecutive weeks while any rival theater's attendance is above 60%, your theater goes "dark." Game over: "[Rival Name] has stolen the spotlight. [Theater Name] closes its doors."

**Store changes:**
- Add `campaign.condemnedShowCount: number` (tracks consecutive shows under rep 10)
- Add `campaign.lowAttendanceWeeks: number` (tracks consecutive weeks under 20%)
- Loss checks run in the game loop's daily tick

---

## 3. Rival Theater System

### Three Rivals

Rivals are simulated AI theaters that run their own shows, compete for audience, and create narrative pressure. They don't have real grids/rooms — they're stat-based simulations that generate events and affect the shared audience pool.

**Rival 1 — The Scrappy Upstart (appears Act II)**
- Name: "The Fringe Collective" (procedurally named)
- Personality: Experimental, low-budget, critic-bait
- Show preferences: experimental, intimate_chamber, dark_horse
- Budget range: low ($30K-$80K productions)
- Threat: Steals critic attention. If they get a great review, your critic score matters less.
- Weakness: Low marketing budget, small venue (attendance cap 100)

**Rival 2 — The Corporate Machine (appears Act III)**
- Name: "Sterling Productions" (procedurally named)
- Personality: Big budget, safe bets, heavy marketing
- Show preferences: crowd_pleaser, big_spectacle, revival
- Budget range: high ($150K-$400K productions)
- Threat: Massive buzz campaigns that drown out yours. Can poach crew members you've fired.
- Weakness: Soulless shows — critic scores capped at 70. Vulnerable to trend shifts.

**Rival 3 — The Legacy House (appears Act IV)**
- Name: "The Belmont Theatre" (procedurally named)
- Personality: Prestige institution, Tony contender, top talent
- Show preferences: critics_darling, big_spectacle (prestige version)
- Budget range: very high ($200K-$500K productions)
- Threat: Competes directly for Tony nominations. Attracts best candidates (your hiring pool quality drops by 10 when they're active). The final boss.
- Weakness: Slow to adapt to trends (locked into genre for 2 shows). High overhead bleeds money.

### Rival Simulation (per game day)

Each rival runs a simplified show cycle:
1. **Show selection:** Every N days (based on rival type), rival announces a new show (genre, archetype, quality estimate). Notification: "[Rival] announces 'Show Title' — a [genre] opening in [X] days."
2. **Buzz competition:** Rival generates buzz daily (rate based on their marketing budget). This buzz competes with yours — the shared audience pool is finite. `playerAttendanceShare = playerBuzz / (playerBuzz + sum(rivalBuzz))` modifies your attendance.
3. **Rival show runs:** Rival show opens, runs for N days (quality-based), then closes. Notification: "[Rival]'s 'Show Title' closes after [N] performances."
4. **Poaching:** If you fire a crew member, 30% chance a rival hires them (notification: "[Rival] just hired [Name] as their [Role]").
5. **Counter-programming:** 20% chance a rival opens their show the same week as yours (intentional counter-programming).

### Rival State

```typescript
type RivalTheater = {
  id: string
  name: string
  personality: 'upstart' | 'corporate' | 'legacy'
  reputation: number          // 20-90 range, affects their show quality
  cash: number                // simplified, affects their decisions
  currentShow: RivalShow | null
  buzz: number                // competes with player buzz
  showHistory: RivalShow[]
  appearsAtAct: number        // when they enter the game
  active: boolean
}

type RivalShow = {
  title: string
  genre: ShowGenre
  quality: number             // simulated, not formula-based
  openDay: number
  closingDay: number | null
  attendance: number          // average %
}
```

**Files to create:**
- `src/game/systems/RivalSystem.ts` — rival simulation logic, show generation, buzz competition
- `src/game/data/rivals.ts` — rival definitions, name pools, personality configs

**Files to modify:**
- `src/store/gameStore.ts` — add `rivals: RivalTheater[]` state, rival tick actions
- `src/game/engine/GameLoop.ts` — call rival tick each day
- `src/game/systems/PerformanceSystem.ts` — modify attendance calc to factor in rival buzz share

---

## 4. Season & Trend System

### Audience Trends

Every 2-3 shows (randomized), a new audience trend activates. Trends modify attendance and appeal for specific genres/archetypes.

**Trend pool:**

| Trend | Duration | Effect |
|-------|----------|--------|
| Musical Renaissance | 2-3 shows | Musicals +20% attendance, plays -10% |
| Gritty Realism | 2-3 shows | Plays/experimental +15%, big spectacles -15% |
| Star Power Era | 2-3 shows | High star-power casts +25% buzz bonus |
| Budget Crunch | 2-3 shows | All costs +20%, audiences more price-sensitive (price factor penalty doubled) |
| Revival Fever | 2-3 shows | Revivals +20% attendance, experimental -10% |
| Critics' Season | 2-3 shows | Critic scores weighted 2x for attendance, marketing effectiveness halved |

**Announcement:** Trends are announced 1 show before they take effect: "Word on the street: audiences are craving musicals this season." This gives the player time to plan their next show selection.

**Surprise shifts:** 15% chance a trend shifts 1 show early (mid-run). Notification: "The winds have shifted — [new trend] takes hold unexpectedly."

**Store changes:**
- Add `campaign.currentTrend: Trend | null`
- Add `campaign.nextTrend: Trend | null` (previewed)
- Add `campaign.trendShowsRemaining: number`
- Trend effects applied as multipliers in `PerformanceSystem.ts` attendance calc and `ShowSystem.ts` quality calc

**Files to create:**
- `src/game/data/trends.ts` — trend definitions, effects, duration ranges

---

## 5. Illustrated Room Visuals

### Rendering Approach

Each room type gets an illustrated interior rendered via PixiJS sprites/graphics. The floor plan view (default) shows a top-down illustrated interior for each placed room. The isometric view shows an angled perspective.

**Implementation strategy:** Each room visual is built with PixiJS Graphics primitives (rectangles, circles, lines, polygons) + text, NOT sprite sheets or external images. This keeps assets at zero cost and fully procedural. Colors and details vary by room preset (see Section 6).

### Room Visual Definitions

Each room has a `renderRoom(graphics: PIXI.Graphics, room: Room, preset: RoomPreset, phase: GamePhase)` function that draws the illustrated interior.

**Lobby:**
- Floor: checkered tile pattern (alternating light/dark squares)
- Center: chandelier (circle + radiating lines)
- Sides: velvet rope stanchions (small circles connected by curved lines)
- Walls: framed rectangles (show posters)
- **Phase animation:** During `running` phase, small colored circles (patron figures) mill about

**Stage:**
- Floor: horizontal lines (wooden planks)
- Top: proscenium arch (curved rectangle frame) — varies by preset
- Center: curtain (draped lines) — open during `running`, closed otherwise
- Above: spotlight circles (gradient-filled)
- **Phase animation:** During `running`, small figures on stage. During `rehearsal`, figures with script rectangles.

**Seating:**
- Rows of small rounded rectangles (seats), arranged in arc pattern
- Center aisle (gap between seat blocks)
- Gradient from darker (front) to lighter (back) suggesting rake
- **Phase animation:** During `running`, seats fill with colored dots (green = occupied). Fill percentage matches attendance.

**Backstage:**
- Walls: brick pattern (offset rectangles)
- Props: small rectangles + triangles on table shapes
- Mirror: rectangle with small circles around it (lights)
- Costume rack: vertical line with hangers (small triangles)
- **Phase animation:** During `rehearsal`, small figures moving between props

**Box Office:**
- Ticket window: rectangle with arch top, brass (gold) colored frame
- Above: "NOW PLAYING" text
- Queue: stanchion posts with lines between them
- Counter with small rectangle (register)
- **Phase animation:** During `running`, small circles queued up. Queue length proportional to buzz.

**Office:**
- Desk: large rectangle, slightly angled
- Behind desk: small rectangles (filing cabinets)
- Wall: rectangle grid (bulletin board) with small colored squares (headshots)
- On desk: small shapes (papers, coffee mug circle)
- **Phase animation:** Headshot squares appear/disappear as crew is hired/fired. Number of visible headshots = crew count.

**Dressing Room:**
- Mirror with lights (same as backstage but larger)
- Counter beneath mirror
- Costume rack (wider)
- Small table with circles (makeup)
- **Phase animation:** During `rehearsal` and `running`, figure silhouettes at mirror

**Orchestra Pit:**
- Sunken rectangle (darker background)
- Small shapes representing instruments: circles (drums), rectangles (piano), curves (string instruments)
- Music stand shapes (triangles on sticks)
- **Phase animation:** During `running` for musicals, small figures with instruments, note symbols floating up

**Rehearsal Hall:**
- Large open floor (lighter color)
- Mirrors on one wall (reflective rectangles)
- Piano in corner
- Folding chairs along edges
- Tape marks on floor (X marks)
- **Phase animation:** During `rehearsal`, active cast figures moving. More coordinated as readiness increases.

**All other rooms** (VIP Lounge, Concession Stand, Storage, Tech Booth, Green Room, Restrooms): Similar pattern — illustrated interiors using PixiJS Graphics primitives with phase-specific animations.

### Construction Animation

Rooms under construction show a 4-stage visual build sequence instead of just being grayed out:

| Stage | % Complete | Visual |
|-------|-----------|--------|
| Foundation | 0-25% | Bare outline, diagonal "construction tape" lines (yellow/black), scattered debris dots |
| Framing | 25-50% | Wall outlines appearing, scaffolding (cross-hatched rectangles), small worker figures |
| Finishing | 50-75% | Walls filled, paint swatches appearing, furniture outlines fading in |
| Complete | 75-100% | Transition flash, full illustrated room with chosen preset |

Construction stage is calculated as: `stage = Math.floor((1 - daysLeft / totalDays) * 4)`

No new game mechanics — purely visual mapping of existing `constructionDaysLeft` data.

### Auto-placed Decorative Elements

When rooms are adjacent, decorative connecting elements are auto-drawn:
- **Lobby ↔ Seating:** Small diagonal lines (stairs) drawn at the shared edge
- **Stage ↔ Seating:** Subtle line suggesting the stage lip / edge
- **Stage ↔ Backstage:** Door rectangle at shared edge
- **Lobby ↔ Box Office:** Window/counter at shared edge

These are drawn by a `renderConnections(graphics, rooms)` function that checks adjacency.

**Files to create:**
- `src/game/rendering/RoomRenderer.ts` — room-specific illustration functions
- `src/game/rendering/ConstructionRenderer.ts` — construction stage visuals
- `src/game/rendering/ConnectionRenderer.ts` — auto-placed decorative connections

**Files to modify:**
- `src/game/rendering/FloorPlanRenderer.ts` — replace solid-color fills with calls to RoomRenderer
- `src/game/rendering/IsometricRenderer.ts` — replace basic cubes with illustrated room views at angle

---

## 6. Room Style Presets

### System Design

When placing a room, a preset selector appears (3 options). Each preset defines: visual theme (colors, patterns, decorative details) + gameplay modifiers. Presets are permanent for that room unless demolished and rebuilt.

Only the 5 required rooms + Office get presets in v2 (the most impactful rooms). Optional rooms use a single default style.

### Preset Definitions

#### Lobby Presets

| Preset | Visual | Gameplay |
|--------|--------|----------|
| **Classic Grand** | Marble floor (white/gray checker), crystal chandelier (larger, more lines), red carpet (center stripe), gilded columns (gold rectangles at edges) | +10% ticket price, +15% maintenance cost |
| **Art Deco** | Geometric floor pattern (triangles), gold accents on walls, stepped ceiling lines, terrazzo (speckled) floor | +5% ticket price, +5% reputation gain per show, +10% build cost |
| **Industrial Chic** | Exposed brick (brown offset rectangles), Edison bulbs (small warm circles on lines), concrete floor (flat gray), metal beams (dark lines) | -20% build cost, +10% experimental show appeal, -5% mainstream audience appeal |

#### Stage Presets

| Preset | Visual | Gameplay |
|--------|--------|----------|
| **Proscenium** | Grand arch frame (ornate curved rectangle), heavy red/gold curtain, fly system (lines above), orchestra pit compatible | +10% musical quality, +5% big spectacle appeal, min room size 5x4 |
| **Thrust** | Stage extends into seating area (T-shape drawn), minimal frame, audience on 3 sides | +15% intimate/experimental quality, +5% critic score bonus, -10% max seating capacity |
| **Black Box** | Flat black walls, minimal fixtures, flexible grid markings, exposed ceiling grid | -30% build cost, +20% experimental appeal, -15% mainstream appeal, -10% musical quality |

#### Seating Presets

| Preset | Visual | Gameplay |
|--------|--------|----------|
| **Velvet Orchestra** | Plush red seats (rounded rects), gold armrests (thin gold lines), tiered rows with wider spacing, center aisle prominent | +10% ticket price, -15% total capacity (wider seats = fewer per row) |
| **Standard House** | Dark gray seats, clean rows, adequate spacing, two aisles | No bonuses or penalties — baseline |
| **Bleacher/Risers** | Simple bench lines (long rectangles), steep rake (tight row spacing), raw/industrial feel | +25% total capacity, -25% build cost, -10% ticket price, -5% cast morale |

#### Backstage Presets

| Preset | Visual | Gameplay |
|--------|--------|----------|
| **Professional** | Clean walls, organized prop shelves, dedicated costume area, lighting rigs | +5% show quality, +5% crew morale, standard cost |
| **Scrappy** | Cluttered, makeshift shelving, clothes on hooks not racks, exposed pipes | -20% build cost, -5% show quality |
| **Deluxe** | Full costume workshop, prop fabrication area, quick-change booths | +10% show quality, +10% build cost, +10% maintenance |

#### Box Office Presets

| Preset | Visual | Gameplay |
|--------|--------|----------|
| **Traditional** | Brass-framed window, hand-lettered "Now Playing" sign, wooden counter | +5% walk-up sales (attendance bonus for low-buzz shows), standard cost |
| **Modern** | Digital display screens, sleek counter, QR code signage | +5% marketing campaign effectiveness, +10% build cost |
| **Vintage** | Art nouveau metalwork, stained glass transom, ornate tilework | +5% ticket price, +15% build cost, +3% reputation gain |

#### Office Presets

| Preset | Visual | Gameplay |
|--------|--------|----------|
| **Standard** | Basic desk, filing cabinet, small bulletin board (3 pin slots visible), phone | Crew cap: 5. Standard cost. |
| **Executive** | Large mahogany desk, bookshelf, bigger bulletin board (5 pin slots), window view | Crew cap: 7. +20% build cost. +5% crew hire quality (better candidates). |
| **Creative Loft** | Standing desk, whiteboard wall, beanbag chairs, open layout | Crew cap: 6. +10% crew morale. +10% rehearsal event chance (more dynamic rehearsals). |

**Note:** No office built = crew cap remains 3 (unchanged from current). Building any office preset immediately raises the cap to its preset value.

### Preset Data Structure

```typescript
type RoomPreset = {
  id: string                    // e.g., 'lobby_classic_grand'
  roomType: RoomType
  name: string                  // "Classic Grand"
  description: string           // 1-line flavor
  visualTheme: {
    primaryColor: string        // hex
    secondaryColor: string      // hex
    accentColor: string         // hex
    pattern: 'checker' | 'geometric' | 'brick' | 'plain' | 'wood'
    decorations: string[]       // list of decoration keys the renderer draws
  }
  modifiers: {
    ticketPriceBonus: number    // multiplier (1.1 = +10%)
    buildCostMultiplier: number // multiplier (0.8 = -20%)
    maintenanceCostMultiplier: number
    capacityMultiplier: number  // for seating
    qualityBonus: number        // flat addition to show quality
    reputationGainMultiplier: number
    crewCapacity?: number       // for office presets
    genreBonus?: { genre: string, bonus: number }[]  // genre-specific
  }
}
```

**Files to create:**
- `src/game/data/presets.ts` — all preset definitions

**Files to modify:**
- `src/store/gameStore.ts` — `placeRoom()` now accepts a `presetId` parameter; Room type gets a `presetId: string` field
- `src/ui/panels/BuildPanel.tsx` — add preset selector UI (3 cards with preview + stats) shown after room type is selected
- `src/game/systems/PerformanceSystem.ts` — apply preset modifiers to attendance/revenue calcs
- `src/game/rendering/RoomRenderer.ts` — read preset visual theme to determine colors/patterns/decorations

---

## 7. Show Selection Visual — "The Pitch Meeting"

### Current State
`ShowPickerModal.tsx` — a modal with text cards showing title, genre, stats, and a select button.

### New Design
Replace the text modal with a visual pitch panel. Still a modal overlay, but styled as a producer's desk.

**Layout:**
- Background: warm desk surface (illustrated via CSS gradient)
- 3 show "scripts" laid out as visual cards (angled slightly, like papers on a desk)
- Each card shows:
  - Show title in theatrical italic font
  - Genre + archetype as colored badges
  - Stat bars (script quality, audience appeal) — horizontal bars with fills
  - Cast size, budget estimate, rehearsal days as small icons with numbers
  - 1-line elevator pitch flavor text ("A jazz-age murder mystery with a twist ending")
  - **Trend indicator:** Colored border glow — green if genre matches current trend, amber if neutral, red if against trend
- Commission option: separate card styled as a blank script with a pen + "$25,000" tag
- Hover card to enlarge slightly (CSS transform)
- Click to select → card slides to center, others fade, confirm button appears

**Files to modify:**
- `src/ui/modals/ShowPickerModal.tsx` — complete visual redesign (React/CSS, no PixiJS needed)

---

## 8. Crew Hiring Visual — "The Office"

### Current State
`StaffPanel.tsx` — a list of roles with "Hire" buttons that expand to show text candidate cards.

### New Design
The hiring panel becomes a visual scene set in the player's office.

**Layout (React panel, not PixiJS):**
- Top section: illustrated office scene (CSS/SVG)
  - Desk on left side (player's perspective)
  - 3 candidate silhouettes on right side (chairs)
  - Bulletin board behind desk showing hired crew headshots (colored squares with initials)
  - Pin slot count = crew capacity (visually obvious why you need an office)
- Bottom section: candidate cards (when a role is expanded)

**Interaction flow:**
1. Player selects a role from the role list (left sidebar within panel)
2. 3 candidate cards appear (replacing the silhouettes in the scene)
3. Each candidate card shows:
   - Name + personality trait badge
   - Skill bar (color-coded: red < 40, yellow 40-70, green > 70)
   - Weekly salary
   - Flavor quote in italics ("My last show ran 14 months")
4. Click "Hire" → candidate's initial/color pins to the bulletin board. Brief highlight animation.
5. Click "Pass" → candidate fades out
6. "Refresh candidates" generates 3 new candidates with a shuffle animation

**Crew capacity visual:**
- Bulletin board shows empty pin slots (dashed circles) for remaining capacity
- When capacity is full, trying to hire shows a "Board is full — build/upgrade an Office" message with the Renovate button highlighted

**Files to modify:**
- `src/ui/panels/StaffPanel.tsx` — complete visual redesign

---

## 9. Audition Visual — "Center Stage"

### Current State
`AuditionModal.tsx` — modal with role tabs and candidate text cards.

### New Design
The audition modal becomes a visual stage scene.

**Layout:**
- Top 60%: stage illustration (CSS/SVG, not PixiJS — this is a modal overlay)
  - Stage floor with spotlight circle (radial gradient) center
  - Wings left (waiting candidates as small silhouettes)
  - Wings right (already-seen candidates, dimmed)
  - Current auditioner center stage (larger silhouette with colored accent matching their highest stat)
- Bottom 40%: casting table view
  - "You" sit at an audition table (implied by perspective)
  - Current candidate's stat card:
    - Name, talent bar, star power (sparkle icons), salary, personality
    - Chemistry indicator (if other roles already cast): spark icons 1-5 showing compatibility
  - Two buttons: "Next!" (dismiss) and "Cast in Role" (assign)

**Interaction flow:**
1. Role tabs at top (Lead, Supporting 1, Supporting 2, Ensemble, etc.)
2. First candidate walks to center (slides in from left)
3. High talent (>70): confident pose silhouette (straight, arms wide). Low talent (<40): slouched, arms tight.
4. Star power shown as glow intensity around the silhouette
5. Player reviews stats, clicks Cast or Next
6. Cast → spotlight flashes gold (CSS animation), candidate moves to "cast" section. Next → candidate slides off right, next slides in from left.
7. When all roles filled, "Begin Rehearsals" button activates

**Chemistry preview:**
- When hovering "Cast in Role," if other roles are filled, show chemistry sparks between the candidate and each cast member (1-5 sparks, calculated from personality compatibility)
- Chemistry formula: simple deterministic pseudo-chemistry using a string hash of both personalities. `Math.abs(hash(candidate.personality) - hash(castMember.personality)) % 5 + 1` where `hash` is a basic string → number function (e.g., sum of char codes). Not a real personality model — just deterministic variety so the same pair always gets the same chemistry score.

**Files to modify:**
- `src/ui/modals/AuditionModal.tsx` — complete visual redesign

---

## 10. Rehearsal Visual — "The Rehearsal Room"

### Current State
A small overlay (`RehearsalOverlay` in App.tsx) showing show title, progress bar, cast list, and log. Text-only.

### New Design
The rehearsal phase gets a full visual scene that evolves as readiness increases, plus strategic decision points.

**Main view (replaces the current overlay — becomes the primary content area):**

**Visual scene (PixiJS canvas, same GameCanvas):**
- Shows the rehearsal hall room (or stage if no hall built) with cast figures
- Cast figures are simple shapes (circles for heads, rectangles for bodies) with color-coding per role
- Movement quality evolves with readiness:
  - 0-25% (Blocking): Figures stationary, small "script" rectangles in hand, director figure pacing at edge
  - 25-50% (Stumbling): Figures moving slowly, occasional jittery movements, scripts still visible
  - 50-75% (Gelling): Smoother movement patterns, scripts gone, figures moving in formations
  - 75-100% (Polishing): Fluid synchronized movement, costume colors appear on figures, lighting effect overlays

**Rehearsal event visuals (PixiJS overlay on scene):**
- Breakthrough: lightbulb icon pulses above a cast figure, brief golden glow
- Conflict: two figures face each other with red "!" icon between them
- Injury: figure moves to edge, small red cross icon

**Director decisions (React modal overlay, triggered during rehearsal):**
Pop up every 5-7 rehearsal days (randomized). 2 choices per decision.

| Decision | Option A | Option B |
|----------|----------|----------|
| Rehearsal focus | "Focus on choreography" (+3% quality, +1 day) | "Run full scenes" (+5% readiness, no quality bonus) |
| Lead's request | "Let them improvise" (+5% quality, risk: 10% chance of -3% readiness) | "Stick to the script" (+3% readiness, no risk) |
| Cast tension | "Mediate the conflict" (-$2K, +5 morale all) | "Let them work it out" (50% chance +3 chemistry, 50% chance -5 morale) |
| Tech rehearsal | "Full tech run" (+5% quality, +2 days) | "Minimal tech" (+0% quality, save time) |
| Guest choreographer | "Hire them" (-$5K, +8% quality for musicals) | "We're fine" (no effect) |

**Right panel:** Marketing sidebar (same as current MarketingPanel, available during rehearsal)

**Bottom bar:** Readiness progress bar (larger, more prominent), day counter, morale summary icons per cast member (up/neutral/down arrows, colored green/yellow/red)

**Files to modify:**
- `src/App.tsx` — replace RehearsalOverlay with full RehearsalView component
- `src/game/rendering/FloorPlanRenderer.ts` or new `RehearsalSceneRenderer.ts` — cast figure animation based on readiness
- `src/game/systems/RehearsalSystem.ts` — add director decision triggers and effects

**Files to create:**
- `src/ui/panels/RehearsalView.tsx` — new full rehearsal UI
- `src/ui/modals/DirectorDecisionModal.tsx` — rehearsal decision pop-ups
- `src/game/data/decisions.ts` — director decision definitions

---

## 11. Performance Night Visual — "Curtain Up"

### Current State
`RunDashboard.tsx` — a panel showing ticket price slider, nightly stats, and run day counter. Numbers only.

### New Design
The running phase becomes a visual theater experience where you watch each night play out.

**Main view layout:**

**Left 60% — Theater Scene (PixiJS canvas):**
Three sub-scenes that cycle each game night:

1. **Pre-curtain (first 1/3 of night tick):**
   - Lobby view: patron figures streaming in through illustrated lobby
   - Concession stand (if built): queue of figures
   - Transition to seating view: seat grid fills in real-time
   - Seats fill from front-center outward (best seats first)
   - Green dots = filled seats, dark = empty
   - Fill speed matches attendance percentage

2. **Show in progress (middle 1/3):**
   - Stage view: curtain opened, spotlight active
   - Abstract cast figures moving on stage (simple choreographed movements)
   - Audience reaction indicators: small symbols floating up from seating area
     - Quality > 80: applause sparkles (gold dots rising)
     - Quality 50-80: occasional clap (small white dots)
     - Quality < 50: yawn symbols (small "z" letters)
   - If quality > 85: standing ovation — audience dots rise slightly (standing up)

3. **Curtain call (final 1/3):**
   - Cast figures line up at stage front
   - Applause intensity (rising dot density) scales with quality
   - Revenue counter visible (ticking up)

**Right 40% — Dashboard (React panel):**
- Show title + night number
- Tonight's attendance (bar + percentage)
- Revenue breakdown: tickets, concessions, VIP (if applicable)
- Expenses: salaries, maintenance, marketing
- Net profit (large, colored green/red)
- Run totals: cumulative revenue, avg attendance, best/worst night
- Ticket price adjuster (slider, same as current)
- Active marketing campaigns with days remaining
- **Rival ticker:** Small section showing what rival theaters are doing ("The Fringe Collective's 'Neon Dreams' drew 85% tonight")

**Special nights:**

**Opening Night:**
- Extra fanfare: marquee lights flash, "OPENING NIGHT" banner
- Critic figure appears in front row (figure with notepad)
- After the performance, dramatic pause → critic score reveals (envelope-opening animation → score appears with appropriate reaction: applause for >80, polite clapping for 50-80, boos for <50)

**Closing Night (manual or forced):**
- "FINAL PERFORMANCE" banner
- Extra bows animation
- If run > 50 performances: flowers thrown on stage (colored dots arcing from audience)
- Transition to End of Run summary

**Monday Dark:**
- Theater scene shows empty, dark theater
- "Dark Monday — No performance" text
- Maintenance costs still applied
- Good time for ticket price adjustments, reviewing stats

**Files to modify:**
- `src/ui/panels/RunDashboard.tsx` — expand with rival ticker, better stat layout
- `src/game/rendering/FloorPlanRenderer.ts` — add performance night rendering mode (or create separate renderer)
- `src/game/systems/PerformanceSystem.ts` — add opening night critic score logic, rival ticker data

**Files to create:**
- `src/game/rendering/PerformanceRenderer.ts` — theater scene for show nights (lobby fill, show, curtain call)
- `src/ui/components/RivalTicker.tsx` — rival activity feed

---

## 12. End of Run — "Final Curtain"

### Current State
`EndOfRunModal.tsx` — shows total revenue, expenses, profit, attendance, reputation change.

### New Design
The end-of-run summary becomes a theatrical playbill-styled card.

**Layout:**
- Styled like a Broadway playbill / show poster
- Show title in large theatrical font (CSS `font-family: Georgia, serif; font-style: italic`)
- "Played at [Theater Name]" subtitle
- Performance count: "X Performances, [Start Date] — [End Date]"
- Stats section:
  - Total Revenue (large, gold if profitable)
  - Total Expenses
  - Net Profit/Loss (large, green/red)
  - Peak Attendance Night
  - Average Attendance %
  - Critic Score (with star rating visual: filled/empty stars)
- Reputation change: "+X Reputation" or "-X Reputation" with animation
- Achievements earned during this run (if any)
- **Tony Nomination:** If quality > 80 AND performances > 60 AND Act IV+, gold "Tony Nominated" badge with sparkle animation
- Two buttons: "Return to Building" (phase → `building`) and "Start New Production" (phase → `production`, skips building — for when your theater is already set up and you just want a new show)

**Tony Awards (end of Act IV):**
If player has a Tony-nominated show, a special "Tony Awards Ceremony" event triggers:
- Dramatic reveal: categories announced one by one (Best Musical, Best Play, Best Director, Best Actor)
- Player's show competes against rival shows for each category
- Winning a Tony: +15 reputation, +30 buzz for next show, permanent "Tony Winner" badge on theater
- Losing: +5 reputation (nomination alone is prestigious)

**Files to modify:**
- `src/ui/modals/EndOfRunModal.tsx` — complete visual redesign with playbill styling
- `src/store/gameStore.ts` — add Tony nomination/award tracking

**Files to create:**
- `src/ui/modals/TonyAwardsModal.tsx` — Tony ceremony event

---

## 13. Notification & Event System Overhaul

### Current State
Basic toast notifications. Events are modal pop-ups with text choices.

### New Design

**Notification types (visual distinction):**
- **Info** (blue): neutral updates ("Day 45", "Rehearsal at 67%")
- **Money** (gold): financial events ("$5,608 profit tonight", "Salary payment: -$3,200")
- **Rival** (purple): competitor activity ("The Fringe Collective announces 'Neon Dreams'")
- **Trend** (amber): audience trend changes ("Audiences are craving musicals")
- **Danger** (red): warnings ("Cash running low", "Attendance below 30%", "Reputation dropping")
- **Achievement** (gold sparkle): milestones ("First Curtain Call!", "Packed House!")

**Event modals:**
- Keep existing event modal structure but add visual flavor
- Event severity shown with border color (minor=blue, moderate=amber, major=red)
- Choice cards show effects preview ("+$5K, -3 Rep" visible before choosing)
- Event illustration: simple CSS/SVG scene matching the event (e.g., "Costume Disaster" shows a torn costume icon, "Critic Visit" shows a figure with notepad)

**Files to modify:**
- `src/ui/components/NotificationToast.tsx` — add type-based styling, icons
- `src/ui/modals/EventModal.tsx` — add visual flavor, effects preview

---

## 14. Store Changes Summary

All new state additions to the Zustand store (`gameStore.ts`):

```typescript
// Campaign
campaign: {
  act: number                           // 1-5
  showCount: number                     // total shows completed
  condemnedShowCount: number            // consecutive shows under rep 10
  lowAttendanceWeeks: number            // consecutive weeks under 20%
  currentTrend: Trend | null
  nextTrend: Trend | null
  trendShowsRemaining: number
  tonyNominations: string[]             // show IDs
  tonyWins: string[]                    // show IDs
}

// Rivals
rivals: RivalTheater[]                  // 3 rival theaters

// UI additions
ui: {
  ...existing,
  isRenovating: boolean                 // renovate mode overlay
}

// Room additions
// Room type gets: presetId: string
```

New actions:
- `toggleRenovate()` — toggle renovate mode
- `tickRivals()` — advance rival simulation 1 day
- `checkLossConditions()` — run all 3 loss checks
- `advanceAct()` — transition to next campaign act
- `setTrend(trend)` — apply new audience trend
- `nominateForTony(showId)` — add Tony nomination
- `resolveDirectorDecision(decisionId, choiceId)` — apply rehearsal decision effects

---

## 15. New Files Summary

| File | Purpose |
|------|---------|
| `src/game/data/presets.ts` | Room style preset definitions (visuals + modifiers) |
| `src/game/data/trends.ts` | Audience trend definitions and effects |
| `src/game/data/rivals.ts` | Rival theater definitions and name pools |
| `src/game/data/decisions.ts` | Director rehearsal decision definitions |
| `src/game/systems/RivalSystem.ts` | Rival AI simulation logic |
| `src/game/rendering/RoomRenderer.ts` | Illustrated room drawing functions |
| `src/game/rendering/ConstructionRenderer.ts` | Construction stage visuals |
| `src/game/rendering/ConnectionRenderer.ts` | Auto-placed decorative room connections |
| `src/game/rendering/PerformanceRenderer.ts` | Show night theater scene |
| `src/ui/panels/RehearsalView.tsx` | Full rehearsal phase UI |
| `src/ui/modals/DirectorDecisionModal.tsx` | Rehearsal decision pop-ups |
| `src/ui/modals/TonyAwardsModal.tsx` | Tony ceremony event |
| `src/ui/components/RivalTicker.tsx` | Rival activity feed |

---

## 16. Modified Files Summary

| File | Changes |
|------|---------|
| `src/store/gameStore.ts` | Campaign state, rivals, renovate toggle, preset support, loss conditions, trend system |
| `src/App.tsx` | Renovate button, rehearsal view swap, notification type styling |
| `src/ui/panels/BuildPanel.tsx` | Preset selector UI, extract reusable room list for renovate mode |
| `src/ui/panels/StaffPanel.tsx` | Visual office scene redesign |
| `src/ui/panels/RunDashboard.tsx` | Rival ticker, expanded stats, performance night integration |
| `src/ui/modals/ShowPickerModal.tsx` | Visual pitch cards with stat bars and trend indicators |
| `src/ui/modals/AuditionModal.tsx` | Stage scene redesign with chemistry preview |
| `src/ui/modals/EndOfRunModal.tsx` | Playbill-styled summary, Tony nomination |
| `src/ui/modals/EventModal.tsx` | Visual flavor, effects preview |
| `src/ui/components/NotificationToast.tsx` | Type-based styling |
| `src/game/engine/GameLoop.ts` | Rival ticks, loss condition checks, trend advancement, director decision triggers |
| `src/game/systems/PerformanceSystem.ts` | Rival buzz share in attendance, preset modifiers, critic night |
| `src/game/systems/RehearsalSystem.ts` | Director decision triggers, visual state for readiness stages |
| `src/game/rendering/FloorPlanRenderer.ts` | Illustrated rooms via RoomRenderer, construction stages, connections |
| `src/game/rendering/IsometricRenderer.ts` | Illustrated room views at angle |
| `src/game/data/constants.ts` | Campaign thresholds, loss condition numbers, trend multipliers |
| `src/game/data/rooms.ts` | Add presetId field to Room type |
| `src/types/index.ts` | New types: RivalTheater, RivalShow, Trend, RoomPreset, Campaign, DirectorDecision |

---

## 17. Verification Plan

### Build Verification
- `npm run build` must pass clean after each implementation phase
- No new dependencies (all rendering done with existing PixiJS + React + Tailwind)

### Gameplay Testing
1. **New game flow:** Start → property select → build with presets → shows → hiring → auditions → rehearsal with decisions → performance nights → end of run → repeat through all 5 acts
2. **Renovate button:** Verify it works from production, audition, rehearsal, and running phases. Verify rush pricing.
3. **Loss conditions:** Test all 3: drain cash to 0, tank reputation below 10, let attendance drop while rival thrives
4. **Rival system:** Verify rivals appear at correct acts, their shows affect player attendance, they poach fired crew
5. **Trend system:** Verify trends announce 1 show early, apply correct genre modifiers, occasionally shift early
6. **Preset modifiers:** Verify each room preset's gameplay effects apply correctly to ticket price, capacity, quality, etc.
7. **Tony nominations:** Verify criteria (quality > 80, performances > 60, Act IV+) and ceremony event
8. **Visual regression:** Check all rooms render correctly in both floor plan and isometric views with all 3 presets
9. **Save/load:** Verify all new state (campaign, rivals, presets, trends) serializes and loads correctly
10. **Performance:** Verify game doesn't lag with all visual animations active (PixiJS graphics, not sprites — should be lightweight)

### Browser Testing
- Desktop (primary)
- iPad (secondary — Dixon's preferred testing device)
- iPhone (sanity check)
