# Implementation Roadmap

## Phase 1: Foundation ✓ COMPLETE

### 1.1 Project Setup ✓
- [x] Verify all Infisical secrets configured
- [x] Create D1 databases (dev, staging, prod)
- [x] Push initial schema to all environments
- [x] Configure GitHub Actions workflow
- [x] Test `bun run dev` with remote D1

**Deliverable:** ✓ Working dev environment with database connection

### 1.2 Authentication (WorkOS + JWT) - COMPLETE
- [x] Add @workos-inc/node SDK dependency
- [x] Add jose library for JWT
- [x] Create JWT utilities (src/lib/auth.ts)
- [x] Create session management (src/lib/session.ts)
- [x] Create user sync from WorkOS (src/lib/db/user.ts)
- [x] Create `/auth/signin` route
- [x] Create `/auth/callback` route
- [x] Create `/auth/signout` route
- [x] Update root layout with auth state
- [x] Create placeholder routes for exercises, templates, workouts, history

**Deliverable:** ✓ Working authentication system with JWT-based sessions

### 1.3 Basic Routing & Layout - COMPLETE
- [x] Set up root layout with auth state
- [x] Create dashboard (`/`)
- [x] Create navigation header with auth-aware links
- [x] Add Tailwind styling foundation
- [x] Add client-side route protection
- [x] Create placeholder protected routes

**Deliverable:** ✓ App shell with navigation, auth state, and protected routes

### 1.4 E2E TEST
- [x] Install Playwright and configure for project
- [x] Create `.env.test` with test credentials from Infisical
- [x] Create `tests/e2e/auth.spec.ts` with login/logout flow test

**Deliverable:** ✓ E2E test for now with playwright

**Test Flow:**
1. Visit `/` (home) as unauthenticated user - verify "Sign In" link visible
2. Navigate to protected route (e.g., `/exercises`) - verify redirect to `/auth/signin`
3. Click "Sign In" - verify redirect to WorkOS AuthKit
4. Enter test credentials (email/password) on WorkOS login form
5. After successful login - verify redirected back and user name displayed
6. Verify protected routes are accessible (e.g., `/exercises`, `/templates`, `/workouts/new`, `/history`)
7. Click "Sign Out" - verify logged out state
8. Navigate to protected route (e.g., `/workouts/new`) - verify redirect to WorkOS login
9. Verify login form is displayed (email/password fields)

**Configuration:**
- `BASE_URL`: http://localhost:8787 (dev server)
- `TEST_USERNAME`: from Infisical (`example@email.com`)
- `TEST_PASSWORD`: from Infisical (`test123`)
- `PLAYWRIGHT_TEST_USERNAME`: env var for test email input selector
- `PLAYWRIGHT_TEST_PASSWORD`: env var for test password input selector

**Deliverable:** ✓ Playwright E2E test covering full auth flow (login, protected routes access, logout, re-authentication)

---

## Phase 2: Core Features (Week 2)

### 2.1 Exercise Management ✓ COMPLETE

**Schema Updates:**
- [x] Add `description` (optional text field) to exercises table
- [x] Add `isDeleted` (soft-delete boolean, default false) to exercises table
- [x] Predefined muscle groups list + custom option for free text

**Muscle Groups (predefined list):**
- Chest, Back, Shoulders, Biceps, Triceps, Forearms, Core, Quads, Hamstrings, Glutes, Calves, Full Body, Cardio, Other
- Custom field available for any muscle group not in list

**Pre-populated Exercise Library:**
- [x] Common barbell, dumbbell, and machine lifts (55 exercises)
- [x] Users can copy exercises from library to their personal collection
- [x] Library is read-only, users own their copied versions

**Routes & Views:**

| Route | Purpose | Features |
|-------|---------|----------|
| `/exercises` | List view | [x] Search by name, [x] filter by muscle group, [x] sort options, [x] pagination |
| `/exercises/new` | Create form | [x] Choose from library OR create custom, [x] muscle group dropdown + custom, [x] description |
| `/exercises/$id` | Detail view | [x] Read-only display of all exercise fields, [x] created date, [x] usage count |
| `/exercises/$id/edit` | Edit form | [x] Modify name, muscle group, description |

**Features:**
- [x] Soft delete (preserves data in templates/workouts)
- [x] Search by exercise name
- [x] Filter by muscle group (dropdown)
- [x] Sort by name, muscle group, created date
- [x] Copy from exercise library functionality
- [x] Full CRUD operations

**Database Operations (src/lib/db/exercise.ts):**
- [x] createExercise
- [x] getExerciseById (with ownership check)
- [x] getExercisesByUserId (search, filter, sort, pagination)
- [x] updateExercise
- [x] softDeleteExercise
- [x] copyExerciseFromLibrary

**API Routes:**
- [x] GET /api/exercises - List exercises with query params
- [x] POST /api/exercises - Create new exercise
- [x] GET /api/exercises/$id - Get single exercise
- [x] PUT /api/exercises/$id - Update exercise
- [x] DELETE /api/exercises/$id - Soft delete exercise
- [x] POST /api/exercises/copy-from-library - Copy from library

**Tests:**
- [x] Unit tests (17 tests) - tests/unit/exercise.spec.ts
- [x] E2E tests (16 tests) - tests/e2e/exercises.spec.ts

**Files Created:**
- src/lib/db/exercise.ts - CRUD operations
- src/lib/exercise-library.ts - Pre-populated exercise library (55 exercises)
- src/routes/exercises._index.tsx - List view
- src/routes/exercises.new.tsx - Create form with library picker
- src/routes/exercises.$id.tsx - Detail view
- src/routes/exercises.$id.edit.tsx - Edit form
- src/routes/api/exercises.ts - List + Create API
- src/routes/api/exercises.$id.ts - Get + Update + Delete API
- src/routes/api/exercises.copy-from-library.ts - Copy from library API
- tests/unit/exercise.spec.ts - Unit tests
- tests/e2e/exercises.spec.ts - E2E tests

**Deliverable:** ✓ Users can create, view, edit, and soft-delete exercises with search/filter capabilities

### 2.2 Template System ✓ COMPLETE

**Schema Updates:**
- [x] Add `isDeleted` (soft-delete boolean, default false) to templates table
- [x] Add `notes` (optional text field) to templates table
- [x] Remove `targetSets`, `targetReps`, `notes` from template_exercises (save for workout-level)

**Routes & Views:**

| Route | Purpose | Features |
|-------|---------|----------|
| `/templates` | List view | [x] Search by name, [x] sort by name/date, [x] pagination |
| `/templates/new` | Create form | [x] Template name, [x] description, [x] notes, [x] exercise selector with search/filter, [x] reorderable exercises |
| `/templates/$id` | Detail view | [x] Read-only display, [x] exercise list in order, [x] copy button |
| `/templates/$id/edit` | Edit form | [x] Same as create, [x] add/remove/reorder exercises |

**Features:**
- [x] Soft delete (preserves workout references)
- [x] Search by template name
- [x] Sort by name, created date
- [x] Exercise selector with search/filter (reuse `/exercises` patterns)
- [x] Drag-to-reorder exercises
- [x] Copy template (creates new with exercises)
- [x] Full CRUD operations

**Database Operations (src/lib/db/template.ts):**
- [x] createTemplate
- [x] getTemplateById (with ownership check)
- [x] getTemplatesByUserId (search, sort, pagination)
- [x] updateTemplate
- [x] softDeleteTemplate
- [x] copyTemplate
- [x] addExerciseToTemplate
- [x] removeExerciseFromTemplate
- [x] reorderTemplateExercises

**API Routes:**
- [x] GET /api/templates - List templates
- [x] POST /api/templates - Create template
- [x] GET /api/templates/$id - Get single template
- [x] PUT /api/templates/$id - Update template
- [x] DELETE /api/templates/$id - Soft delete template
- [x] POST /api/templates/$id/copy - Copy template
- [x] POST /api/templates/$id/exercises - Add exercise
- [x] DELETE /api/templates/$id/exercises/$exerciseId - Remove exercise
- [x] PUT /api/templates/$id/exercises/reorder - Reorder exercises

**Tests:**
- [x] Unit tests - tests/unit/template.spec.ts
- [x] E2E tests - tests/e2e/templates.spec.ts

**Files Created:**
- src/lib/db/template.ts - CRUD operations
- src/routes/templates._index.tsx - List view
- src/routes/templates.new.tsx - Create form
- src/routes/templates.$id.tsx - Detail view
- src/routes/templates.$id.edit.tsx - Edit form
- src/routes/api/templates.ts - List + Create API
- src/routes/api/templates.$id.ts - Get + Update + Delete API
- src/routes/api/templates.$id.copy.ts - Copy API
- src/routes/api/templates.$id.exercises.ts - Exercise management API
- src/routes/api/templates.$id.exercises.reorder.ts - Reorder API

**Deliverable:** ✓ Users can create, view, edit, copy, and soft-delete workout templates with reorderable exercises

### 2.3 Workout Logging

**Schema Updates:**
- [x] Add `user_preferences` table (weightUnit: 'kg' | 'lbs', theme)
- [x] Add `notes` (optional text) to workouts table

**Database Operations:**
- [x] Create `src/lib/db/workout.ts`:
  - [x] createWorkout
  - [x] getWorkoutById (with ownership check)
  - [x] getWorkoutsByUserId (for history)
  - [x] updateWorkout (for completing/saving)
  - [x] deleteWorkout (for discarding drafts)
  - [x] createWorkoutExercise
  - [x] getWorkoutExercises (with exercise details)
  - [x] createWorkoutSet
  - [x] updateWorkoutSet
  - [x] deleteWorkoutSet
  - [x] getLastWorkoutForExercise (for populating defaults)
- [x] Create `src/lib/db/preferences.ts`:
  - [x] getUserPreferences
  - [x] upsertUserPreferences

**API Routes:**
- [x] GET /api/preferences - Get user preferences
- [x] PUT /api/preferences - Update preferences
- [x] POST /api/workouts - Create draft workout
- [x] GET /api/workouts - List user workouts (for history)
- [x] GET /api/workouts/$id - Get single workout
- [x] PUT /api/workouts/$id/complete - Complete workout
- [x] DELETE /api/workouts/$id - Delete workout (discard draft)
- [x] POST /api/workouts/$id/exercises - Add exercise to workout
- [x] DELETE /api/workouts/$id/exercises/$exerciseId - Remove exercise
- [x] PUT /api/workouts/$id/exercises/reorder - Reorder exercises
- [x] POST /api/workouts/$id/exercises/$exerciseId/sets - Add set
- [x] PUT /api/workouts/sets/$setId - Update set
- [x] DELETE /api/workouts/sets/$setId - Delete set

**localStorage Sync:**
- [x] Create `src/hooks/useActiveWorkout.ts`:
  - [x] Continuous sync to localStorage (key: `activeWorkout`)
  - [x] Check for existing active workout on mount
  - [x] Resume workout from localStorage on return
  - [x] Only one active workout at a time

**Routes & Views:**

| Route | Purpose | Features |
|-------|---------|----------|
| `/workouts/new` | Start workout form | [x] Start from template, [x] Copy from recent, [x] Blank workout |
| `/workouts/$id` | Workout session | [x] Active workout interface, [x] Set logging, [x] Add/delete sets, [x] Add exercises, [x] Reorder exercises, [x] Complete workout |
| `/workouts/$id/summary` | Completion summary | [x] Duration, [x] Total volume, [x] Exercises completed, [x] Personal records |

**Start Workout Flow:**
1. **Start from Template** - User selects template, can add extra exercises before starting
2. **Copy from Recent** - Copy last workout's exercise + set data
3. **Blank Workout** - User selects exercises to include

**Workout Session Interface:**
- [x] Exercise list with collapsible sections
- [x] Each exercise shows:
  - [x] Exercise name
  - [x] Set list (editable weight/reps/RPE)
  - [x] Add set button
  - [x] Delete set button
  - [x] Delete exercise button
- [x] Add exercises button (search/filter from exercise library)
- [x] Reorder exercises (drag or up/down arrows)
- [x] Workout notes field
- [x] Real-time localStorage sync
- [x] Complete workout button
- [x] Discard workout button

**Set Logging:**
- [x] Weight input (stored as-is, displayed with unit conversion)
- [x] Reps input
- [x] RPE input (1-10, optional, allows decimals)
- [x] Set number (auto-incremented)
- [x] "Complete" toggle for each set
- [x] Auto-populate with last workout's data when adding exercise

**Workout Completion:**
- [x] Calculate total duration (startedAt to completedAt)
- [x] Calculate total volume (sum of weight × reps)
- [x] Count completed exercises and sets
- [x] Identify personal records (new max weight for exercise)
- [x] Save workout to database (sets completedAt timestamps)
- [x] Clear localStorage active workout
- [x] Show summary screen
- [x] Redirect to history or dashboard

**Summary Page Data Fetching:**
- [x] Implemented TanStack Query polling to handle race condition between workout completion and summary page load
- [x] Polls workout data every 500ms until `completedAt` timestamp is available
- [x] Automatically stops polling once workout data is confirmed complete
- [x] Eliminates "Workout not yet completed" error that occurred during race condition
- [x] Provides seamless user experience without artificial delays

**Features:**
- [x] Real-time auto-save to localStorage (continuous sync)
- [x] Resume in-progress workout on return
- [x] Weight unit preference (kg/lbs, kg default)
- [x] Soft delete preserved in schema
- [x] Draft workouts (started but not completed)
- [x] History populates defaults for exercises

**Files Created:**
- `src/lib/db/workout.ts` - Workout CRUD operations
- `src/lib/db/preferences.ts` - User preferences operations
- `src/hooks/useActiveWorkout.ts` - localStorage sync hook
- `src/routes/workouts.new.tsx` - Start workout form
- `src/routes/workouts.$id.tsx` - Workout session interface
- `src/routes/workouts.$id.summary.tsx` - Completion summary
- `src/routes/api/preferences.ts` - Preferences API
- `src/routes/api/workouts.ts` - Workout CRUD API
- `src/routes/api/workouts.$id.ts` - Single workout API
- `src/routes/api/workouts.$id.complete.ts` - Complete workout API
- `src/routes/api/workouts.$id.exercises.ts` - Exercise management
- `src/routes/api/workouts.$id.exercises.reorder.ts` - Reorder API
- `src/routes/api/workouts.sets.ts` - Create set API
- `src/routes/api/workouts.sets.$setId.ts` - Set operations API
- `tests/unit/workout.spec.ts` - Unit tests
- `tests/e2e/workouts.spec.ts` - E2E tests

**Tests:**
- [x] Unit tests (workout CRUD, preferences, set operations)
- [x] E2E tests (start workout, complete workout, discard workout, resume workout)

**Deliverable:** ✓ Users can start workouts from templates/recent/blank, log sets with weight/reps/RPE, add/remove/reorder exercises, have workout auto-save to localStorage, and complete workouts with summary

---

## Phase 3: History & Analytics (Week 3)

### 3.1 Workout History ✓ COMPLETE

**Database Operations (src/lib/db/workout.ts):**
- [x] Extend `getWorkoutsByUserId` with new options:
  - `fromDate?: string` - Filter by startedAt >= date
  - `toDate?: string` - Filter by startedAt <= date
  - `exerciseId?: string` - Filter workouts containing specific exercise
- [x] Return enriched data: exerciseCount, totalSets, totalVolume, duration
- [x] Add `getWorkoutHistoryStats` function:
  - totalWorkouts: number
  - thisWeek: number
  - thisMonth: number
  - totalVolume: number
  - totalSets: number

**API Routes:**
- [x] Extend GET /api/workouts with:
  - `fromDate` - Filter by startedAt >= date
  - `toDate` - Filter by startedAt <= date
  - `exerciseId` - Filter workouts containing specific exercise
  - Only return workouts where `completedAt IS NOT NULL`
- [x] Add GET /api/workouts/stats for summary statistics

**Reusable Component:**
- [x] Create `src/components/ExerciseSelect.tsx`
  - Searchable dropdown for exercises
  - Reuses existing exercise API
  - Used in template creation, workout creation, and history filter

**Routes & Views:**

| Route | Purpose | Features |
|-------|---------|----------|
| `/history` | History list view | [x] Stats cards (clickable), [x] Exercise filter (dropdown), [x] Date range picker, [x] Search, [x] Sort options, [x] Expandable workout cards with full set details, [x] Infinite scroll (load 10 initial) |

**UI Layout:**
- **Stats Cards:** Total Workouts, This Week, This Month, Total Volume, Total Sets (clickable to apply filters)
- **Quick Filter Buttons:** [This Week] [This Month] [All Time]
- **Filter Bar:** Exercise dropdown, From date picker, To date picker, Search input
- **Sort Dropdown:** Newest First, Oldest First, Most Volume, Longest Duration
- **Workout Cards (expandable):**
  - Date, workout name, duration, exercise count, sets count, volume, status badge
  - Expanded: full set details (weight/reps for each set)
- **Infinite Scroll:** Load more when within 500px of bottom

**Features:**
- [x] Only show completed workouts (completedAt IS NOT NULL)
- [x] Quick date filters (This Week, This Month, All Time)
- [x] Filter by exercise (dropdown/search picker)
- [x] Filter by date range (native date pickers)
- [x] Sort by newest/oldest, volume, duration
- [x] Expandable workout cards with full set details
- [x] Clickable stat cards to apply filters
- [x] Infinite scroll (10 initial load, 500px threshold)
- [x] Search by workout name

**Tests:**
- [x] Unit tests (getWorkoutsByUserId with filters, getWorkoutHistoryStats) - tests/unit/workout.spec.ts
- [x] E2E tests (view history, filter by date, filter by exercise, click stats cards, expand/collapse, infinite scroll) - tests/e2e/history.spec.ts

**Files Created:**
- src/components/ExerciseSelect.tsx - Reusable exercise dropdown component
- tests/e2e/history.spec.ts - E2E tests

**Files Modified:**
- src/lib/db/workout.ts - Add functions
- src/routes/api/workouts.ts - Extend API
- src/routes/history._index.tsx - Implement UI
- tests/unit/workout.spec.ts - Add tests

**Deliverable:** ✓ Users can view all past completed workouts with filtering by date, exercise, and sorting options

### 3.2 Exercise History ✓ COMPLETE

**Route:**
- `/history/:exerciseId` - Dedicated page showing progress for a specific exercise

**UI Layout:**

```
┌─────────────────────────────────────────────────────────────┐
│ Bench Press                                                │
│ [Line Chart: Max Weight Over Time - toggle switch]         │
├─────────────────────────────────────────────────────────────┤
│ Max Weight: 140kg  │  Est. 1RM: 155kg  │  12 Workouts      │
├─────────────────────────────────────────────────────────────┤
│ [This Week] [This Month] [This Year (default)] [All Time]  │
│ From: [_____]  To: [_____]                                  │
├─────────────────────────────────────────────────────────────┤
│ Table (TanStack Table):                                     │
│ ┌──────────┬────────────┬───────────┬──────┬────────┬────┐  │
│ │ Date     │ Workout    │ Max Weight│ Reps │ Est 1RM│ PR │  │
│ ├──────────┼────────────┼───────────┼──────┼────────┼────┤  │
│ │ Jan 15   │ Push Day   │ 105kg     │ 4    │ 115kg  │ 🏆 │  │
│ │ Jan 10   │ Upper Body │ 100kg     │ 5    │ 110kg  │    │  │
│ │ Jan 5    │ Chest Day  │ 95kg      │ 8    │ 103kg  │    │  │
│ └──────────┴────────────┴───────────┴──────┴────────┴────┘  │
└─────────────────────────────────────────────────────────────┘
```

**Key Features:**
- **Line Chart:** Max weight per workout over time, switchable to volume
- **Flat List Table:** One row per workout showing highest weight set for this exercise
- **Columns:** Date | Workout Name | Max Weight | Reps | Est. 1RM | PR Badge
- **PR Badge:** 🏆 shown when this workout set a new max for the exercise
- **Quick Filters:** This Week, This Month, This Year (default), All Time
- **Date Range Picker:** Custom from/to dates
- **Stats Cards:** Max Weight, Estimated 1RM, Total Workouts (clickable filters)
- **Chart PR Markers:** Highlight workout points where new PR was set

**Navigation:**
- Click exercise name on expanded history card → `/history/:exerciseId`
- Link from exercises list page → `/history/:exerciseId`

**Database Operations (src/lib/db/workout.ts):**
- [x] Add `getExerciseHistory` function:
  - Takes exerciseId, userId, date filters
  - Returns: date, workoutName, maxWeight, repsAtMax, est1rm, isPR
  - Filters to completed workouts only
  - Sorts by date descending
- [x] Add `calculateE1RM` function for 1RM calculation

**API Routes:**
- [x] Add GET `/api/exercises/:exerciseId/history`:
  - Query params: fromDate, toDate, limit, offset
  - Returns exercise history with stats

**Components:**
- [x] Create `src/components/ExerciseHistoryChart.tsx`:
  - Uses recharts for line chart
  - Toggle between max weight and volume views
  - PR markers on chart points

- [x] Reuse `src/components/ExerciseSelect.tsx`:
  - For navigation breadcrumbs or dropdown

- [x] Reuse TanStack Table for data display

**Files Created:**
- `src/routes/history.$exerciseId.tsx` - Exercise history page
- `src/routes/api/exercises.$exerciseId.history.ts` - History API
- `src/components/ExerciseHistoryChart.tsx` - Chart component
- `tests/unit/workout.spec.ts` - Add history tests

**Files Modified:**
- `src/routes/history._index.tsx` - Add link on exercise names
- `src/routes/exercises._index.tsx` - Add history link on exercise cards
- `src/lib/db/workout.ts` - Add getExerciseHistory and calculateE1RM functions

**Tests:**
- [x] Unit tests (getExerciseHistory, 1RM calculation)
- [x] E2E tests (view exercise history, chart toggle, PR display, navigation)

**Deliverable:** ✓ Users can view exercise-specific progress with line chart, PR tracking, and filtered history

### 3.3 Dashboard Updates ✓ COMPLETE

**Features:**
- [x] Show recent workouts on dashboard (5 most recent completed workouts)
- [x] Display quick stats (workouts this week, this month, total, PRs count)
- [x] Add "Start Workout" quick action (prominent CTA button)
- [x] Write unit tests

**UI Layout:**
- **Stats Cards (4 cards):** This Week, This Month, Total Workouts, PRs
- **Start Workout CTA:** Prominent button linking to `/workouts/new`
- **Recent Workouts:** List of 5 most recent completed workouts with date, name, duration
- **Empty State:** Friendly message when no workouts exist

**Files Created:**
- `src/routes/api/workouts.pr-count.ts` - API endpoint for PR count
- `tests/unit/dashboard.spec.ts` - Unit tests for dashboard functions

**Files Modified:**
- `src/routes/index.tsx` - Complete rewrite with stats cards, recent workouts, and CTA
- `src/lib/db/workout.ts` - Added `getPrCount` function

**Tests:**
- [x] Unit tests for dashboard data fetching functions
- [x] Tests for PR counting logic

**Deliverable:** ✓ Informative dashboard with quick stats, recent workouts, and prominent start action

---

## Phase 4: Polish & Deploy (Week 4)

### 4.1 Posthog Integration
- [ ] Set up Posthog client
- [ ] Track page views
- [ ] Track key events:
  - `user_signed_in`
  - `exercise_created`
  - `template_created`
  - `workout_started`
  - `workout_completed`
  - `set_logged`
- [ ] Create dashboards

**Deliverable:** Analytics tracking implemented

### 4.2 UI/UX Improvements
- [ ] Add loading states
- [ ] Add error boundaries
- [ ] Improve form validation
- [ ] Add empty states
- [ ] Polish Tailwind styling
- [ ] Add mobile responsive design
- [ ] Add toast notifications

**Deliverable:** Polished, production-ready UI

### 4.3 Staging Deployment
- [ ] Configure staging worker
- [ ] Deploy to staging.fit.stevenduong.com
- [ ] Test all features in staging
- [ ] Fix any issues
- [ ] Get sign-off on staging

**Deliverable:** Working staging environment

### 4.4 Production Deployment
- [ ] Configure production worker
- [ ] Deploy to fit.stevenduong.com
- [ ] Configure custom domain
- [ ] Enable HTTPS
- [ ] Set up monitoring
- [ ] Final testing

**Deliverable:** Production application live

---

## Phase 5: Testing & Quality (Ongoing)

### 5.1 Test Coverage
- [ ] Achieve 80% unit test coverage
- [ ] Achieve 100% critical path E2E coverage
- [ ] Add integration tests for database operations
- [ ] Add auth flow E2E tests

**Target:** All tests passing, high coverage

### 5.2 Performance
- [ ] Optimize database queries
- [ ] Add database indexes
- [ ] Implement lazy loading for routes
- [ ] Optimize bundle size
- [ ] Achieve Lighthouse score > 90

**Target:** Fast, performant application

### 5.3 Documentation
- [ ] Complete README.md
- [ ] Complete inline code documentation
- [ ] Create API documentation (if needed)
- [ ] Document deployment procedures

**Deliverable:** Complete documentation

---

## Future Enhancements (Post-MVP)

### Features
- [ ] Social sharing of workouts
- [ ] Team workouts
- [ ] Export workout data (CSV/PDF)
- [ ] Exercise suggestions based on history
- [ ] Graph progress over time
- [ ] Achievements/badges
- [ ] Rest timer
- [ ] Notes on sets/exercises

### Technical
- [ ] Database backups
- [ ] Rate limiting
- [ ] Caching layer
- [ ] API rate monitoring
- [ ] Sentry error tracking
- [ ] Automated dependency updates (Dependabot)

---

## Milestone Checklist

### Sprint 1 End - COMPLETE
- [x] Dev environment working
- [x] Auth dependencies installed
- [x] Auth system implemented
- [x] Database schema finalized

### Sprint 2 End
- [x] Exercises CRUD complete
- [x] Templates CRUD complete
- [x] Workout logging complete

### Sprint 3 End
- [x] History views complete
- [x] Dashboard complete
- [ ] All unit tests passing

### Sprint 4 End
- [ ] Posthog integrated
- [ ] UI polished
- [ ] Staging deployed
- [ ] Production deployed
- [ ] E2E tests passing

---

## Dependency Order

```
Phase 1 (Foundation)
    │
    ▼
Phase 2 (Core Features)
    │
    ├── Exercise Management ──────┐
    │                            │
    ▼                            ▼
Template System ◄──── Workout Logging
    │                            │
    └──────────┬─────────────────┘
               │
               ▼
Phase 3 (History & Analytics)
               │
               ▼
Phase 4 (Polish & Deploy)
```

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| WorkOS API issues | Test with sandbox first |
| D1 migration failures | Test migrations locally first |
| CI/CD failures | Test GitHub Actions on feature branch |
| Performance issues | Monitor with Posthog, optimize queries |
| Data isolation issues | Strict user ID checks on all queries |
