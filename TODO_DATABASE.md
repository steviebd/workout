# Database Optimization Plan

## Objective
Reduce the number of database round-trips (latency) and complexity in API handlers, specifically for write-heavy operations like creating workouts. The current implementation suffers from N+1 query patterns that will degrade performance as data grows.

## Current Issues identified
1. **`POST /api/workouts` N+1 Problem:**
   - Currently, creating a workout iterates through every exercise.
   - For each exercise, it:
     - Inserts a `WorkoutExercise`.
     - Queries `getLastWorkoutSetsForExercise` (Read).
     - Iterates through those sets and inserts new `WorkoutSet`s (Write).
   - If a workout has 10 exercises with 3 sets each, this could result in ~30+ separate database calls.

2. **Sequential Awaits:**
   - The loop in `src/routes/api/workouts.ts` awaits each database operation sequentially.

## Proposed Changes

### 1. `src/lib/db/workout.ts`

Create a new function `createWorkoutWithDetails` that handles the entire flow in minimal steps using batch operations.

**New Helper: `getLastWorkoutSetsForExercises`**
Instead of fetching last sets one-by-one, fetch them all in a single query.

```sql
-- Conceptual Query
WITH RankedWorkouts AS (
  SELECT
    we.exercise_id,
    w.id as workout_id,
    ROW_NUMBER() OVER (PARTITION BY we.exercise_id ORDER BY w.completed_at DESC) as rn
  FROM workouts w
  JOIN workout_exercises we ON w.id = we.workout_id
  WHERE w.user_id = ?
    AND we.exercise_id IN (?, ?, ...)
    AND w.completed_at IS NOT NULL
)
SELECT ...
FROM RankedWorkouts
WHERE rn = 1
```

**New Function: `createWorkoutWithDetails`**
Logic flow:
1.  **Insert Workout**: Single insert.
2.  **Batch Insert WorkoutExercises**: Use `drizzleDb.insert(workoutExercises).values([...]).returning()`.
3.  **Fetch History**: Call `getLastWorkoutSetsForExercises` with all exercise IDs at once.
4.  **Prepare Sets**: In memory, map the history to the new `workoutExercise` IDs.
5.  **Batch Insert WorkoutSets**: Single insert for all sets across all exercises.

### 2. `src/routes/api/workouts.ts`

Refactor the POST handler to:
1.  Resolve the list of `exerciseIds` (either from the request body or by fetching the template).
2.  Call the new `createWorkoutWithDetails` function.
3.  Return the result.

### 3. Future Areas for Investigation
-   **Transactions:** Ensure these batch operations are wrapped in a transaction if D1/Drizzle support allows, to prevent partial workout creation.
-   **Read Optimizations:** Review `getWorkoutsByUserId` and other list endpoints to ensure we aren't over-fetching or causing N+1s on the read side (though `getWorkoutWithExercises` looks mostly correct using joins).

## Implementation Details for the Next Agent

You can start by implementing the functions in `src/lib/db/workout.ts` as drafted below (from previous attempt):

```typescript
export async function getLastWorkoutSetsForExercises(
  db: D1Database,
  userId: string,
  exerciseIds: string[]
): Promise<Map<string, LastWorkoutSetData[]>> {
  // ... implementation using raw SQL or efficient Drizzle query
}

export async function createWorkoutWithDetails(
  db: D1Database,
  data: CreateWorkoutData & { userId: string; exerciseIds: string[] }
): Promise<Workout> {
  // ... implementation using batch inserts
}
```
