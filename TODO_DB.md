# Database Performance Plan

Prioritized improvements given SQLite/D1 constraints.

## P1: Reduce D1 Roundtrips

- [ ] `reorderWorkoutExercises` (`src/lib/db/workout/exercises.ts#L169-L201`) — replace `Promise.all` of individual updates with `db.batch()` (N roundtrips → 1)
- [ ] `reorderTemplateExercises` — same pattern, same fix
- [ ] `createWorkoutWithDetails` (`src/lib/db/workout/workouts.ts#L423-L429`) — sequential chunked inserts in a `for` loop; collect all chunks and fire via single `db.batch()`
- [ ] `syncPull` (`src/lib/services/sync-service.ts#L237-L286`) — workout_exercises + sets queries are sequential after the initial batch; combine into `db.batch()`

## P2: Denormalize Write-Time Aggregates

- [ ] Add `totalVolume`, `totalSets`, `durationMinutes` columns to `workouts` table
- [ ] Compute them in `completeWorkout` instead of on every list read
- [ ] Simplify `getWorkoutsByWorkosId` (`src/lib/db/workout/workouts.ts#L179-L279`) — remove 5-table join + `julianday()` aggregates, query workouts table directly

## P3: Fix Composite Indexes

- [ ] Add `(workosId, isDeleted, completedAt)` composite on `workouts` — covers streaks, workout lists, weekly counts
- [ ] Add `(workosId, isDeleted, updatedAt)` composite on `workouts` — covers sync delta queries
- [ ] Audit and drop redundant single-column indexes now covered by composites (e.g., standalone `isDeleted`, `completedAt`, `startedAt`)

## P4: Eliminate `date()` in WHERE Clauses

- [ ] Add `completedDate TEXT` column (YYYY-MM-DD) to `workouts` table, populated on write
- [ ] Index `completedDate` directly instead of wrapping `completedAt` in `date()` (un-sargable → sargable)
- [ ] Update streaks + weekly queries (`src/lib/gamification/streaks.ts`) to use indexed column comparison

## P5: Bound Whoop `rawJson`

- [ ] Exclude `rawJson` from all list/sync queries on Whoop tables (`whoopSleeps`, `whoopRecoveries`, `whoopCycles`, `whoopWorkouts`)
- [ ] Only fetch `rawJson` on individual detail/debug endpoints
- [ ] Prevents hitting D1's ~1MB response limit as Whoop data accumulates
