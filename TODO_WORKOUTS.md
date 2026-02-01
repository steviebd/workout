# Powerlifting Programs Implementation Plan

## Overview

Add popular powerlifting programs as preset templates that users can import. Each program requires 1RM input upfront, generates workouts based on the program logic, and tracks progress through the program cycle. After completing a program, users test their new 1RM and can start a new program with updated numbers.

## Core Principles

1. **Simple** - Easy to use, minimal complexity
2. **Modifiable** - Users can edit program templates after import
3. **1RM Focused** - Programs use 1RM to calculate all weights
4. **Cycle-Based** - Programs have defined lengths, end with 1RM testing

---

## Programs to Implement

### Phase 1: First 3 Programs (Priority)

#### 1. StrongLifts 5×5
- **Difficulty**: Beginner
- **Duration**: 8-12 weeks (until stall)
- **Frequency**: 3 days/week
- **Pattern**: A/B alternation
  - Day A: Squat 5×5, Bench 5×5, Row 5×5
  - Day B: Squat 5×5, OHP 5×5, Deadlift 1×5
- **Progression**: Add 2.5kg/5lbs each session
- **1RM Input**: Required for all 4 lifts
- **Notes**: Simplest program, linear progression until failure

#### 2. 5/3/1 (Wendler - Original)
- **Difficulty**: Intermediate
- **Duration**: 4 weeks per cycle (typically 3-4 cycles = 12-16 weeks)
- **Frequency**: 4 days/week
- **Pattern**:
  - Day 1: Squat (5/3/1+)
  - Day 2: Bench (5/3/1+)
  - Day 3: Deadlift (5/3/1+)
  - Day 4: OHP (5/3/1+)
- **Progression**: Wave periodization, 4-week cycles
- **1RM Input**: Required for all 4 lifts (uses Training Max = 90% of 1RM)
- **Notes**: Most popular strength program, very customizable

#### 3. Madcow 5×5
- **Difficulty**: Intermediate
- **Duration**: 8 weeks per cycle
- **Frequency**: 3 days/week
- **Pattern**: Heavy/Light/Medium weeks
  - Week 1: Heavy (102.5% of base)
  - Week 2: Light (97.5% of base)
  - Week 3: Medium (100% of base)
  - Week 4: Heavy (105% of base)
  - Week 5: Light (100% of base)
  - Week 6: Medium (102.5% of base)
  - Week 7: Heavy (107.5% of base)
  - Week 8: Light (105% of base) + Deload
- **Progression**: Weekly weight increases, built-in deloads
- **1RM Input**: Required for all 4 lifts
- **Notes**: Good bridge from beginner to advanced

### Phase 2: Additional 4 Programs

#### 4. Candito 6 Week
- **Difficulty**: Intermediate-Advanced
- **Duration**: 6 weeks per cycle
- **Frequency**: 4-5 days/week
- **Pattern**: 3-week strength block + 3-week peaking block
- **Progression**: Block periodization
- **1RM Input**: Required for all 4 lifts
- **Notes**: Addresses weak points, good for meet preparation

#### 5. nSuns LP
- **Difficulty**: Intermediate
- **Duration**: 4-8 weeks (until stall)
- **Frequency**: 4-5 days/week
- **Pattern**: High volume on main lift (T1), secondary lift (T2)
- **Progression**: Linear progression with weekly increases
- **1RM Input**: Required for all 4 lifts
- **Notes**: Very high volume, excellent for building base strength

#### 6. Sheiko (Beginner/Intermediate)
- **Difficulty**: Intermediate-Advanced
- **Duration**: 4-12 weeks (varies by program)
- **Frequency**: 4-6 days/week
- **Pattern**: Russian-style, high volume at moderate intensity
- **Progression**: Volume-based periodization
- **1RM Input**: Required for all 4 lifts
- **Notes**: Excellent for technique work, many variations available

#### 7. Greg Nuckols 28 Programs
- **Difficulty**: Beginner, Intermediate 1, Intermediate 2, Advanced
- **Duration**: 8-12 weeks per cycle
- **Frequency**: 3 days per lift (9-15 days/week depending on version)
- **Pattern**: Varies by program (linear, undulating, block)
- **Progression**: Evidence-based programming
- **1RM Input**: Required for all 4 lifts
- **Notes**: Highly rated by community, science-backed

---

## User Flow

### 1. Browse Programs (`/programs`)
```
┌─────────────────────────────────────────┐
│  Powerlifting Programs                   │
│  Train with proven programs              │
├─────────────────────────────────────────┤
│  ┌─────────────────────────────────────┐│
│  │ ★ StrongLifts 5×5                   ││
│  │ Beginner • 3 days/week • 8-12 weeks ││
│  │ The classic beginner program        ││
│  │ [Learn More]                        ││
│  └─────────────────────────────────────┘│
│  ┌─────────────────────────────────────┐│
│  │ ★ 5/3/1 (Wendler)                   ││
│  │ Intermediate • 4 days/week • 12-16w ││
│  │ The most popular strength program   ││
│  │ [Learn More]                        ││
│  └─────────────────────────────────────┘│
│  ┌─────────────────────────────────────┐│
│  │ ★ Madcow 5×5                        ││
│  │ Intermediate • 3 days/week • 8 wks  ││
│  │ Bridge from beginner to advanced    ││
│  │ [Learn More]                        ││
│  └─────────────────────────────────────┘│
│                                          │
│  View All Programs →                     │
└─────────────────────────────────────────┘
```

### 2. Program Detail Page (`/programs/:slug`)
Shows program overview, main lifts, expected duration, and instructions.

### 3. 1RM Input (Before Import)
```
┌─────────────────────────────────────────┐
│  Start StrongLifts 5×5                   │
│                                          │
│  Enter your current 1 Rep Maxes          │
│                                          │
│  Squat      [ 100 ]  kg                 │
│  Bench      [  80 ]  kg                 │
│  Deadlift   [ 120 ]  kg                 │
│  OHP        [  60 ]  kg                 │
│                                          │
│  Use your best single rep (not training  │
│  max). Update these after each cycle.    │
│                                          │
│  ┌─────────────────────────────────────┐│
│  │     IMPORT PROGRAM                  ││
│  └─────────────────────────────────────┘│
│                                          │
│  Note: Unit (kg/lbs) based on user prefs │
│  Preview Exercises →                     │
└─────────────────────────────────────────┘
```

### 4. Program Dashboard (`/programs/:id`)
Shows current progress and today's workout.
```
┌─────────────────────────────────────────┐
│  ← Back          StrongLifts 5×5        │
├─────────────────────────────────────────┤
│  Week 3 • Session 8 of 24               │
│  Progress: ████████░░░░░░ 33%           │
│                                          │
│  ┌─────────────────────────────────────┐│
│  │ Today's Workout                      ││
│  │                                      ││
│  │ A1. Squat         5×5 @ 80kg        ││
│  │    (5 sets of 5 reps)               ││
│  │                                      ││
│  │ B1. Bench Press     5×5 @ 60kg      ││
│  │    (5 sets of 5 reps)               ││
│  │                                      ││
│  │ C1. Barbell Row    5×5 @ 40kg       ││
│  │    (5 sets of 5 reps)               ││
│  │                                      ││
│  │ ┌─────────────────────────────────┐ ││
│  │ │      START WORKOUT              │ ││
│  │ └─────────────────────────────────┘ ││
│  └─────────────────────────────────────┘│
│                                          │
│  View Full Program →                     │
│  Edit Program Template →                 │
│  Update 1RM Values →                     │
│  End Program & Test 1RM →                │
└─────────────────────────────────────────┘
```

### 5. Edit Program Template
Users can modify the imported template weights/targets only:
- Modify main lift weights
- Change exercise order
- Cannot add/remove exercises (preserves program integrity)

### 6. End Program & Test 1RM
```
┌─────────────────────────────────────────┐
│  Complete StrongLifts 5×5                │
│                                          │
│  Congratulations on finishing your      ││
│  first program cycle!                    │
│                                          │
│  Program Summary:                        │
│  • Sessions Completed: 24/24            │
│  • Weeks Trained: 8                     │
│  • Starting 1RMs:                       │
│    - Squat: 100kg → Current: 140kg      │
│    - Bench: 80kg  → Current: 100kg      │
│    - Deadlift: 120kg → Current: 160kg   │
│    - OHP: 60kg    → Current: 75kg       │
│                                          │
│  Time to test your new 1RMs!             │
│                                          │
│  ┌─────────────────────────────────────┐│
│  │     TEST 1RM NOW                    ││
│  └─────────────────────────────────────┘│
│  (Opens dedicated 1RM test workout)     │
│                                          │
│  Or save progress and test later →       │
└─────────────────────────────────────────┘
```

---

## Database Schema

### New Table: userProgramCycles
Tracks each time a user starts a program.

```typescript
export const userProgramCycles = sqliteTable('user_program_cycles', {
  id: text('id').primaryKey().$defaultFn(() => generateId()),
  workosId: text('workos_id').notNull(),
  programSlug: text('program_slug').notNull(), // 'stronglifts-5x5', '531', etc.
  name: text('name').notNull(), // Display name (e.g., "StrongLifts 5×5 - Cycle 1")
  
  // 1RM values at start of cycle
  squat1rm: real('squat_1rm').notNull(),
  bench1rm: real('bench_1rm').notNull(),
  deadlift1rm: real('deadlift_1rm').notNull(),
  ohp1rm: real('ohp_1rm').notNull(),
  
  // Progress tracking
  currentWeek: integer('current_week').default(1),
  currentSession: integer('current_session').default(1),
  totalSessionsCompleted: integer('total_sessions_completed').default(0),
  totalSessionsPlanned: integer('total_sessions_planned').notNull(),
  
  // Status
  status: text('status').default('active'), // 'active', 'completed', 'paused'
  isComplete: integer('is_complete', { mode: 'boolean' }).default(false),
  
  // Timestamps
  startedAt: text('started_at').default(sql`CURRENT_TIMESTAMP`),
  completedAt: text('completed_at'),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});
```

### New Table: programCycleWorkouts
Links user program cycles to their workout templates.

```typescript
export const programCycleWorkouts = sqliteTable('program_cycle_workouts', {
  id: text('id').primaryKey().$defaultFn(() => generateId()),
  cycleId: text('cycle_id').notNull().references(() => userProgramCycles.id, { onDelete: 'cascade' }),
  templateId: text('template_id').notNull().references(() => templates.id, { onDelete: 'cascade' }),
  weekNumber: integer('week_number').notNull(),
  sessionNumber: integer('session_number').notNull(),
  sessionName: text('session_name').notNull(), // e.g., "Week 1 - Day A"
  targetLifts: text('target_lifts'), // JSON with target weights for each lift
  isComplete: integer('is_complete', { mode: 'boolean' }).default(false),
  workoutId: text('workout_id'), // Reference to actual completed workout
});
```

---

## File Structure

```
src/
├── routes/
│   ├── programs._index.tsx           # Browse all programs
│   ├── programs.$slug.tsx            # Program detail/description
│   ├── programs.$slug.start.tsx      # 1RM input & import
│   ├── programs.$id.tsx              # Program cycle dashboard
│   ├── programs.$id.edit.tsx         # Edit program template
│   ├── programs.$id.complete.tsx     # Complete program & test 1RM
│   ├── programs.$id.1rm-update.tsx   # Update 1RM values
│   ├── programs.$id.1rm-test.tsx     # Dedicated 1RM test workout
│   └── api/
│       ├── programs.ts               # GET all programs
│       ├── programs.$slug.ts         # GET program details
│       ├── program-cycles.ts         # CRUD for user program cycles
│       ├── program-cycles.$id.ts     # GET/PUT/DELETE specific cycle
│       ├── program-cycles.$id.start-workout.ts  # Start workout from cycle
│       └── program-cycles.$id.complete.ts       # Mark session complete
├── components/
│   └── programs/
│       ├── ProgramCard.tsx           # Program listing card
│       ├── ProgramDetail.tsx         # Full program details
│       ├── OneRMInput.tsx            # 1RM input form
│       ├── ProgramDashboard.tsx      # Main cycle dashboard
│       ├── CurrentWorkoutCard.tsx    # Today's workout display
│       ├── CycleProgress.tsx         # Progress bar & stats
│       └── program-data.ts           # Hardcoded program definitions
└── lib/
    └── programs/
        ├── index.ts                  # Main exports & utilities
        ├── types.ts                  # TypeScript types
        ├── utils.ts                  # Shared helper functions
        ├── stronglifts.ts            # StrongLifts 5×5 logic
        ├── wendler531.ts             # 5/3/1 logic
        ├── madcow.ts                 # Madcow 5×5 logic
        ├── candito.ts                # Candito 6 Week logic
        ├── nsuns.ts                  # nSuns LP logic
        ├── sheiko.ts                 # Sheiko logic
        └── nuckols.ts                # Greg Nuckols logic
    └── db/
        └── program.ts                # Program database functions
```

---

## API Endpoints

```
GET    /api/programs                           # List all available programs
GET    /api/programs/:slug                     # Get program details

POST   /api/program-cycles                     # Start a new program cycle
GET    /api/program-cycles                     # List user's active cycles
GET    /api/program-cycles/:id                 # Get specific cycle details
PUT    /api/program-cycles/:id                 # Update cycle (1RM, progress)
PUT    /api/program-cycles/:id/1rm             # Update 1RM values
PUT    /api/program-cycles/:id/progress        # Update progress (week/session)
POST   /api/program-cycles/:id/complete-session # Mark session complete
POST   /api/program-cycles/:id/complete        # Mark cycle complete
DELETE /api/program-cycles/:id                 # Delete/archive cycle
```

---

## Implementation Steps

### Step 1: Database Schema
- Add `userProgramCycles` table
- Add `programCycleWorkouts` table
- Create DB functions in `lib/db/program.ts`

### Step 2: Program Data Definitions
- Create `lib/programs/program-data.ts` with all program definitions
- Create individual program logic files (stronglifts.ts, wendler531.ts, etc.)
- Each program file exports:
  - `programInfo` (name, description, duration, difficulty)
  - `generateWorkouts(1rms)` → returns array of workout templates
  - `calculateTargetWeight(1rm, week, lift)` → returns weight for given week

### Step 3: API Endpoints
- `/api/programs` - Return all available programs
- `/api/program-cycles` - CRUD for user cycles
- Update workout creation to link to program cycles

### Step 4: Program Browse Page (`/programs`)
- Grid of program cards with key info
- Each card links to program detail

### Step 5: Program Detail & Import (`/programs/:slug`)
- Show full program description
- Show exercise list
- Link to 1RM input

### Step 6: 1RM Input & Import (`/programs/:slug/start`)
- Form to enter 1RMs for all 4 lifts
- On submit: create cycle, generate workouts, create templates

### Step 7: Program Dashboard (`/programs/:id`)
- Show current week/session
- Show today's workout
- Progress bar
- START WORKOUT button

### Step 8: Edit Functionality
- Allow editing of program templates after import
- Changes don't affect core program logic

### Step 9: Complete Program Flow
- Show program summary
- Option to test 1RM
- Option to start new cycle with updated 1RMs

### Step 10: Additional Programs (Phase 2)
- Add Candito 6 Week
- Add nSuns LP
- Add Sheiko
- Add Greg Nuckols 28 Programs

---

## Program Data Definitions

### StrongLifts 5×5
```typescript
const stronglifts5x5 = {
  slug: 'stronglifts-5x5',
  name: 'StrongLifts 5×5',
  description: 'The classic beginner program that has helped millions get stronger. Simple, effective, and proven.',
  difficulty: 'beginner',
  daysPerWeek: 3,
  estimatedWeeks: 8,
  totalSessions: 24,
  mainLifts: ['squat', 'bench', 'deadlift', 'ohp', 'row'],
  
  sessions: [
    { name: 'Day A', week: 1, exercises: [
      { name: 'Squat', sets: 5, reps: 5, lift: 'squat' },
      { name: 'Bench Press', sets: 5, reps: 5, lift: 'bench' },
      { name: 'Barbell Row', sets: 5, reps: 5, lift: 'row' },
    ]},
    { name: 'Day B', week: 1, exercises: [
      { name: 'Squat', sets: 5, reps: 5, lift: 'squat' },
      { name: 'Overhead Press', sets: 5, reps: 5, lift: 'ohp' },
      { name: 'Deadlift', sets: 1, reps: 5, lift: 'deadlift' },
    ]},
  ],
  
  calculateWeight(1rm, week, session, lift) {
    const progression = (week - 1) * 3 + session;
    const baseWeight = 1rm * 0.5; // Starting at 50% of 1RM
    return Math.round((baseWeight + (progression * 2.5)) / 2.5) * 2.5;
  },
};
```

### 5/3/1 (Wendler)
```typescript
const wendler531 = {
  slug: '531',
  name: '5/3/1 (Wendler)',
  description: 'The most popular strength program ever created. Flexible, sustainable, and proven to work.',
  difficulty: 'intermediate',
  daysPerWeek: 4,
  estimatedWeeks: 12,
  totalSessions: 48,
  mainLifts: ['squat', 'bench', 'deadlift', 'ohp'],
  
  cycles: 4, // 4-week cycles
  trainingMax: 0.9, // 90% of 1RM
  
  calculateWeight(1rm, week, day, lift) {
    const tm = 1rm * this.trainingMax;
    const percentages = {
      week1: { week1: [0.65, 0.75, 0.85], week2: [0.70, 0.80, 0.90], week3: [0.75, 0.85, 0.95], week4: [0.50, 0.60, 0.70] },
    };
    // Returns weight based on week percentage
  },
};
```

---

## UI/UX Requirements

### Design Guidelines
- Clean, minimal design
- Large, tappable buttons
- Clear progress indicators
- Mobile-first responsive

### Navigation
- Add "Programs" as NEW item in bottom nav (Workouts, Programs, Progress)
- Programs appear in main nav structure
- Easy back navigation

### Notifications
- Reminder when it's time to workout (optional, Phase 2)
- Progress updates (optional, Phase 2)

---

## Future Enhancements (Post-MVP)

1. **Auto-detection of 1RM** - Infer from workout history
2. **Calendar View** - See upcoming workouts in calendar
3. **Social Features** - Share progress, compete with friends
4. **Video Tutorials** - Links to exercise demonstrations
5. **Plate Calculator** - Show which plates to add
6. **Rest Timer** - Built-in rest timer between sets
7. **Offline Mode** - Download programs for offline use
8. **Analytics** - Detailed program analytics and insights

---

## Testing Plan

1. **Unit Tests**
   - 1RM calculation formulas
   - Program weight progressions
   - Week/session calculations

2. **Integration Tests**
   - Program import flow
   - Workout creation from program
   - Progress tracking updates

3. **E2E Tests**
   - Full program import → workout → complete flow
   - Edit program template after import
   - Complete program → test 1RM → start new cycle

---

## Rollout Plan

### Phase 1: Core (Week 1-2)
- [x] Database schema
- [x] API endpoints
- [x] Program browse page
- [x] StrongLifts 5×5 full implementation
- [x] 5/3/1 full implementation
- [x] Madcow 5×5 full implementation
- [x] Dedicated 1RM test workout type

### Phase 1b: Program UX Improvements (Hot Fixes)
- [x] Add targetWeight/sets/reps columns to template_exercises schema
- [x] Update addExerciseToTemplate to accept target parameters
- [x] Update program-cycles.ts to save target weights with exercises
- [x] Add warmup sets (2-3 per main lift) before work sets
- [x] Hide program templates from main workouts page (filter by programCycleId)
- [x] Show today's workout details on program dashboard (exercises, weights, sets)
- [x] Create API endpoint to get current workout from cycle (week/session)
- [x] Update program dashboard to display workout exercises before start button
- [x] Fix StrongLifts deadlift sets (1→5)
- [x] Fix Madcow deadlift sets (1→5)
- [x] Fix multiple exercise entries (warmups now grouped, not separate rows)
- [x] Fix 1RM + isComplete conflict in same request
- [x] Fix end workout to advance cycle progress automatically
- [x] Update start-workout API to create workout with full exercise/sets data
- [x] Link 1RM test workouts to program cycle via programCycleId column
- [x] Link regular program workouts to cycle (pass programCycleId from template to workout)
- [x] Update cycle naming to use "Month Year" format (e.g., "Madcow 5×5 - January 2025")
- [x] Fix addWorkoutToCycle - removed redundant cycle check that caused silent failures
- [x] Add error handling in program creation to catch workout assignment failures
- [x] Show program info and 1RM progress in workout history
  - Add starting 1RM columns to userProgramCycles (startingSquat1rm, etc.)
  - Update 1RM test results to preserve starting values before update
  - Display "Starting → Ending" 1RM comparison in history

### Phase 2: Additional Programs (Week 3-4)
- [x] Candito 6 Week
- [x] nSuns LP
- [x] Sheiko
- [x] Greg Nuckols 28 Programs

### Phase 3: Polish (Week 5)
- [x] UI refinements
- [x] Edge cases handling
- [x] Performance optimization
- [x] Bug fixes

### Phase 3: Completed Polish Items
#### Bug Fixes
- [x] Fix direct state mutation in 1RM test page (mutating response object)
- [x] Add response status check before json() in 1RM test handleSubmit
- [x] Remove unused _workout state in 1RM test page
- [x] Add error toasts on API failures (3 files: start, dashboard, 1rm-update)

#### Edge Cases
- [x] Toast now only shows when 1RM values actually loaded
- [x] Added progress calculation guard (prevent NaN when totalSessionsPlanned is 0)
- [x] Handle completed program UI state (show "Program Complete" message, hide action buttons)
- [x] Add text overflow handling (truncate class) for long program names
- [x] Handle null starting 1RM in 1RM test (nullish coalescing in useEffect)

#### UI Refinements
- [x] Loading state uses LoadingSkeleton components instead of "Loading..." text (4 files)
- [x] Add toast notification on program delete
- [x] Add toast notification on program creation

#### Performance
- [x] Parallelize API calls in 1RM test page (Promise.all for cycle, workout, prefs)
- [x] Add React.memo to ExerciseItem component to prevent unnecessary re-renders
- [x] Combine useEffect hooks in start program form (load preferences and 1RMs together)

### Program UX Improvements
- [x] Auto-detection of 1RM - Prefill 1RM values from previous cycle or 1RM test workouts when starting a new program
  - Added `getLatestOneRMs()` helper function to `src/lib/db/program.ts`
  - Created `GET /api/user/1rm` endpoint to return latest 1RM values
  - Updated `src/routes/programs.$slug/start.tsx` to fetch and display previous 1RMs
  - Priority: 1RM Test workout > latest cycle 1RM values
  - Shows "Previous" badge on prefilled fields
  - Clear (×) button to reset fields
  - Toast notification when values load

---

## Questions & Decisions

### Resolved
1. **Simple** - Keep UI minimal, avoid unnecessary features
2. **Modifiable** - Users can edit weights/targets only (not add/remove exercises)
3. **1RM Input** - Required before starting program, respects user's weightUnit preference
4. **Cycle-based** - Programs have defined lengths, end with 1RM testing
5. **Navigation** - "Programs" added as NEW item in bottom nav
6. **1RM Testing** - Dedicated workout type (not existing workout flow)

### Open
- None at this time

---

## References

- StrongLifts 5×5: https://stronglifts.com/5x5/
- 5/3/1: https://www.jimwendler.com/blogs/jimwendler-com/531-for-powerlifting
- Madcow 5×5: http://stronglifts.com/madcow/
- Candito 6 Week: https://www.canditotraining.com/pages/candito-lift-cycles
- nSuns LP: https://liftvault.com/programs/powerlifting/nsuns-lp/
- Sheiko: https://www.sheiko-program.com/
- Greg Nuckols 28 Programs: https://www.strongerbystrength.com/pages/recommended-routine

---

## Program Dashboard UX

### Current Workout Display
```
┌─────────────────────────────────────────┐
│  ← Back          StrongLifts 5×5        │
├─────────────────────────────────────────┤
│  Week 3 • Session 8 of 24               │
│  Progress: ████████░░░░░░ 33%           │
│                                          │
│  ┌─────────────────────────────────────┐│
│  │ Today's Workout - Day A              ││
│  │                                      ││
│  │ 🏋️ SQUAT (Working Set)              ││
│  │    Warmup: 40kg × 5 reps             ││
│  │    Warmup: 60kg × 5 reps             ││
│  │    Work:   80kg × 5×5                ││
│  │                                      ││
│  │ 🏋️ BENCH PRESS (Working Set)        ││
│  │    Warmup: 30kg × 5 reps             ││
│  │    Warmup: 50kg × 5 reps             ││
│  │    Work:   60kg × 5×5                ││
│  │                                      ││
│  │ 🏋️ BARBELL ROW (Working Set)        ││
│  │    Work:   48kg × 5×5                ││
│  │                                      ││
│  │ ┌─────────────────────────────────┐ ││
│  │ │      START WORKOUT              │ ││
│  │ └─────────────────────────────────┘ ││
│  └─────────────────────────────────────┘│
└─────────────────────────────────────────┘
```

### Key Changes

1. **Template Schema Update** (`src/lib/db/schema.ts`)
   - Add columns to `template_exercises`:
     - `targetWeight` (real, nullable)
     - `sets` (integer, nullable)
     - `reps` (integer, nullable)
     - `isWarmup` (boolean, default false)
   - Add `programCycleId` (text, nullable FK to `user_program_cycles`)

2. **Template DB Functions** (`src/lib/db/template.ts`)
   - `addExerciseToTemplate`: Accept optional `targetWeight`, `sets`, `reps`, `isWarmup`
   - `getTemplateExercisesByCycle`: New function to fetch all exercises for a program cycle

3. **Program Cycles API** (`src/routes/api/program-cycles.ts`)
   - Update POST to save target weights/sets/reps when creating template exercises
   - Add warmup sets before main work sets for compound lifts
   - Add `programCycleId` to templates

4. **Templates API** (`src/routes/api/templates.ts`)
   - Filter: `WHERE programCycleId IS NULL` - exclude program templates from main list

5. **Program Dashboard** (`src/routes/programs.cycle.$cycleId.tsx`)
   - Fetch current workout data from `programCycleWorkouts` where `weekNumber = currentWeek` AND `sessionNumber = currentSession`
   - Display exercises with:
     - Exercise name
     - Target weight (if applicable)
     - Sets × Reps
     - Warmup indicator
   - Show before "START WORKOUT" button

6. **API: Get Current Workout**
   ```
   GET /api/program-cycles/:id/current-workout
   Returns: {
     weekNumber,
     sessionNumber,
     sessionName,
     exercises: [
       { name, targetWeight, sets, reps, isWarmup }
     ]
   }
   ```
