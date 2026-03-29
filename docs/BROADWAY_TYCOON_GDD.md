# Broadway Tycoon — Game Design Document v1.0

---

## Table of Contents

1. [Game Overview](#1-game-overview)
2. [Tech Stack](#2-tech-stack)
3. [Project Structure](#3-project-structure)
4. [Game Flow & Phases](#4-game-flow--phases)
5. [Rendering & Camera](#5-rendering--camera)
6. [Real Estate & Properties](#6-real-estate--properties)
7. [Building & Rooms](#7-building--rooms)
8. [Show System](#8-show-system)
9. [Run Phase & Idle](#9-run-phase--idle)
10. [Audition & Casting](#10-audition--casting)
11. [Economy](#11-economy)
12. [Progression](#12-progression)
13. [Event System](#13-event-system)
14. [Room Details & Upgrades](#14-room-details--upgrades)
15. [Crew & Staff](#15-crew--staff)
16. [Art & Assets](#16-art--assets)
17. [Save System](#17-save-system)
18. [MVP Scope](#18-mvp-scope)
- [Appendix A — Type Definitions](#appendix-a--type-definitions)
- [Appendix B — Balance Constants](#appendix-b--balance-constants)

---

## 1. Game Overview

### Elevator Pitch
You are a Broadway producer. Buy a crumbling building in NYC's Theater District, renovate it into a working theater, discover shows, audition talent, hire crew, and open on Broadway. Fill seats, dodge critics, survive drama — and maybe, just maybe, win a Tony.

### Genre
Theater management simulation / tycoon game.

### Platform
Browser-based (desktop-first, responsive to tablet). Single-player.

### Target Audience
- Tycoon/sim fans (Game Dev Tycoon, Two Point Hospital, Project Highrise)
- Theater nerds who've always wondered what it takes to produce a show
- Casual strategy players who enjoy building + optimization loops

### Tone
Mid-depth simulation. Approachable enough for casual players, deep enough that decisions matter. Theater knowledge is rewarded but never required. Light humor in events and show descriptions — the game doesn't take itself too seriously, but the systems are real.

### Win/Lose Conditions
- **Lose:** Bankrupt (negative balance for 30+ consecutive days with no assets to sell)
- **Win:** No hard win state — progression is open-ended. Milestones mark achievement (first hit show, first Tony nomination, owning 3 theaters, etc.)

---

## 2. Tech Stack

| Layer | Technology | Role |
|-------|-----------|------|
| Rendering | PixiJS v8 + @pixi/react | Game canvas (tiles, sprites, animations) |
| UI | React 19 + TypeScript | Menus, panels, dashboards, modals, overlays |
| Build | Vite | Dev server + bundler |
| State | Zustand | Single serializable store shared by PixiJS and React |
| Styling | Tailwind CSS v4 | UI components only (not canvas) |
| Save (MVP) | localStorage | Serialized game state |
| Save (post-MVP) | Firebase Firestore | Cloud saves, leaderboards |
| Source Control | GitHub | Version control |

### Architecture Rules
1. **PixiJS owns the game canvas.** All tile rendering, sprites, camera, isometric math = PixiJS. React does NOT render game objects.
2. **React owns UI chrome.** Menus, panels, dashboards, modals, toasts = React components styled with Tailwind.
3. **Zustand is the single source of truth.** Both PixiJS and React read/write the same store. Store must be JSON-serializable at all times — NO functions, class instances, or circular references.
4. **Game loop = PixiJS ticker.** Economy calculations, event checks, time progression — all run in `app.ticker.add()`.
5. **Balance constants live in `src/game/data/constants.ts`.** Never hardcode game numbers in system logic.
6. **Two views, one data model.** Isometric exterior and top-down floor plan both render from the same BuildingState. Switching views = different projection math, same data.

---

## 3. Project Structure

```
broadway-tycoon/
├── public/
│   ├── sprites/              # Sprite sheets and tile assets
│   │   ├── buildings/        # Exterior building sprites
│   │   ├── rooms/            # Room furniture/decoration sprites
│   │   ├── characters/       # Staff and actor portraits
│   │   └── ui/               # UI icons and decorative elements
│   └── audio/                # Sound effects and music (post-MVP)
├── src/
│   ├── main.tsx              # Entry point
│   ├── App.tsx               # Root component — canvas + UI layout
│   ├── game/
│   │   ├── canvas/
│   │   │   ├── GameCanvas.tsx        # PixiJS Stage wrapper
│   │   │   ├── Camera.ts            # Pan/zoom/bounds logic
│   │   │   ├── IsometricRenderer.ts  # Iso projection + exterior view
│   │   │   ├── FloorPlanRenderer.ts  # Top-down grid view
│   │   │   ├── TileGrid.ts          # Grid math, cell ↔ pixel conversion
│   │   │   └── sprites/
│   │   │       ├── BuildingSprite.ts
│   │   │       ├── RoomSprite.ts
│   │   │       └── CharacterSprite.ts
│   │   ├── systems/
│   │   │   ├── GameLoop.ts           # Ticker-based game loop
│   │   │   ├── TimeSystem.ts         # Day counter, speed, pause
│   │   │   ├── EconomySystem.ts      # Income, expenses, balance
│   │   │   ├── ShowSystem.ts         # Show generation, quality calc
│   │   │   ├── AuditionSystem.ts     # Candidate generation, casting
│   │   │   ├── RehearsalSystem.ts    # Readiness progression
│   │   │   ├── MarketingSystem.ts    # Buzz score, ad campaigns
│   │   │   ├── PerformanceSystem.ts  # Nightly loop, attendance
│   │   │   ├── EventSystem.ts        # Random events, triggers
│   │   │   ├── ProgressionSystem.ts  # Reputation, unlocks
│   │   │   └── CrewSystem.ts         # Hiring, morale, salaries
│   │   ├── data/
│   │   │   ├── constants.ts          # ALL balance/tuning numbers
│   │   │   ├── showArchetypes.ts     # Show templates and genres
│   │   │   ├── roomDefinitions.ts    # Room types, costs, sizes
│   │   │   ├── eventDefinitions.ts   # Event templates
│   │   │   ├── propertyListings.ts   # Available properties
│   │   │   ├── crewRoles.ts          # Crew role definitions
│   │   │   └── nameGenerator.ts      # Random name pools
│   │   └── utils/
│   │       ├── random.ts             # Seeded RNG utilities
│   │       ├── math.ts               # Iso math, grid helpers
│   │       └── format.ts             # Currency, date formatting
│   ├── store/
│   │   ├── gameStore.ts              # Root Zustand store
│   │   ├── slices/
│   │   │   ├── timeSlice.ts          # Day, speed, paused
│   │   │   ├── economySlice.ts       # Balance, transactions
│   │   │   ├── propertySlice.ts      # Owned properties, active property
│   │   │   ├── buildingSlice.ts      # Rooms, grid state, construction
│   │   │   ├── showSlice.ts          # Current show, past shows
│   │   │   ├── castSlice.ts          # Cast members, audition pool
│   │   │   ├── crewSlice.ts          # Hired crew, morale
│   │   │   ├── rehearsalSlice.ts     # Readiness, rehearsal events
│   │   │   ├── marketingSlice.ts     # Buzz, campaigns
│   │   │   ├── performanceSlice.ts   # Run stats, nightly results
│   │   │   ├── eventSlice.ts         # Active events, history
│   │   │   ├── progressionSlice.ts   # Reputation, unlocks, milestones
│   │   │   └── uiSlice.ts           # Active panel, view mode, selections
│   │   └── types.ts                  # Store type definitions
│   ├── ui/
│   │   ├── layouts/
│   │   │   ├── GameLayout.tsx        # Main game screen layout
│   │   │   ├── MainMenu.tsx          # Title screen
│   │   │   └── LoadScreen.tsx        # Save slot picker
│   │   ├── panels/
│   │   │   ├── TopBar.tsx            # Day, money, speed controls
│   │   │   ├── BottomBar.tsx         # Context-sensitive actions
│   │   │   ├── BuildPanel.tsx        # Room placement palette
│   │   │   ├── ShowPanel.tsx         # Show selection/details
│   │   │   ├── CastPanel.tsx         # Audition and cast management
│   │   │   ├── CrewPanel.tsx         # Crew hiring and management
│   │   │   ├── MarketingPanel.tsx    # Marketing options
│   │   │   ├── FinancePanel.tsx      # Income/expense breakdown
│   │   │   └── ReputationPanel.tsx   # Progression and milestones
│   │   ├── modals/
│   │   │   ├── PropertyPickerModal.tsx   # Buy/select property
│   │   │   ├── ShowPickerModal.tsx       # Choose next show
│   │   │   ├── AuditionModal.tsx         # Audition candidates
│   │   │   ├── EventModal.tsx            # Random event popup
│   │   │   ├── RunSummaryModal.tsx       # End-of-run results
│   │   │   ├── SaveModal.tsx             # Save/load game
│   │   │   └── ConfirmModal.tsx          # Generic confirmation
│   │   ├── components/
│   │   │   ├── StatBar.tsx           # Labeled progress bar
│   │   │   ├── MoneyDisplay.tsx      # Formatted currency
│   │   │   ├── Tooltip.tsx           # Hover tooltip
│   │   │   ├── Toast.tsx             # Notification toast
│   │   │   └── StarRating.tsx        # 1-5 star display
│   │   └── hooks/
│   │       ├── useGamePhase.ts       # Current phase helper
│   │       └── useKeyboard.ts        # Keyboard shortcut bindings
│   └── types/
│       ├── index.ts                  # Core game types
│       └── enums.ts                  # Game enumerations
├── docs/
│   └── BROADWAY_TYCOON_GDD.md        # This file
├── CLAUDE.md                         # Dev instructions
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.ts
└── index.html
```

---

## 4. Game Flow & Phases

The game progresses through a repeating cycle of phases. Each phase has a clear entry condition, player actions, and exit condition.

### Phase State Machine

```
MAIN_MENU → PROPERTY_SELECT → BUILD → PRODUCTION → RUN → SUMMARY → (BUILD or PROPERTY_SELECT)
                                 ↑                                        |
                                 └────────────────────────────────────────┘
```

### Phase Details

#### MAIN_MENU
- New Game / Load Game / Settings
- New Game → name your production company → PROPERTY_SELECT

#### PROPERTY_SELECT
- Browse available NYC properties (2-4 listings, scaled to reputation)
- Each listing shows: location, lot size, price, condition, location bonus
- Purchase → deduct cost → PROPERTY_SELECT exits → BUILD
- Player can own multiple properties (unlocked at reputation milestones)

#### BUILD
- Top-down floor plan view of the purchased building
- Place rooms on the grid: stage, seating, lobby, backstage, dressing rooms, box office, etc.
- Rooms cost money and take construction time (days)
- Minimum viable theater: stage + seating + lobby + box office
- Player can return to BUILD between shows to renovate/expand
- "Ready to Produce" button → validates minimum rooms → PRODUCTION

#### PRODUCTION
Sub-phases within production:

1. **SHOW_SELECT** — Pick a show from 3 generated options (or commission one for more money)
2. **AUDITION** — Review candidates for each role, hold auditions, cast the show
3. **CREW_HIRE** — Hire director, stage manager, lighting designer, etc.
4. **REHEARSAL** — Time passes, readiness meter fills. Random rehearsal events occur. Player can adjust rehearsal schedule, fire/replace cast.
5. **MARKETING** — Choose marketing strategy before opening: posters, social media, press previews, etc. Builds buzz score.
6. **OPENING_NIGHT** — Transition to RUN. Special first-night modifiers.

#### RUN
- The show is running. Each game-day = one performance.
- Nightly: attendance calculated, revenue collected, expenses deducted.
- Between nights: adjust ticket prices, respond to events, minor decisions.
- Show runs until: player closes it, attendance drops below threshold for X consecutive nights, or a forced-close event.
- When show closes → SUMMARY

#### SUMMARY
- Show P&L breakdown: total revenue, total costs, profit/loss
- Reputation change based on show quality, run length, reviews
- Unlock notifications
- "Next" → back to BUILD (same property) or PROPERTY_SELECT (buy another)

### Time
- 1 game-day = the base time unit
- Speed controls: Pause (0x), Normal (1x), Fast (2x), Ultra (4x)
- Days advance continuously during BUILD (construction timers), REHEARSAL (readiness), and RUN (performances)
- Days pause during menus, modals, and SHOW_SELECT/AUDITION/CREW_HIRE (turn-based decisions)

---

## 5. Rendering & Camera

### Two View Modes

#### Isometric Exterior View
- Default view when not in BUILD mode
- Shows the Theater District block with the player's building(s)
- Isometric projection: tile width = 64px, tile height = 32px
- Camera can pan (drag or WASD) and zoom (scroll wheel, 0.5x to 2.0x)
- Buildings show exterior condition, marquee signs, foot traffic

#### Top-Down Floor Plan View
- Active during BUILD mode and available as toggle during other phases
- Orthographic grid, 1 cell = 32x32px
- Shows room layout, walls, furniture placement
- Color-coded rooms by type
- Grid lines visible, snap-to-grid placement

### Isometric Math
```
screenX = (gridX - gridY) * (TILE_WIDTH / 2) + cameraOffsetX
screenY = (gridX + gridY) * (TILE_HEIGHT / 2) + cameraOffsetY

// Reverse (screen → grid, for mouse picking):
gridX = Math.floor((screenX / (TILE_WIDTH / 2) + screenY / (TILE_HEIGHT / 2)) / 2)
gridY = Math.floor((screenY / (TILE_HEIGHT / 2) - screenX / (TILE_WIDTH / 2)) / 2)
```

### Camera System
- **Pan:** Click-drag or WASD keys. Bounded to map edges.
- **Zoom:** Scroll wheel. Range: 0.5x to 2.0x. Zoom targets cursor position.
- **View toggle:** V key or UI button switches between iso exterior and floor plan.
- Camera state stored in uiSlice (NOT serialized to save — reset on load).

### Tile System
- Grid dimensions per property (e.g., small lot = 12x8, large lot = 20x14)
- Each cell has: `type` (empty, room, wall, door), `roomId` (if part of a room), `walkable` (for future pathfinding)
- Grid is a flat array indexed by `y * width + x`

---

## 6. Real Estate & Properties

### Available Properties
Properties are the lots/buildings the player can purchase. Each has fixed attributes.

| Property | Size (grid) | Price | Condition | Location Bonus | Max Seats | Unlock |
|----------|------------|-------|-----------|---------------|-----------|--------|
| The Dusty Loft | 12x8 | $250,000 | Poor | None | 150 | Start |
| Midtown Fixer | 14x10 | $500,000 | Fair | +5% attendance | 250 | Start |
| West 44th Classic | 16x12 | $1,200,000 | Good | +10% attendance, +5% ticket price | 400 | Rep 25 |
| Times Square Palace | 20x14 | $3,000,000 | Excellent | +20% attendance, +10% ticket price | 800 | Rep 50 |
| The Broadway Crown | 24x16 | $8,000,000 | Pristine | +30% attendance, +15% ticket price, +prestige | 1200 | Rep 80 |

### Property Attributes
- **Size:** Grid dimensions. Determines how many rooms can fit.
- **Price:** One-time purchase cost.
- **Condition:** Affects initial renovation costs. Poor = need more repairs before building. Pristine = build immediately.
  - Poor: +50% construction costs
  - Fair: +25% construction costs
  - Good: +0% (baseline)
  - Excellent: -10% construction costs
  - Pristine: -20% construction costs
- **Location Bonus:** Permanent modifier to attendance and/or ticket pricing.
- **Max Seats:** Hard cap on seating room capacity at this property.
- **Unlock:** Reputation level required to see this listing.

### Condition Renovation
Before building rooms in a Poor/Fair condition property, the player must spend money on basic renovation:
- Poor → Fair: $50,000, 10 days
- Fair → Good: $75,000, 7 days
- (Good and above: no renovation needed, build immediately)

### Multiple Properties
- Unlocked at Reputation 30
- Player can own up to 3 properties simultaneously
- Switch between properties via a property selector in the UI
- Each property has independent rooms, shows, and cast
- Economy is shared (one bank account)

---

## 7. Building & Rooms

### Grid & Placement Rules
- Rooms are rectangular (minimum 2x2, maximum varies by type)
- Rooms cannot overlap
- Rooms must be adjacent to at least one other room OR an exterior wall
- Doors are auto-placed between adjacent rooms
- Every room must be reachable from the lobby (connectivity check)

### Room Types

| Room | Min Size | Base Cost | Build Time | Required? | Purpose |
|------|----------|-----------|------------|-----------|---------|
| Lobby | 3x3 | $15,000 | 3 days | Yes | Audience entry point. Affects first impressions. |
| Box Office | 2x2 | $8,000 | 2 days | Yes | Ticket sales. Required for any show to run. |
| Seating | 4x4 | $25,000 | 5 days | Yes | Audience seating. Capacity = cells x 10 seats. |
| Stage | 4x3 | $30,000 | 5 days | Yes | Performance area. Size affects show quality cap. |
| Backstage | 3x3 | $20,000 | 4 days | Yes (for shows) | Actor prep. Missing = -15% show quality. |
| Dressing Room | 2x3 | $12,000 | 3 days | No | Actor comfort. Each one adds +3% cast morale. |
| Orchestra Pit | 3x2 | $18,000 | 4 days | No | Live music. +10% quality for musicals. No effect on plays. |
| Rehearsal Hall | 4x4 | $22,000 | 5 days | No | Faster rehearsal (+20% readiness/day). Without one, cast rehearses on stage (slower). |
| VIP Lounge | 3x3 | $35,000 | 4 days | No | Premium ticket tier. +$15/seat for VIP seats. |
| Concession Stand | 2x2 | $10,000 | 2 days | No | Passive income: $2/attendee/night. |
| Storage Room | 2x2 | $5,000 | 1 day | No | Stores sets between shows. Without one, set construction costs +25% each show. |
| Office | 2x2 | $8,000 | 2 days | No | Crew workspace. Required for crew size > 3. |
| Tech Booth | 2x2 | $15,000 | 3 days | No | Lighting/sound control. +5% show quality. |
| Green Room | 3x2 | $12,000 | 3 days | No | Cast break area. +5% cast morale. |
| Restrooms | 2x2 | $6,000 | 2 days | No | Audience comfort. Missing = -10% audience satisfaction. |

### Minimum Viable Theater
To run a show, the player needs at minimum:
- 1 Lobby
- 1 Box Office
- 1 Seating area (any size)
- 1 Stage
- 1 Backstage

### Construction
- Rooms take real game-days to build (time passes)
- During construction, the room is visible but grayed out / scaffolded
- Player can queue multiple rooms
- Construction costs are paid upfront
- Demolishing a room refunds 40% of original cost, takes 1 day

---

## 8. Show System

### Show Generation
When the player enters SHOW_SELECT, 3 shows are procedurally generated. Each show is defined by:

- **Title** (generated from templates: "[Adjective] [Noun]", "The [Noun] of [Place]", etc.)
- **Genre** (Musical, Play, Revival, Experimental)
- **Archetype** (determines stat ranges — see below)
- **Script Quality** (1-100, base value from archetype + random variance)
- **Audience Appeal** (1-100, how mainstream vs niche)
- **Complexity** (1-5, affects rehearsal time and crew requirements)
- **Cast Size** (3-15, number of roles to fill)
- **Ideal Budget** (suggested production budget — sets, costumes, etc.)

### Genres

| Genre | Traits |
|-------|--------|
| Musical | Higher audience appeal, higher costs (orchestra, choreography). Needs Orchestra Pit for quality bonus. |
| Play | Lower costs, relies heavily on cast quality and script. More critic-sensitive. |
| Revival | Known IP — higher base attendance but lower max ceiling. Critics are harsher ("we've seen this before"). |
| Experimental | Low base attendance, high variance. Can be a massive hit or total flop. Critics love or hate it — no middle ground. |

### Archetypes
Archetypes are templates that define the stat ranges for generated shows.

| Archetype | Script Quality Range | Appeal Range | Complexity | Cast Size | Budget Range |
|-----------|---------------------|--------------|------------|-----------|-------------|
| Crowd Pleaser | 40-70 | 70-95 | 1-2 | 5-10 | $50K-$150K |
| Critics' Darling | 70-95 | 30-60 | 3-4 | 4-8 | $80K-$200K |
| Big Spectacle | 50-80 | 60-85 | 4-5 | 8-15 | $150K-$400K |
| Intimate Chamber | 60-85 | 40-65 | 2-3 | 3-5 | $30K-$80K |
| Dark Horse | 20-95 | 20-90 | 1-5 | 3-12 | $40K-$250K |
| Safe Bet | 50-65 | 65-80 | 2-3 | 5-8 | $60K-$120K |

### Commission Option
Instead of picking from 3 generated shows, the player can commission a show:
- Cost: $25,000 (non-refundable)
- Player picks genre
- Generated show has +15 to Script Quality (better writing)
- Takes 5 days to "receive" the script (delays production start)

### Show Quality Formula
Final show quality is calculated when the show opens and updated nightly:

```
baseQuality = scriptQuality * 0.3
            + avgCastSkill * 0.25
            + directorSkill * 0.15
            + rehearsalReadiness * 0.15
            + productionBudgetRatio * 0.10  // actualBudget / idealBudget, capped at 1.2
            + facilityBonus * 0.05          // from rooms like Tech Booth, Orchestra Pit

showQuality = clamp(baseQuality + randomVariance(-5, +5), 0, 100)
```

---

## 9. Run Phase & Idle

### Nightly Performance Loop
Each game-day during RUN, the following sequence executes:

1. **Pre-show checks**
   - Any cast absences? (illness, drama events)
   - Understudies fill if available, otherwise quality penalty

2. **Attendance calculation**
   ```
   maxSeats = totalSeatingCapacity

   baseAttendance = maxSeats * (showQuality / 100) * (buzzScore / 100)
   locationMod = 1.0 + property.locationBonus
   dayOfWeekMod = getDayOfWeekModifier(dayOfWeek)
   // Mon-Thu: 0.7, Fri: 0.9, Sat: 1.0, Sun (matinee): 0.85
   runLengthDecay = max(0.5, 1.0 - (runDay / 200))  // gradual decline over long runs

   attendance = min(maxSeats, floor(baseAttendance * locationMod * dayOfWeekMod * runLengthDecay))
   ```

3. **Revenue**
   ```
   ticketRevenue = attendance * ticketPrice
   vipRevenue = vipSeats * vipTicketPrice  // if VIP Lounge exists
   concessionRevenue = attendance * concessionRate  // if Concession Stand exists

   nightlyRevenue = ticketRevenue + vipRevenue + concessionRevenue
   ```

4. **Expenses (per night)**
   ```
   castSalaries = sum(cast.map(c => c.salary)) / 7  // weekly salary prorated
   crewSalaries = sum(crew.map(c => c.salary)) / 7
   facilityCosts = baseFacilityCost + (numRooms * roomMaintenanceCost)

   nightlyExpenses = castSalaries + crewSalaries + facilityCosts
   ```

5. **Profit/Loss**
   ```
   nightlyProfit = nightlyRevenue - nightlyExpenses
   balance += nightlyProfit
   ```

6. **Post-show**
   - Update run statistics
   - Check for events (critic review, cast drama, etc.)
   - Check closing conditions

### Day-of-Week Schedule
| Day | Modifier | Notes |
|-----|----------|-------|
| Monday | 0.70 | Industry standard dark day; some shows go dark (no performance) |
| Tuesday | 0.75 | Slow start to the week |
| Wednesday | 0.80 | Matinee day (2 shows — afternoon + evening) |
| Thursday | 0.85 | Building toward weekend |
| Friday | 0.90 | Date night |
| Saturday | 1.00 | Peak attendance |
| Sunday | 0.85 | Matinee day (afternoon only) |

**Matinee days (Wed & Sun):** Two performances, each at 70% of the calculated attendance. Total ≈ 1.4x a normal day.

### Closing Conditions
A show closes when any of these triggers:
- **Player choice:** Manual close at any time
- **Low attendance:** Below 30% capacity for 5 consecutive performances
- **Bankruptcy:** Balance hits $0 during a run (forced close, fire sale)
- **Event:** Certain events can force-close a show (scandal, structural damage)
- **Natural end:** After 180 performances (~6 months), the show must close or the player must "extend" ($25,000 extension fee, resets decay for 90 more performances)

### Between Performances
Between nightly shows, the player can:
- Adjust ticket prices (takes effect next performance)
- Replace cast members (costs money, temporary quality dip)
- Launch additional marketing campaigns
- Start planning the next show (does not pause current run)

---

## 10. Audition & Casting

### Candidate Generation
When the player enters AUDITION for a show, candidates are generated per role:

- 3-5 candidates per role
- Each candidate has:
  - **Name** (randomly generated)
  - **Skill** (1-100, weighted by reputation — higher rep = better candidates)
  - **Star Power** (0-50, chance of famous actor appearing increases with rep)
  - **Salary Demand** (weekly, scales with skill: roughly `skill * $50 + starPower * $200`)
  - **Chemistry** (0-100, rolled per-candidate-per-show, represents fit with this specific production)
  - **Reliability** (0-100, affects absence chance during run)
  - **Quirk** (optional trait — "Method Actor" +10 quality/-10 morale, "Diva" +15 star power/-15 reliability, etc.)

### Casting Process
1. Player reviews candidates for each role
2. Selects one candidate per role (or leaves role empty — quality penalty)
3. Offered candidates may decline if salary offer is too low (< 80% of their demand)
4. After all roles cast, confirm cast → proceed to CREW_HIRE

### Star Power
- Stars (starPower > 30) add a flat attendance bonus: `+starPower * 2` seats per night
- Stars attract critic attention (higher chance of being reviewed)
- Stars have higher salary demands and lower reliability (diva risk)

### Chemistry
- Chemistry between cast members affects ensemble quality
- Average cast chemistry modifies show quality by ±10%
- High chemistry (avg > 75): cast morale bonus, fewer drama events
- Low chemistry (avg < 30): more drama events, higher quit risk

### Understudies (post-MVP)
- For MVP: absent actor = quality penalty
- Post-MVP: hire understudies as backup. Cheaper salary, deploy automatically.

---

## 11. Economy

### Starting Conditions
- **Starting cash:** $500,000
- **No loans available initially** (unlock at Reputation 15)
- Player must budget for: property + renovation + rooms + first show production

### Income Sources
| Source | Frequency | Amount |
|--------|-----------|--------|
| Ticket sales | Per performance | attendance x ticketPrice |
| VIP tickets | Per performance | vipSeats x vipTicketPrice |
| Concessions | Per performance | attendance x $2 (if Concession Stand built) |
| Merchandise | Per performance | attendance x $1 (if Gift Shop built, post-MVP) |

### Expense Categories
| Category | Frequency | Amount |
|----------|-----------|--------|
| Property purchase | One-time | $250K - $8M |
| Renovation | One-time | $50K - $75K (if needed) |
| Room construction | One-time | $5K - $35K per room |
| Production budget | Per show | $30K - $400K (sets, costumes, props) |
| Commission fee | Per show (optional) | $25,000 |
| Cast salaries | Weekly | Varies ($500-$5,000/week per actor) |
| Crew salaries | Weekly | Varies ($400-$3,000/week per crew member) |
| Facility maintenance | Daily | $100 + $25 per room |
| Marketing | Per campaign | $5K - $50K |
| Show extension | Per extension | $25,000 |
| Room demolition | One-time | Free (refunds 40% of build cost) |

### Ticket Pricing
- **Base ticket price:** $45
- **Player adjustable range:** $20 - $150
- **Price sensitivity:**
  ```
  priceFactor = 1.0 - ((ticketPrice - 45) / 45) * 0.5
  // At $45: factor = 1.0 (no effect)
  // At $90: factor = 0.5 (half attendance)
  // At $20: factor = 1.28 (28% more attendance)
  ```
- Higher prices = fewer people but more revenue per ticket. Find the sweet spot.
- VIP tickets: base $75, adjustable $50-$250

### Loans
- Unlock at Reputation 15
- Available loans:
  | Loan | Amount | Interest | Term |
  |------|--------|----------|------|
  | Small | $100,000 | 8% | 90 days |
  | Medium | $300,000 | 10% | 180 days |
  | Large | $750,000 | 12% | 360 days |
- Interest is simple (not compound): total repayment = principal + (principal * rate)
- Daily payment = total repayment / term
- Max 2 active loans at once
- Defaulting on a loan = -20 reputation, can't take new loans for 90 days

### Bankruptcy
- Balance at $0 with active show → forced close, sell rooms at 40% value
- Balance at $0 with no show and no rooms to sell → game over
- Negative balance persists for 30 days before game over (time to recover via loan or property sale)
- Selling a property: 60% of purchase price, takes 7 days to finalize

---

## 12. Progression

### Reputation
- Central progression metric. Range: 0-100.
- Affects: property unlocks, candidate quality, loan access, show options, event frequency.

### Reputation Sources
| Action | Rep Change |
|--------|-----------|
| Show runs 30+ performances | +3 |
| Show runs 90+ performances | +5 |
| Show runs 180 performances | +8 |
| Show quality > 80 | +2 per show |
| Show quality > 90 | +5 per show |
| Positive critic review | +2 |
| Glowing critic review | +5 |
| Negative critic review | -2 |
| Devastating critic review | -5 |
| Show closes under 10 performances | -3 |
| Bankruptcy event | -20 |
| Loan default | -10 |
| Win award | +10 |
| Nominated for award | +5 |
| Close show with 90%+ avg attendance | +3 |

### Milestones
Milestones are permanent achievements. They unlock bonuses and serve as progression markers.

| Milestone | Condition | Reward |
|-----------|-----------|--------|
| First Curtain Call | Complete your first show run | Tutorial tips disabled |
| Packed House | Achieve 100% attendance for a single night | Unlock Gold Ticket pricing option (+10% max price) |
| Critics' Choice | Get a "Glowing" review | +5 permanent buzz to all future shows |
| Marathon Run | Run a show for 90+ performances | Unlock Show Extension option |
| Real Estate Mogul | Own 2 properties simultaneously | -10% all construction costs |
| Tony Nominee | Reach Reputation 50 | Access to "Award Season" events |
| Broadway Legend | Reach Reputation 80 | Unlock The Broadway Crown property |
| Theater Empire | Own 3 properties with active shows | Prestige ending |

### Unlocks by Reputation

| Rep Level | Unlock |
|-----------|--------|
| 0 | Basic properties, 6 show archetypes, basic marketing |
| 10 | Dressing Room, Green Room, Restrooms (room types) |
| 15 | Loans available |
| 20 | VIP Lounge room type, VIP ticket pricing |
| 25 | West 44th Classic property, "Critics' Preview" marketing option |
| 30 | Multiple property ownership |
| 35 | Commission show option |
| 40 | Tech Booth room type, advanced marketing options |
| 50 | Times Square Palace property, Award Season events, "Prestige" show modifiers |
| 60 | Celebrity casting pool (star power 40+) |
| 80 | The Broadway Crown property |
| 100 | "Legend" status — all costs -10%, all buzz +10%, credits roll |

---

## 13. Event System

### How Events Work
- Events are checked each game-day during RUN phase
- Each event has a trigger chance (daily probability)
- Events present the player with a choice (usually 2-3 options)
- Choices have consequences (immediate and/or delayed)
- Some events are one-time, others can repeat

### Event Categories

#### Critic Events
| Event | Chance | Description |
|-------|--------|-------------|
| Critic Visit | 5%/day during first 14 days | A critic attends tonight. Review published next day. |
| Second Critic | 2%/day after day 30 | Another critic revisits. Can upgrade or downgrade review. |

**Critic Review Calculation:**
```
reviewScore = showQuality + random(-15, +15)
// < 30: Devastating (-5 rep, -20% buzz)
// 30-50: Negative (-2 rep, -10% buzz)
// 50-70: Mixed (no rep change, ±0 buzz)
// 70-85: Positive (+2 rep, +10% buzz)
// > 85: Glowing (+5 rep, +25% buzz)
```

#### Cast Drama Events
| Event | Chance | Options |
|-------|--------|---------|
| Actor Feud | 3%/day (higher if chemistry < 30) | Mediate ($5K counseling), Take sides (one actor leaves, other gets +10 morale), Ignore (both get -20 morale) |
| Star Demands | 4%/day (if star power > 30) | Give raise (+30% salary), Refuse (50% chance they walk), Compromise (+15% salary, -5 morale) |
| Actor Illness | 2%/day per actor (lower if reliability > 70) | Rest (miss 1-3 shows, quality penalty), Push through (-10 quality, -15 morale, 20% chance of longer illness) |
| Method Actor | Once per show (if quirk) | Embrace it (+5 quality, -10 crew morale), Rein them in (-5 quality, +5 crew morale) |

#### Facility Events
| Event | Chance | Options |
|-------|--------|---------|
| Plumbing Issue | 2%/day | Quick fix ($3K, 1 day, 20% chance it breaks again), Full repair ($10K, 3 days, permanent) |
| Power Outage | 1%/day | Cancel tonight ($0, -5 buzz), Candlelit show (+10 buzz if quality > 70, -15 buzz if quality < 50) |
| Roof Leak | 1%/day (Poor/Fair condition only) | Patch ($2K, temporary), Full roof ($15K, 5 days, prevents future leaks) |

#### Audience Events
| Event | Chance | Options |
|-------|--------|---------|
| Standing Ovation | 3%/night (if quality > 80) | No choice — +5 buzz, +2 cast morale |
| Walkouts | 3%/night (if quality < 40) | No choice — -5 buzz, -3 cast morale |
| Celebrity Sighting | 2%/night (rep > 40) | Acknowledge publicly (+10 buzz, may seem desperate), Play it cool (+3 buzz, +5 rep) |
| Protest Outside | 1%/run (Experimental genre only) | Engage protesters (-10 buzz, +5 rep "brave"), Ignore (+0), Use as marketing (+15 buzz, -3 rep "exploitative") |

#### Financial Events
| Event | Chance | Options |
|-------|--------|---------|
| Corporate Sponsorship | 3%/month | Accept ($50K cash, sponsor logo in lobby — -5 artistic rep), Decline (keep artistic cred) |
| Tax Audit | 1%/month | Pay fine ($10K) — no negotiation |
| Investor Interest | 2%/month (rep > 30) | Accept ($100K for 10% of next show revenue), Decline |

---

## 14. Room Details & Upgrades

Each room can be upgraded to improve its effects. Upgrades have 3 tiers.

### Lobby

| Tier | Cost | Build Time | Effect |
|------|------|------------|--------|
| Basic | (included) | — | Functional entry. No bonus. |
| Decorated | $12,000 | 2 days | +5% audience satisfaction. Chandelier and carpet. |
| Grand | $30,000 | 4 days | +10% audience satisfaction, +3% ticket price tolerance. Marble floors, art deco fixtures. |

### Seating

| Tier | Cost | Build Time | Effect |
|------|------|------------|--------|
| Folding Chairs | (included) | — | Base capacity. -5% satisfaction. |
| Cushioned Seats | $15,000 | 3 days | Base capacity. +0% satisfaction. |
| Premium Theater Seats | $35,000 | 5 days | -10% capacity (wider seats), +15% satisfaction, +5% ticket price tolerance. |

### Stage

| Tier | Cost | Build Time | Effect |
|------|------|------------|--------|
| Bare Stage | (included) | — | Functional. Quality cap: 70. |
| Equipped Stage | $20,000 | 4 days | Fly system, basic lighting rig. Quality cap: 85. |
| Full Production Stage | $50,000 | 7 days | Turntable, trap doors, advanced rigging. Quality cap: 100. |

### Backstage

| Tier | Cost | Build Time | Effect |
|------|------|------------|--------|
| Basic | (included) | — | Functional. |
| Organized | $10,000 | 2 days | +5% show quality (faster scene changes). |
| Professional | $25,000 | 4 days | +10% show quality, -10% production budget needed. |

### Box Office

| Tier | Cost | Build Time | Effect |
|------|------|------------|--------|
| Window | (included) | — | Functional. |
| Counter | $8,000 | 2 days | +5% ticket sales efficiency (fewer walkaway customers). |
| Digital + Counter | $20,000 | 3 days | +10% ticket sales efficiency, online pre-sales (+5% attendance). |

### All Other Rooms
Non-essential rooms have a single upgrade tier:

| Room | Upgrade Cost | Build Time | Enhanced Effect |
|------|-------------|------------|-----------------|
| Dressing Room | $10,000 | 2 days | +6% cast morale (up from +3%) |
| Orchestra Pit | $15,000 | 3 days | +15% musical quality (up from +10%) |
| Rehearsal Hall | $18,000 | 3 days | +35% readiness/day (up from +20%) |
| VIP Lounge | $25,000 | 3 days | +$25/seat VIP (up from +$15) |
| Concession Stand | $8,000 | 2 days | $3.50/attendee (up from $2) |
| Storage Room | $5,000 | 1 day | Set costs -15% (up from -0%, base just prevents +25%) |
| Office | $8,000 | 2 days | Max crew size +2 |
| Tech Booth | $12,000 | 2 days | +10% show quality (up from +5%) |
| Green Room | $8,000 | 2 days | +10% cast morale (up from +5%) |
| Restrooms | $5,000 | 1 day | +5% audience satisfaction (up from preventing -10%) |

---

## 15. Crew & Staff

### Crew Roles
Crew members are hired during the CREW_HIRE phase. Each role has specific effects.

| Role | Base Salary (weekly) | Effect | Required? |
|------|---------------------|--------|-----------|
| Director | $1,500 | directorsSkill feeds into quality formula. THE key hire. | Yes |
| Stage Manager | $800 | Reduces event severity by 20%. Manages rehearsal schedule. | Yes (for shows with complexity > 2) |
| Lighting Designer | $700 | +5% show quality | No |
| Sound Designer | $700 | +5% show quality | No |
| Costume Designer | $600 | +3% show quality, +5% audience satisfaction | No |
| Set Designer | $800 | Reduces production budget needed by 15% | No |
| Choreographer | $900 | Required for Musicals. +10% quality for musicals, +3% for plays. | Musicals only |
| Music Director | $1,000 | Required for Musicals. +8% quality for musicals. | Musicals only |
| Publicist | $600 | +15% buzz effectiveness, unlocks press events | No |
| House Manager | $500 | +5% ticket sales efficiency, reduces audience event severity | No |

### Crew Stats
Each crew member has:
- **Skill** (1-100): affects their contribution to show quality / their role's effect
- **Salary** (weekly): scales with skill — roughly `baseWeeklySalary * (0.5 + skill/100)`
- **Morale** (0-100): starts at 70. Affects work quality. Below 30 = risk of quitting.
- **Experience** (0-100): increases over time. +1 per show they work on. Higher exp = more skill growth.

### Crew Limits
- Without an Office: max 3 crew members
- With basic Office: max 5
- With upgraded Office: max 7
- Absolute maximum: 10 (hard cap)

### Firing / Replacing Crew
- Can fire at any time — 1 week severance pay
- Mid-show replacement: new crew member joins at -20% effectiveness for 7 days (adjustment period)
- Between shows: no penalty

### Crew Morale
Morale changes:
| Trigger | Change |
|---------|--------|
| Show opens | +5 |
| Show is a hit (quality > 80) | +10 |
| Show flops (quality < 40) | -10 |
| Paid on time | +0 (expected) |
| Payday missed (balance < 0) | -15 per missed week |
| Green Room exists | +5 (one-time on hire) |
| Cast drama (not resolved) | -5 |
| Raise given | +10 |

---

## 16. Art & Assets

### MVP Art Strategy
All art for MVP uses colored rectangles and simple geometric shapes. No pixel art or sprites needed for v1.

#### Exterior (Isometric) View — MVP
- Buildings: colored rectangular blocks with depth (pseudo-3D boxes)
- Marquee: text label rendered on building face
- Street: gray tiles
- Empty lots: brown/tan tiles with "FOR SALE" text

#### Floor Plan View — MVP
- Rooms: colored rectangles with room-type label
  - Lobby: warm gold (#D4A574)
  - Box Office: steel blue (#5B7C99)
  - Seating: rich red (#8B2252)
  - Stage: deep purple (#6B3FA0)
  - Backstage: charcoal (#404040)
  - Dressing Room: soft pink (#D4849F)
  - Orchestra Pit: amber (#C49000)
  - Rehearsal Hall: forest green (#2D6B4A)
  - VIP Lounge: gold (#B8860B)
  - Concession: orange (#CC6600)
  - Storage: gray (#808080)
  - Office: navy (#2C3E6B)
  - Tech Booth: electric blue (#0066CC)
  - Green Room: sage (#87A878)
  - Restrooms: light blue (#87CEEB)
- Walls: dark gray lines (2px)
- Doors: gap in wall with lighter color
- Grid lines: light gray, 1px, dotted
- Construction in progress: diagonal stripe pattern overlay
- Selected room: yellow border glow

#### Characters — MVP
- No character sprites
- Actors/crew represented by stat cards in UI panels
- Portraits: colored circle with initials (like avatar placeholders)

#### UI Color Palette
- **Primary background:** #1A1A2E (deep navy)
- **Secondary background:** #16213E (darker navy)
- **Accent:** #E94560 (theater red)
- **Accent secondary:** #D4A574 (warm gold)
- **Text primary:** #EEEEEE
- **Text secondary:** #A0A0B0
- **Success:** #4CAF50
- **Warning:** #FF9800
- **Danger:** #F44336
- **Money:** #4CAF50 (green for positive), #F44336 (red for negative)

#### Typography
- **Headings:** serif font (Playfair Display or similar — Broadway theater feel)
- **Body/UI:** clean sans-serif (Inter)
- **Numbers/money:** monospace (JetBrains Mono or similar)

### Post-MVP Art Goals
- Isometric pixel art buildings (multiple visual states per condition level)
- Room furniture sprites
- Character portraits (procedurally generated from parts — hair, eyes, outfit)
- Animated marquee lights
- Audience silhouettes in seating view
- Weather effects on exterior view

---

## 17. Save System

### Serialization
The entire Zustand store is the save state. It must be JSON-serializable at all times.

### Save Structure
```typescript
interface SaveData {
  version: number;          // Schema version for migration
  timestamp: number;        // Unix timestamp of save
  slotName: string;         // Player-assigned name
  companyName: string;      // Production company name
  gameState: GameState;     // The full Zustand store state
}
```

### Save Slots
- 3 manual save slots
- 1 auto-save slot (overwrites every 5 game-minutes of real time)
- Save slot picker on load screen shows: slot name, company name, day count, balance, reputation

### localStorage Keys
```
broadway_tycoon_save_1
broadway_tycoon_save_2
broadway_tycoon_save_3
broadway_tycoon_auto_save
broadway_tycoon_settings  // separate from game saves
```

### Version Migration
- Save data includes a `version` number
- On load, if version < current, run migration functions sequentially
- Migration functions are in `src/game/utils/migrations.ts`
- Never delete old migration functions — they stack

### Settings (separate from saves)
```typescript
interface GameSettings {
  musicVolume: number;      // 0-100
  sfxVolume: number;        // 0-100
  autoSaveEnabled: boolean;
  showTooltips: boolean;
  gameSpeed: number;        // default speed on load
}
```

---

## 18. MVP Scope

### In MVP (v1.0)
- Full game loop: Menu → Property → Build → Produce → Run → Summary → Repeat
- 2 purchasable properties (The Dusty Loft, Midtown Fixer)
- All 15 room types (single tier — no upgrades)
- 4 genres, 6 archetypes for show generation
- Basic audition system (3 candidates per role, no quirks)
- Basic crew hiring (Director, Stage Manager, Lighting Designer, Sound Designer — 4 roles)
- Time system with 3 speeds + pause
- Ticket pricing
- Basic marketing (2 options: Posters $5K, Social Media $10K)
- Nightly performance loop with attendance and revenue
- 5 events (Critic Visit, Actor Illness, Plumbing Issue, Standing Ovation, Walkouts)
- Reputation system (simplified — no milestones/unlocks beyond property access)
- Save system (3 slots + auto-save)
- Top-down floor plan view only (no isometric)
- Colored rectangle art (no sprites)

### Deferred to v1.1+
- Room upgrades (all 3 tiers)
- Remaining crew roles (Choreographer, Music Director, Publicist, etc.)
- Full event roster
- Milestone system with unlocks
- Commission show option
- Loan system
- Multiple property ownership
- Show extension mechanic
- Quirks on actors
- Chemistry system
- Matinee performances
- Star power system

### Deferred to v2.0+
- Isometric exterior view
- Pixel art assets
- Sound effects and music
- Character portraits
- VIP Lounge / VIP tickets
- Concession Stand
- Understudies
- Award Season events (Tony nominations)
- Firebase cloud saves
- Leaderboards
- Tutorial / guided first playthrough

---

## Appendix A — Type Definitions

```typescript
// === Enums ===

enum GamePhase {
  MAIN_MENU = 'MAIN_MENU',
  PROPERTY_SELECT = 'PROPERTY_SELECT',
  BUILD = 'BUILD',
  SHOW_SELECT = 'SHOW_SELECT',
  AUDITION = 'AUDITION',
  CREW_HIRE = 'CREW_HIRE',
  REHEARSAL = 'REHEARSAL',
  MARKETING = 'MARKETING',
  RUN = 'RUN',
  SUMMARY = 'SUMMARY',
}

enum RoomType {
  LOBBY = 'LOBBY',
  BOX_OFFICE = 'BOX_OFFICE',
  SEATING = 'SEATING',
  STAGE = 'STAGE',
  BACKSTAGE = 'BACKSTAGE',
  DRESSING_ROOM = 'DRESSING_ROOM',
  ORCHESTRA_PIT = 'ORCHESTRA_PIT',
  REHEARSAL_HALL = 'REHEARSAL_HALL',
  VIP_LOUNGE = 'VIP_LOUNGE',
  CONCESSION = 'CONCESSION',
  STORAGE = 'STORAGE',
  OFFICE = 'OFFICE',
  TECH_BOOTH = 'TECH_BOOTH',
  GREEN_ROOM = 'GREEN_ROOM',
  RESTROOMS = 'RESTROOMS',
}

enum ShowGenre {
  MUSICAL = 'MUSICAL',
  PLAY = 'PLAY',
  REVIVAL = 'REVIVAL',
  EXPERIMENTAL = 'EXPERIMENTAL',
}

enum ShowArchetype {
  CROWD_PLEASER = 'CROWD_PLEASER',
  CRITICS_DARLING = 'CRITICS_DARLING',
  BIG_SPECTACLE = 'BIG_SPECTACLE',
  INTIMATE_CHAMBER = 'INTIMATE_CHAMBER',
  DARK_HORSE = 'DARK_HORSE',
  SAFE_BET = 'SAFE_BET',
}

enum PropertyCondition {
  POOR = 'POOR',
  FAIR = 'FAIR',
  GOOD = 'GOOD',
  EXCELLENT = 'EXCELLENT',
  PRISTINE = 'PRISTINE',
}

enum CrewRole {
  DIRECTOR = 'DIRECTOR',
  STAGE_MANAGER = 'STAGE_MANAGER',
  LIGHTING_DESIGNER = 'LIGHTING_DESIGNER',
  SOUND_DESIGNER = 'SOUND_DESIGNER',
  COSTUME_DESIGNER = 'COSTUME_DESIGNER',
  SET_DESIGNER = 'SET_DESIGNER',
  CHOREOGRAPHER = 'CHOREOGRAPHER',
  MUSIC_DIRECTOR = 'MUSIC_DIRECTOR',
  PUBLICIST = 'PUBLICIST',
  HOUSE_MANAGER = 'HOUSE_MANAGER',
}

enum GameSpeed {
  PAUSED = 0,
  NORMAL = 1,
  FAST = 2,
  ULTRA = 4,
}

// === Core Types ===

interface Property {
  id: string;
  name: string;
  gridWidth: number;
  gridHeight: number;
  price: number;
  condition: PropertyCondition;
  locationBonus: {
    attendance: number;   // multiplier (0.0 to 0.3)
    ticketPrice: number;  // multiplier (0.0 to 0.15)
  };
  maxSeats: number;
  requiredReputation: number;
}

interface GridCell {
  x: number;
  y: number;
  roomId: string | null;
  type: 'empty' | 'room' | 'wall' | 'door';
  walkable: boolean;
}

interface Room {
  id: string;
  type: RoomType;
  x: number;           // grid position (top-left corner)
  y: number;
  width: number;       // in grid cells
  height: number;
  upgradeTier: number; // 0 = base, 1-3 = upgrade levels
  constructionDaysLeft: number; // 0 = complete
  propertyId: string;
}

interface Show {
  id: string;
  title: string;
  genre: ShowGenre;
  archetype: ShowArchetype;
  scriptQuality: number;    // 1-100
  audienceAppeal: number;   // 1-100
  complexity: number;       // 1-5
  castSize: number;         // number of roles
  idealBudget: number;      // suggested production spend
  actualBudget: number;     // what player spent
  quality: number;          // calculated after casting/rehearsal
  status: 'available' | 'in_production' | 'running' | 'closed';
}

interface CastMember {
  id: string;
  name: string;
  skill: number;           // 1-100
  starPower: number;       // 0-50
  salary: number;          // weekly
  chemistry: number;       // 0-100 (per-show)
  reliability: number;     // 0-100
  morale: number;          // 0-100
  quirk: string | null;
  roleIndex: number;       // which role they fill
  showId: string;
}

interface CrewMember {
  id: string;
  name: string;
  role: CrewRole;
  skill: number;           // 1-100
  salary: number;          // weekly
  morale: number;          // 0-100
  experience: number;      // 0-100
}

interface GameEvent {
  id: string;
  templateId: string;      // references event definition
  title: string;
  description: string;
  options: EventOption[];
  resolved: boolean;
  dayOccurred: number;
}

interface EventOption {
  label: string;
  description: string;
  effects: EventEffect[];
}

interface EventEffect {
  type: 'money' | 'reputation' | 'buzz' | 'morale_cast' | 'morale_crew' | 'quality' | 'attendance';
  value: number;
  duration?: number;  // days, if temporary
}

interface RunStats {
  showId: string;
  totalPerformances: number;
  totalRevenue: number;
  totalExpenses: number;
  totalProfit: number;
  avgAttendance: number;
  peakAttendance: number;
  criticReviews: CriticReview[];
}

interface CriticReview {
  score: number;
  tier: 'devastating' | 'negative' | 'mixed' | 'positive' | 'glowing';
  dayPublished: number;
}

interface Loan {
  id: string;
  principal: number;
  totalRepayment: number;
  dailyPayment: number;
  daysRemaining: number;
}

interface Transaction {
  day: number;
  amount: number;          // positive = income, negative = expense
  category: string;
  description: string;
}

// === Store State ===

interface GameState {
  // Meta
  companyName: string;
  phase: GamePhase;

  // Time
  day: number;
  speed: GameSpeed;
  paused: boolean;

  // Economy
  balance: number;
  transactions: Transaction[];  // last 90 days
  loans: Loan[];

  // Properties
  properties: Property[];
  ownedPropertyIds: string[];
  activePropertyId: string | null;

  // Building
  grids: Record<string, GridCell[]>;  // propertyId → grid
  rooms: Room[];

  // Show
  availableShows: Show[];
  currentShow: Show | null;
  pastShows: Show[];

  // Cast
  auditionPool: CastMember[];
  cast: CastMember[];

  // Crew
  crew: CrewMember[];

  // Production
  rehearsalReadiness: number;     // 0-100
  buzzScore: number;              // 0-100

  // Run
  runDay: number;
  runStats: RunStats | null;

  // Events
  activeEvents: GameEvent[];
  eventHistory: string[];         // template IDs of past events

  // Progression
  reputation: number;             // 0-100
  milestones: string[];           // achieved milestone IDs

  // UI (not saved)
  selectedRoomId: string | null;
  viewMode: 'isometric' | 'floorplan';
  activePanel: string | null;
}
```

---

## Appendix B — Balance Constants

All values below go into `src/game/data/constants.ts`. These are the knobs for tuning the game feel.

```typescript
export const BALANCE = {
  // === Economy ===
  STARTING_CASH: 500_000,
  BASE_TICKET_PRICE: 45,
  MIN_TICKET_PRICE: 20,
  MAX_TICKET_PRICE: 150,
  VIP_BASE_PRICE: 75,
  VIP_MIN_PRICE: 50,
  VIP_MAX_PRICE: 250,
  CONCESSION_PER_ATTENDEE: 2.00,
  CONCESSION_UPGRADED: 3.50,
  FACILITY_DAILY_BASE: 100,
  FACILITY_DAILY_PER_ROOM: 25,
  ROOM_DEMOLISH_REFUND: 0.40,       // 40% of original cost
  PROPERTY_SELL_RATIO: 0.60,         // 60% of purchase price
  PROPERTY_SELL_DAYS: 7,
  SHOW_COMMISSION_COST: 25_000,
  SHOW_COMMISSION_QUALITY_BONUS: 15,
  SHOW_COMMISSION_DELAY_DAYS: 5,
  SHOW_EXTENSION_COST: 25_000,
  SHOW_EXTENSION_PERFORMANCES: 90,

  // === Time ===
  SPEEDS: { PAUSED: 0, NORMAL: 1, FAST: 2, ULTRA: 4 },
  AUTO_SAVE_INTERVAL_MS: 300_000,    // 5 real minutes

  // === Attendance ===
  DAY_OF_WEEK_MODIFIERS: {
    MONDAY: 0.70,
    TUESDAY: 0.75,
    WEDNESDAY: 0.80,
    THURSDAY: 0.85,
    FRIDAY: 0.90,
    SATURDAY: 1.00,
    SUNDAY: 0.85,
  },
  MATINEE_DAYS: ['WEDNESDAY', 'SUNDAY'],
  MATINEE_ATTENDANCE_RATIO: 0.70,    // each show at 70%
  RUN_LENGTH_DECAY_RATE: 1 / 200,    // attendance decays over 200 days
  RUN_LENGTH_DECAY_FLOOR: 0.50,      // never below 50% from decay alone
  PRICE_SENSITIVITY_FACTOR: 0.5,     // how much price affects attendance
  LOW_ATTENDANCE_THRESHOLD: 0.30,    // 30% capacity
  LOW_ATTENDANCE_CLOSE_DAYS: 5,      // consecutive days before forced close
  MAX_RUN_PERFORMANCES: 180,

  // === Show Quality ===
  QUALITY_WEIGHTS: {
    SCRIPT: 0.30,
    CAST: 0.25,
    DIRECTOR: 0.15,
    REHEARSAL: 0.15,
    BUDGET: 0.10,
    FACILITY: 0.05,
  },
  QUALITY_VARIANCE: 5,              // random ±5 per night

  // === Casting ===
  CANDIDATES_PER_ROLE: { MIN: 3, MAX: 5 },
  SALARY_SKILL_MULTIPLIER: 50,      // skill * $50
  SALARY_STAR_MULTIPLIER: 200,      // starPower * $200
  SALARY_ACCEPT_THRESHOLD: 0.80,    // offer must be >= 80% of demand
  STAR_ATTENDANCE_BONUS: 2,         // +2 seats per star power point per night

  // === Crew ===
  MAX_CREW_NO_OFFICE: 3,
  MAX_CREW_BASIC_OFFICE: 5,
  MAX_CREW_UPGRADED_OFFICE: 7,
  MAX_CREW_HARD_CAP: 10,
  CREW_FIRE_SEVERANCE_WEEKS: 1,
  CREW_REPLACEMENT_PENALTY_DAYS: 7,
  CREW_REPLACEMENT_EFFECTIVENESS: 0.80,

  // === Rehearsal ===
  BASE_READINESS_PER_DAY: 3,        // without rehearsal hall
  REHEARSAL_HALL_BONUS: 0.20,        // +20% (so 3.6/day)
  REHEARSAL_HALL_UPGRADED_BONUS: 0.35,
  MIN_READINESS_TO_OPEN: 60,        // can open at 60%, but quality suffers

  // === Marketing ===
  MARKETING_OPTIONS: {
    POSTERS: { cost: 5_000, buzzGain: 10 },
    SOCIAL_MEDIA: { cost: 10_000, buzzGain: 20 },
    PRESS_PREVIEW: { cost: 20_000, buzzGain: 35 },
    RADIO_ADS: { cost: 15_000, buzzGain: 25 },
    BILLBOARD: { cost: 30_000, buzzGain: 40 },
    TV_SPOT: { cost: 50_000, buzzGain: 55 },
  },
  BUZZ_DECAY_PER_DAY: 0.5,          // buzz naturally decreases

  // === Reputation ===
  REP_SHOW_30_PERF: 3,
  REP_SHOW_90_PERF: 5,
  REP_SHOW_180_PERF: 8,
  REP_QUALITY_80: 2,
  REP_QUALITY_90: 5,
  REP_CRITIC_POSITIVE: 2,
  REP_CRITIC_GLOWING: 5,
  REP_CRITIC_NEGATIVE: -2,
  REP_CRITIC_DEVASTATING: -5,
  REP_SHOW_FLOP: -3,               // <10 performances
  REP_BANKRUPTCY: -20,
  REP_LOAN_DEFAULT: -10,
  REP_AWARD_WIN: 10,
  REP_AWARD_NOM: 5,
  REP_FULL_HOUSE: 3,               // 90%+ avg attendance for a run

  // === Loans ===
  LOANS: {
    SMALL: { amount: 100_000, rate: 0.08, termDays: 90 },
    MEDIUM: { amount: 300_000, rate: 0.10, termDays: 180 },
    LARGE: { amount: 750_000, rate: 0.12, termDays: 360 },
  },
  MAX_ACTIVE_LOANS: 2,
  LOAN_DEFAULT_PENALTY_DAYS: 90,

  // === Events ===
  EVENT_CHANCES: {
    CRITIC_VISIT: 0.05,
    SECOND_CRITIC: 0.02,
    ACTOR_FEUD: 0.03,
    STAR_DEMANDS: 0.04,
    ACTOR_ILLNESS: 0.02,
    PLUMBING_ISSUE: 0.02,
    POWER_OUTAGE: 0.01,
    ROOF_LEAK: 0.01,
    STANDING_OVATION: 0.03,
    WALKOUTS: 0.03,
    CELEBRITY_SIGHTING: 0.02,
    PROTEST: 0.01,
    CORPORATE_SPONSOR: 0.001,       // ~3%/month (0.1%/day * 30)
    TAX_AUDIT: 0.00033,
    INVESTOR_INTEREST: 0.00066,
  },
  CRITIC_THRESHOLDS: {
    DEVASTATING: 30,
    NEGATIVE: 50,
    MIXED: 70,
    POSITIVE: 85,
    // above 85 = GLOWING
  },

  // === Bankruptcy ===
  BANKRUPTCY_GRACE_DAYS: 30,

  // === Construction ===
  CONDITION_COST_MODIFIERS: {
    POOR: 1.50,
    FAIR: 1.25,
    GOOD: 1.00,
    EXCELLENT: 0.90,
    PRISTINE: 0.80,
  },
  RENOVATION_COSTS: {
    POOR_TO_FAIR: { cost: 50_000, days: 10 },
    FAIR_TO_GOOD: { cost: 75_000, days: 7 },
  },

  // === Room Effects ===
  BACKSTAGE_MISSING_PENALTY: 0.15,  // -15% quality
  RESTROOM_MISSING_PENALTY: 0.10,   // -10% satisfaction
  STAGE_QUALITY_CAPS: { BARE: 70, EQUIPPED: 85, FULL: 100 },
  SEATS_PER_CELL: 10,

  // === Morale ===
  MORALE_SHOW_OPEN: 5,
  MORALE_HIT_SHOW: 10,
  MORALE_FLOP: -10,
  MORALE_MISSED_PAY: -15,
  MORALE_RAISE: 10,
  MORALE_QUIT_THRESHOLD: 30,
} as const;
```

---

*End of Game Design Document — Broadway Tycoon v1.0*
