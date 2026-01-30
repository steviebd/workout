# Code Cleanup & Performance Optimization - Fit Workout App

This document outlines dead code removal and database write performance improvements identified during a codebase review. Focus is on reducing bundle size, improving write performance, and eliminating redundant code.

---

## Priority Legend
- 🔴 **High** - Significant performance impact or obvious dead code
- 🟡 **Medium** - Moderate improvement, good cleanup
- 🟢 **Low** - Minor optimization, nice to have

---

## Phase 1: Dead Code Removal

### 1.1 🔴 Delete Unused Files

| File | Reason | Action |
|------|--------|--------|
| `src/data/demo.punk-songs.ts` | Demo server function, never imported anywhere | Delete entire file |
| `debug-db.ts` | Development utility script, not part of app | Delete entire file |

**Verification:** After deletion, run `bun run typecheck` and `bun run build` to confirm no imports break.

---

### 1.2 🟡 Remove Unused Exports from `src/lib/fuzzy-match.ts`

The following exports are defined but never imported:

```typescript
// Lines 73-98: Remove this function
export function findAllSimilarLibraryExercises(...)

// Lines 100-103: Remove this function  
export function normalizeMuscleGroup(...)
```

**Verification:** Search codebase for imports of these functions before removing:
```bash
grep -r "findAllSimilarLibraryExercises\|normalizeMuscleGroup" src/
```

---

### 1.3 🟡 Remove Unused Exports from `src/lib/exercise-library.ts`

The following exports are defined but never imported:

```typescript
// Lines 74-78: Remove this function
export function getExercisesByMuscleGroup(...)

// Lines 80-87: Remove this function
export function searchLibraryExercises(...)

// Lines 89-91: Remove this function
export function getAllMuscleGroups(...)
```

**Verification:** Search codebase before removing:
```bash
grep -r "getExercisesByMuscleGroup\|searchLibraryExercises\|getAllMuscleGroups" src/
```

---

### 1.4 🟢 Remove Unused PostHog Shutdown Functions

Check if these are actually unused (they may be needed for graceful shutdown):

| File | Function | Line |
|------|----------|------|
| `src/lib/posthog.ts` | `shutdownClient` | ~L54-57 |
| `src/lib/posthog.server.ts` | `shutdownClient` | ~L50-52 |

**Note:** Only remove if not called during app lifecycle events. Search first:
```bash
grep -r "shutdownClient" src/
```

---

### 1.5 🟡 Check Deprecated API Endpoint

File: `src/routes/api/progress.ts` (Lines 15-20)

This endpoint is marked as deprecated. Determine if it's still in use:
1. Search for client-side calls to this endpoint
2. Check analytics for usage
3. If unused, delete the file

---

## Phase 2: Code Deduplication

### 2.1 🔴 Deduplicate `queueOperation` Helper

**Problem:** `queueOperation` is defined in TWO places with identical logic:
- `src/lib/db/local-repository.ts` (Lines 11-23)
- `src/hooks/useActiveWorkout.ts` (Lines 41-53)

**Solution:**
1. Keep the version in `local-repository.ts`
2. Export it: `export async function queueOperation(...)`
3. In `useActiveWorkout.ts`, import instead of redefining:
   ```typescript
   import { queueOperation } from '~/lib/db/local-repository';
   ```
4. Delete lines 41-53 from `useActiveWorkout.ts`

Also deduplicate these helper functions from `useActiveWorkout.ts`:
- `generateLocalId()` (Line 33-35) - already exists in `local-repository.ts`
- `now()` (Line 37-39) - already exists in `local-repository.ts`

---

### 2.2 🔴 Unify `clearWorkout` and `discardWorkout`

**Problem:** These two functions in `src/hooks/useActiveWorkout.ts` are nearly identical:
- `clearWorkout` (Lines 448-471)
- `discardWorkout` (Lines 473-496)

**Solution:** Create one internal function and alias both names:

```typescript
const deleteWorkoutInternal = useCallback(async () => {
  if (!workout || !user) return;

  const workoutRecord = await localDB.workouts.where('localId').equals(workout.id).first();
  if (workoutRecord) {
    const exercises = await localDB.workoutExercises.where('workoutId').equals(workout.id).toArray();
    for (const we of exercises) {
      const sets = await localDB.workoutSets.where('workoutExerciseId').equals(we.localId).toArray();
      for (const set of sets) {
        if (set.id !== undefined) {
          await localDB.workoutSets.delete(set.id);
        }
      }
      if (we.id !== undefined) {
        await localDB.workoutExercises.delete(we.id);
      }
    }
    if (workoutRecord.id !== undefined) {
      await localDB.workouts.delete(workoutRecord.id);
    }
  }

  setWorkout(null);
}, [workout, user]);

const clearWorkout = deleteWorkoutInternal;
const discardWorkout = deleteWorkoutInternal;
```

---

### 2.3 🟡 Remove `queueOperationOp` Passthrough

**File:** `src/lib/db/local-repository.ts` (Lines 242-244)

```typescript
export async function queueOperationOp(...): Promise<void> {
  await queueOperation(type, entity, localId, data);
}
```

This is a pure passthrough with no added logic. Check if anything imports it:
```bash
grep -r "queueOperationOp" src/
```

If unused externally, delete it. If used, rename callers to use `queueOperation` directly.

---

## Phase 3: Database Performance - IndexedDB (Dexie)

### 3.1 🔴 Fix N+1 Query in `getActiveWorkoutWithDetails`

**File:** `src/hooks/useActiveWorkout.ts` (Lines 90-114)

**Problem:** Fetches sets per exercise in a loop (N+1 pattern):
```typescript
const exercisesWithSets = await Promise.all(
  workoutExercises.map(async (we) => {
    const sets = await localDB.workoutSets
      .where('workoutExerciseId')
      .equals(we.localId)
      .toArray();
    return { ...we, sets };
  })
);
```

**Solution:** Fetch all sets in one query, then group in memory:

```typescript
async function getActiveWorkoutWithDetails(userId: string): Promise<ActiveWorkout | null> {
  const localWorkout = await localDB.workouts
    .where('userId').equals(userId)
    .and((w) => w.status === 'in_progress')
    .first();

  if (!localWorkout) return null;

  const workoutExercises = await localDB.workoutExercises
    .where('workoutId')
    .equals(localWorkout.localId)
    .toArray();

  // Fetch ALL sets in one query instead of N queries
  const weLocalIds = workoutExercises.map(we => we.localId);
  const allSets = weLocalIds.length > 0
    ? await localDB.workoutSets.where('workoutExerciseId').anyOf(weLocalIds).toArray()
    : [];

  // Group sets by workoutExerciseId in memory
  const setsByExercise = new Map<string, LocalWorkoutSet[]>();
  for (const set of allSets) {
    const existing = setsByExercise.get(set.workoutExerciseId) ?? [];
    existing.push(set);
    setsByExercise.set(set.workoutExerciseId, existing);
  }

  const exercisesWithSets = workoutExercises.map(we => ({
    ...we,
    sets: setsByExercise.get(we.localId) ?? [],
  }));

  return mapLocalToActiveWorkout(localWorkout, exercisesWithSets);
}
```

---

### 3.2 🔴 Batch Writes in `reorderExercises`

**File:** `src/hooks/useActiveWorkout.ts` (Lines 403-432)

**Problem:** Makes sequential DB calls in a loop:
```typescript
for (const order of exerciseOrders) {
  const weLocalId = await getWorkoutExerciseLocalId(workout.id, order.exerciseId);
  if (weLocalId) {
    const we = await localDB.workoutExercises.where('localId').equals(weLocalId).first();
    if (we?.id !== undefined) {
      await localDB.workoutExercises.update(we.id, { ... });
    }
    await queueOperation('update', 'workout_exercise', weLocalId, { ... });
  }
}
```

**Solution:** Fetch all at once, batch update in a transaction:

```typescript
const reorderExercises = useCallback(async (exerciseOrders: Array<{ exerciseId: string; orderIndex: number }>) => {
  if (!workout || !user) return;

  // Fetch all workout exercises at once
  const allWorkoutExercises = await localDB.workoutExercises
    .where('workoutId')
    .equals(workout.id)
    .toArray();

  const weByExerciseId = new Map(allWorkoutExercises.map(we => [we.exerciseId, we]));

  // Prepare updates
  const updates: Array<{ id: number; order: number; localId: string }> = [];
  for (const order of exerciseOrders) {
    const we = weByExerciseId.get(order.exerciseId);
    if (we?.id !== undefined) {
      updates.push({ id: we.id, order: order.orderIndex, localId: we.localId });
    }
  }

  // Batch update in a single transaction
  await localDB.transaction('rw', localDB.workoutExercises, localDB.offlineQueue, async () => {
    for (const update of updates) {
      await localDB.workoutExercises.update(update.id, {
        order: update.order,
        syncStatus: 'pending',
        needsSync: true,
      });
    }
    
    // Batch queue operations
    const operations = updates.map(update => ({
      operationId: generateLocalId(),
      type: 'update' as const,
      entity: 'workout_exercise' as const,
      localId: update.localId,
      data: { order: update.order, localId: update.localId },
      timestamp: now(),
      retryCount: 0,
      maxRetries: 3,
    }));
    await localDB.offlineQueue.bulkAdd(operations);
  });

  // Update UI state
  setWorkout((prev) => {
    if (!prev) return prev;
    const exerciseMap = new Map(prev.exercises.map((e) => [e.exerciseId, e]));
    const reorderedExercises = exerciseOrders
      .map((order) => exerciseMap.get(order.exerciseId))
      .filter((e): e is ActiveWorkoutExercise => e !== undefined)
      .map((e, i) => ({ ...e, orderIndex: i }));
    return { ...prev, exercises: reorderedExercises };
  });
}, [workout, user]);
```

---

### 3.3 🔴 Batch Deletes in `clearWorkout`/`discardWorkout`

**File:** `src/hooks/useActiveWorkout.ts` (Lines 448-496)

**Problem:** Deletes sets and exercises one by one in nested loops.

**Solution:** Use bulk delete operations:

```typescript
const deleteWorkoutInternal = useCallback(async () => {
  if (!workout || !user) return;

  const workoutRecord = await localDB.workouts.where('localId').equals(workout.id).first();
  if (!workoutRecord) {
    setWorkout(null);
    return;
  }

  await localDB.transaction('rw', localDB.workouts, localDB.workoutExercises, localDB.workoutSets, async () => {
    // Get all exercise IDs for this workout
    const exercises = await localDB.workoutExercises.where('workoutId').equals(workout.id).toArray();
    const weLocalIds = exercises.map(we => we.localId);

    // Bulk delete all sets for these exercises
    if (weLocalIds.length > 0) {
      await localDB.workoutSets.where('workoutExerciseId').anyOf(weLocalIds).delete();
    }

    // Bulk delete all exercises for this workout
    await localDB.workoutExercises.where('workoutId').equals(workout.id).delete();

    // Delete the workout itself
    if (workoutRecord.id !== undefined) {
      await localDB.workouts.delete(workoutRecord.id);
    }
  });

  setWorkout(null);
}, [workout, user]);
```

---

### 3.4 🟡 Wrap Multi-Step Writes in Transactions

**Files affected:**
- `src/hooks/useActiveWorkout.ts` - multiple functions
- `src/lib/db/local-repository.ts` - all write functions

**Problem:** Each function does separate writes to local table + offlineQueue. These should be atomic.

**Solution:** Wrap in Dexie transactions:

```typescript
// Example for createExercise in local-repository.ts
export async function createExercise(userId: string, data: ...): Promise<string> {
  const localId = generateLocalId();
  const exercise: LocalExercise = { ... };

  await localDB.transaction('rw', localDB.exercises, localDB.offlineQueue, async () => {
    await localDB.exercises.add(exercise);
    await queueOperation('create', 'exercise', localId, exercise as unknown as Record<string, unknown>);
  });

  return localId;
}
```

Apply this pattern to:
- `createExercise`
- `updateExercise`
- `deleteExercise`
- `createTemplate`
- `updateTemplate`
- `deleteTemplate`
- `createWorkout`
- `updateWorkout`
- `completeWorkout`
- `addExerciseToWorkout`
- `addSetToWorkoutExercise`
- `updateSet`
- `deleteSet`

---

### 3.5 🟡 Implement Operation Compaction in `queueOperation`

**File:** `src/lib/db/local-repository.ts` (Lines 11-23)

**Problem:** Every edit creates a new queue entry. Rapid typing creates many redundant "update" operations.

**Solution:** Merge updates for the same entity/localId:

```typescript
async function queueOperation(
  type: 'create' | 'update' | 'delete',
  entity: 'exercise' | 'template' | 'workout' | 'workout_exercise' | 'workout_set',
  localId: string,
  data: Record<string, unknown>
): Promise<void> {
  // Check for existing pending operation for this entity
  const existing = await localDB.offlineQueue
    .where({ entity, localId })
    .first();

  if (type === 'delete') {
    // Delete should remove any pending operations and add the delete
    if (existing?.id) {
      await localDB.offlineQueue.delete(existing.id);
    }
    await localDB.offlineQueue.add({
      operationId: generateLocalId(),
      type,
      entity,
      localId,
      data,
      timestamp: now(),
      retryCount: 0,
      maxRetries: 3,
    });
  } else if (type === 'update' && existing) {
    // Merge update into existing operation
    if (existing.id) {
      await localDB.offlineQueue.update(existing.id, {
        data: { ...existing.data, ...data },
        timestamp: now(),
      });
    }
  } else if (type === 'create' && existing?.type === 'create') {
    // Merge into existing create
    if (existing.id) {
      await localDB.offlineQueue.update(existing.id, {
        data: { ...existing.data, ...data },
        timestamp: now(),
      });
    }
  } else {
    // No existing operation, add new one
    await localDB.offlineQueue.add({
      operationId: generateLocalId(),
      type,
      entity,
      localId,
      data,
      timestamp: now(),
      retryCount: 0,
      maxRetries: 3,
    });
  }
}
```

**Note:** Add an index on `[entity, localId]` in `local-db.ts` for efficient lookups:
```typescript
offlineQueue: '++id, operationId, [entity+localId], timestamp'
```

---

## Phase 4: Database Performance - Server/D1 (Drizzle)

### 4.1 🔴 Fix N² In-Memory Processing in `getLastWorkoutSetsForExercises`

**File:** `src/lib/db/workout.ts` (Lines 90-165)

**Problem:** For each exerciseId, does filter + sort on the entire result set:
```typescript
for (const exerciseId of exerciseIds) {
  const filtered = recentWorkoutExercises
    .filter(rwe => rwe.exerciseId === exerciseId)
    .sort((a, b) => { ... });
  // ...
}
```

**Solution:** Single-pass using Maps:

```typescript
export async function getLastWorkoutSetsForExercises(
  db: D1Database,
  userId: string,
  exerciseIds: string[]
): Promise<Map<string, LastWorkoutSetData[]>> {
  if (exerciseIds.length === 0) {
    return new Map();
  }

  const drizzleDb = createDb(db);

  const recentWorkoutExercises = await drizzleDb
    .select({
      exerciseId: workoutExercises.exerciseId,
      workoutExerciseId: workoutExercises.id,
      completedAt: workouts.completedAt,
    })
    .from(workoutSets)
    .innerJoin(workoutExercises, eq(workoutSets.workoutExerciseId, workoutExercises.id))
    .innerJoin(workouts, eq(workoutExercises.workoutId, workouts.id))
    .where(and(
      eq(workouts.userId, userId),
      inArray(workoutExercises.exerciseId, exerciseIds),
      isNotNull(workoutSets.completedAt)
    ))
    .orderBy(desc(workouts.completedAt))
    .all();

  if (recentWorkoutExercises.length === 0) {
    return new Map();
  }

  // Build map of latest workoutExerciseId per exerciseId in ONE pass
  const latestWeByExercise = new Map<string, string>();
  for (const rwe of recentWorkoutExercises) {
    // First occurrence is the latest (already sorted by completedAt DESC)
    if (!latestWeByExercise.has(rwe.exerciseId)) {
      latestWeByExercise.set(rwe.exerciseId, rwe.workoutExerciseId);
    }
  }

  const workoutExerciseIds = [...latestWeByExercise.values()];

  const sets = await drizzleDb
    .select({
      workoutExerciseId: workoutSets.workoutExerciseId,
      setNumber: workoutSets.setNumber,
      weight: workoutSets.weight,
      reps: workoutSets.reps,
      rpe: workoutSets.rpe,
    })
    .from(workoutSets)
    .where(inArray(workoutSets.workoutExerciseId, workoutExerciseIds))
    .orderBy(workoutSets.setNumber)
    .all();

  // Group sets by workoutExerciseId
  const setsByWe = new Map<string, LastWorkoutSetData[]>();
  for (const s of sets) {
    const arr = setsByWe.get(s.workoutExerciseId) ?? [];
    arr.push({
      setNumber: s.setNumber,
      weight: s.weight,
      reps: s.reps,
      rpe: s.rpe,
    });
    setsByWe.set(s.workoutExerciseId, arr);
  }

  // Map back to exerciseId
  const result = new Map<string, LastWorkoutSetData[]>();
  for (const exerciseId of exerciseIds) {
    const weId = latestWeByExercise.get(exerciseId);
    result.set(exerciseId, weId ? (setsByWe.get(weId) ?? []) : []);
  }

  return result;
}
```

---

### 4.2 🟡 Remove Console Logs from Hot Paths

**Files to check:**
- `src/lib/db/workout.ts` - search for `console.log`
- `src/lib/db/exercise.ts`
- `src/lib/db/template.ts`

Remove or gate behind environment check:
```typescript
if (process.env.ENVIRONMENT === 'dev') {
  console.log('Debug info...');
}
```

---

### 4.3 🟢 Consider SQL Window Functions for Latest Per Exercise

**File:** `src/lib/db/workout.ts`

If performance is still an issue after 4.1, use SQL window functions:

```sql
SELECT * FROM (
  SELECT 
    we.exercise_id,
    we.id as workout_exercise_id,
    w.completed_at,
    ROW_NUMBER() OVER (
      PARTITION BY we.exercise_id 
      ORDER BY w.completed_at DESC
    ) as rn
  FROM workout_exercises we
  JOIN workouts w ON we.workout_id = w.id
  WHERE w.user_id = ? AND we.exercise_id IN (...)
) WHERE rn = 1
```

This reduces data transfer from DB to application.

---

## Phase 5: Verification

After completing changes, run:

```bash
# Type checking
bun run typecheck

# Linting
bun run lint

# Build
bun run build

# Unit tests
bun run test

# E2E tests (if available)
bun run test:e2e
```

---

## Summary Checklist

### Dead Code Removal
- [x] Delete `src/data/demo.punk-songs.ts`
- [x] Delete `debug-db.ts`
- [x] Remove unused exports from `src/lib/fuzzy-match.ts`
- [x] Remove unused exports from `src/lib/exercise-library.ts`
- [x] Check and potentially remove PostHog shutdown functions
- [x] Evaluate deprecated progress API endpoint

### Code Deduplication
- [x] Deduplicate `queueOperation` helper
- [x] Deduplicate `generateLocalId` and `now` helpers
- [x] Unify `clearWorkout` and `discardWorkout`
- [x] Remove `queueOperationOp` passthrough

### IndexedDB Performance
- [x] Fix N+1 in `getActiveWorkoutWithDetails`
- [x] Batch writes in `reorderExercises`
- [x] Batch deletes in `clearWorkout`/`discardWorkout`
- [x] Wrap multi-step writes in transactions
- [x] Implement operation compaction in `queueOperation`
- [x] Add index for `[entity+localId]` on offlineQueue

### D1 Performance
- [x] Fix N² processing in `getLastWorkoutSetsForExercises`
- [x] Remove console.logs from hot paths
- [ ] (Optional) Use SQL window functions

---

## Estimated Effort

| Phase | Effort | Impact |
|-------|--------|--------|
| Phase 1: Dead Code | 30 min | Bundle size |
| Phase 2: Deduplication | 1 hour | Maintainability |
| Phase 3: IndexedDB | 2-3 hours | Write performance |
| Phase 4: D1 | 1-2 hours | Read performance |
| Phase 5: Verification | 30 min | Correctness |

**Total: 5-7 hours**
