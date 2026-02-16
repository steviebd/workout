# Fit Workout App - Refactoring Plan

> **Status:** Proposed  
> **Priority:** Medium-High  
> **Estimated Effort:** 2-3 weeks  
> **Target Audience:** Backend/Full-stack Developer

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Date Utilities Consolidation](#1-date-utilities-consolidation)
3. [Database Index Optimization](#2-database-index-optimization)
4. [Repository Pattern Extraction](#3-repository-pattern-extraction)
5. [Exercise Category Matching](#4-exercise-category-matching)
6. [Service Layer Cleanup](#5-service-layer-cleanup)
7. [Type Safety Improvements](#6-type-safety-improvements)
8. [API Error Handling Standardization](#7-api-error-handling-standardization)
9. [Batch Operation Optimization](#8-batch-operation-optimization)
10. [Component Lazy Loading](#9-component-lazy-loading)
11. [Testing Strategy](#testing-strategy)

---

## Executive Summary

This document outlines a series of refactoring tasks to improve the **performance** and **maintainability** of the Fit Workout App. The codebase is well-structured overall, using modern patterns (TanStack Start, Drizzle ORM, Dexie for offline, WorkOS auth), but has accumulated some technical debt that should be addressed.

### Key Constraints

- **Mobile-first**: All optimizations must work on low-memory mobile devices
- **Offline-first**: The app uses Dexie (IndexedDB) for offline support with a sync engine (`src/lib/sync/`) - any changes to repositories must account for sync compatibility
- **D1/SQLite**: Cloudflare D1 uses SQLite with a ~999 variable limit
- **SSR**: TanStack Start uses server-side rendering — `React.lazy` does not work with SSR out of the box
- **Whoop Integration**: Schema includes 6 Whoop tables with 7 indexes — keep in mind when modifying schema/indexes

### Impact vs Effort Matrix

| Task | Impact | Effort | Priority |
|------|--------|--------|----------|
| Date utilities consolidation | Medium | Low | 1 |
| DB index optimization | High | Low | 2 |
| Repository patterns | High | Medium | 3 |
| Exercise category matching | Low | Low | 4 |
| Service layer cleanup | Medium | Medium | 5 |
| Type safety | Medium | Medium | 6 |
| API error standardization | Medium | Medium | 7 |
| Batch operations | Low | Medium | 8 |
| Component lazy loading | Low | Medium | 9 |

---

## 1. Date Utilities Consolidation

### Problem

Two files contain overlapping date utility functions:

| File | Functions |
|------|-----------|
| `src/lib/date.ts` | `formatDate`, `formatTime`, `formatDateTime`, `formatRelativeDate` |
| `src/lib/utils/date.ts` | `getWeekStart`, `getWeekEnd`, `getDaysAgo`, `getMonthsAgo`, `getTodayStr`, etc. |

This creates confusion about which to use and potential for bugs.

### Current State

**`src/lib/date.ts`** (32 lines):
```typescript
export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-US', {
    weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
  });
}
// ... plus formatTime, formatDateTime, formatRelativeDate
```

**`src/lib/utils/date.ts`** (65 lines):
```typescript
export function getWeekStart(date: Date = new Date()): Date {
  const dayOfWeek = date.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  // ...
}
// ... plus 10+ other functions
```

### Solution

1. **Merge into single file**: Move all functions from `src/lib/date.ts` into `src/lib/utils/date.ts`
2. **Remove duplicate**: Delete `src/lib/date.ts`
3. **Update imports**: Find all imports of `src/lib/date` and update to `src/lib/utils/date`

### Files to Update

Currently only `src/routes/index.tsx` imports from `~/lib/date` (the `formatRelativeDate` function). No files currently import from `~/lib/utils/date`. The import impact is minimal but the consolidation prevents future confusion.

### Expected Changes

- **New file**: `src/lib/utils/date.ts` (approximately 90 lines after merge)
- **Delete**: `src/lib/date.ts`
- **Update**: `src/routes/index.tsx` — change import from `~/lib/date` to `~/lib/utils/date`

---

## 2. Database Index Optimization

### Problem

The schema has:
1. Some redundant single-column indexes that are covered by composite indexes
2. Missing composite indexes for common query patterns

### Current Index Analysis

**Redundant indexes on `exercises` table:**

| Index | Columns | Covered By |
|-------|---------|------------|
| `_exercisesWorkosIdIdx` | `workosId` | `_exercisesWorkosIdUpdatedAtIdx` |
| `_exercisesNameIdx` | `name` | `_exercisesNameMuscleGroupIdx` |

**Note:** `_workoutsWorkosIdStartedAtIdx` on `(workosId, startedAt)` already exists and covers the most common query pattern (`getWorkoutsByWorkosId` filters by `workosId` + `startedAt` range).

**Missing composite indexes:**

| Query Pattern | Needed Index |
|---------------|--------------|
| Get workout exercises by workout + order | Already exists: `idx_workout_exercises_order` |
| Get sets by exercise completion | `(workoutExerciseId, isComplete)` |

### Solution

**Do NOT remove indexes** — while some single-column indexes (e.g. `_exercisesWorkosIdIdx`) are prefix-covered by composite indexes, SQLite's query planner may still prefer them for certain queries. Removing indexes requires profiling with `EXPLAIN QUERY PLAN` first.

1. Add missing composite indexes for common queries
2. Run EXPLAIN QUERY PLAN on slow queries to verify index usage before any removal
3. D1 uses SQLite 3.45+ which supports partial indexes — consider for soft-deleted records

### Files to Modify

- `src/lib/db/schema.ts` (add new indexes)

### Suggested New Indexes

```typescript
// In src/lib/db/schema.ts, add after existing indexes:

// For set completion queries (used when calculating workout stats)
export const _workoutSetsExerciseCompleteIdx = index('idx_workout_sets_exercise_complete')
  .on(workoutSets.workoutExerciseId, workoutSets.isComplete);
```

### Verification

After adding indexes, verify with:
```sql
EXPLAIN QUERY PLAN SELECT * FROM workouts 
WHERE workosId = ? AND startedAt >= ? AND completedAt IS NOT NULL;
```

---

## 3. Repository Pattern Extraction

### Problem

Similar code patterns repeated across repository files:

1. **Pagination handling** - offset/limit logic duplicated in:
   - `src/lib/db/exercise/repository.ts:109-120`
   - `src/lib/db/template/repository.ts:146-152`
   - `src/lib/db/workout/workouts.ts:247-253`

2. **Ordering logic** - repeated sort column/direction handling in:
   - Multiple repository files

3. **Update timestamp pattern** - `updatedAt: new Date().toISOString()` repeated everywhere

4. **Transaction wrapper** - `getDb(dbOrTx)` pattern repeated in every function

### Current Duplication Example

**Pagination in exercise repository:**
```typescript
// src/lib/db/exercise/repository.ts:109-120
let results: Exercise[];
if (offset !== undefined && limit !== undefined) {
  results = await baseQuery.offset(offset).limit(limit);
} else if (offset !== undefined) {
  results = await baseQuery.offset(offset);
} else if (limit !== undefined) {
  results = await baseQuery.limit(limit);
} else {
  results = await baseQuery;
}
```

**Same pattern in template repository:**
```typescript
// src/lib/db/template/repository.ts:146-152
const results = (offset !== undefined && limit !== undefined
  ? await query.offset(offset).limit(limit)
  : offset !== undefined
    ? await query.offset(offset)
    : limit !== undefined
      ? await query.limit(limit)
      : await query) as TemplateWithExerciseCount[];
```

### Solution

Create a base repository utility file:

**New file: `src/lib/db/base-repository.ts`**

```typescript
import type { DbOrTx } from './workout/types';
import { getDb } from './index';
import type { SelectOrderByArg } from 'drizzle-orm';

/**
 * Applies pagination to a query
 */
export function applyPagination<T>(
  query: T,
  offset?: number,
  limit?: number
): T {
  if (offset !== undefined && limit !== undefined) {
    return (query as { offset(n: number): { limit(n: number): T } })
      .offset(offset).limit(limit) as T;
  }
  if (offset !== undefined) {
    return (query as { offset(n: number): T }).offset(offset) as T;
  }
  if (limit !== undefined) {
    return (query as { limit(n: number): T }).limit(limit) as T;
  }
  return query;
}

/**
 * Builds an orderBy clause from sort parameters
 */
export function buildOrderByClause<T extends SelectOrderByArg>(
  sortBy: string,
  sortOrder: 'ASC' | 'DESC',
  columns: Record<string, T>
): T {
  const column = columns[sortBy];
  if (!column) return columns.createdAt; // default
  
  return sortOrder === 'DESC' 
    ? (column as unknown as { desc(): T }).desc()
    : column;
}

/**
 * Adds updatedAt timestamp to data
 */
export function withUpdatedAt<T extends object>(data: T): T & { updatedAt: string } {
  return { ...data, updatedAt: new Date().toISOString() };
}

/**
 * Ensures we have a db instance from either direct db or transaction
 */
export function getDbInstance(dbOrTx: DbOrTx) {
  return getDb(dbOrTx);
}
```

### Migration Steps

1. Create `src/lib/db/base-repository.ts`
2. Update each repository to import from base:
   - `src/lib/db/exercise/repository.ts`
   - `src/lib/db/template/repository.ts`
   - `src/lib/db/workout/workouts.ts`
   - Any others with similar patterns

### Estimated Impact

- **Lines removed**: ~50-80 lines of duplication
- **Maintainability**: New developers have one place to update pagination logic

---

## 4. Exercise Category Matching

### Problem

`src/lib/exercise-categories.ts` uses repeated `toLowerCase()` calls and simple string matching:

```typescript
// Current implementation
export function isSquat(name: string): boolean {
  const n = name.toLowerCase();
  return n.includes('squat') && !n.includes('goblet');
}

export function isBench(name: string): boolean {
  const n = name.toLowerCase();
  return n === 'bench' || n === 'bench press' || n.includes('bench');
}
```

This is called in hot paths (e.g., `src/lib/services/workout-service.ts:31-48`).

### Solution

Optimize with pre-compiled patterns:

```typescript
// src/lib/exercise-categories.ts

// Pre-compile regex patterns for performance
const SQUAT_PATTERN = /^(?!goblet).*squat/i;
const BENCH_PATTERN = /^(bench|bench press)$/i;
const BENCH_INCLUDES_PATTERN = /bench/i;
const DEADLIFT_PATTERN = /deadlift/i;
const OHP_PATTERN = /^(ohp|overhead|over head)$/i;
const OHP_INCLUDES_PATTERN = /overhead|over head/i;

// Cache for normalized names (simple memoization)
const normalizedCache = new Map<string, string>();

function normalizeName(name: string): string {
  const cached = normalizedCache.get(name);
  if (cached) return cached;
  const normalized = name.toLowerCase().trim();
  normalizedCache.set(name, normalized);
  return normalized;
}

export function isSquat(name: string): boolean {
  const n = normalizeName(name);
  return SQUAT_PATTERN.test(n);
}

export function isBench(name: string): boolean {
  const n = normalizeName(name);
  return BENCH_PATTERN.test(n) || BENCH_INCLUDES_PATTERN.test(n);
}

export function isDeadlift(name: string): boolean {
  return DEADLIFT_PATTERN.test(normalizeName(name));
}

export function isOverheadPress(name: string): boolean {
  const n = normalizeName(name);
  return OHP_PATTERN.test(n) || OHP_INCLUDES_PATTERN.test(n);
}
```

### Files to Modify

- `src/lib/exercise-categories.ts`

### Notes

- The cache is intentionally small (just normalized names) to avoid memory issues on mobile
- For very high volume, consider a switch to use a Map lookup with exact matches first

---

## 5. Service Layer Cleanup

### Problem

`src/lib/services/workout-service.ts` duplicates some repository logic:

```typescript
// src/lib/services/workout-service.ts:103-113
const completed = await completeWorkoutRepo(dbOrTx, workoutId, workosId);
if (!completed) return null;

const workout = await getWorkoutWithExercises(dbOrTx, workoutId, workosId);
// Then does more work...
```

This makes it harder to test and reason about where business logic lives.

### Solution

**Option A (Recommended): Keep services, document clearly**

Document the layering:
- **Repositories**: Data access, CRUD, queries
- **Services**: Business logic, cross-cutting concerns, side effects

**Option B: Merge into repositories**

Move service logic into repositories, making services thin wrappers.

### Recommended Approach

Keep the current structure but:

1. Add JSDoc explaining the separation
2. Move `extractTested1RMs` into a utility file (it's pure logic)
3. Consider if `completeWorkout` should be in the repository instead

### Files to Modify

- `src/lib/services/workout-service.ts` - add documentation
- `src/lib/services/set-service.ts` - review for similar issues

---

## 6. Type Safety Improvements

### Problem

Several `any` types that reduce type safety:

1. **Query typing** - `src/lib/db/workout/workouts.ts:235`:
   ```typescript
   let query: any = baseQuery;
   ```

2. **Sync engine** - Multiple type assertions in `src/lib/sync/sync-engine.ts`

### Solution

**Fix query typing:**

```typescript
// src/lib/db/workout/workouts.ts

// Instead of:
let query: any = baseQuery;

// Use proper typing:
type WorkoutQuery = ReturnType<typeof baseQuery>;
let query: WorkoutQuery = baseQuery;
```

**Fix sync engine types:**

Add more specific types in `src/lib/sync/types.ts` and use them throughout.

### Files to Modify

- `src/lib/db/workout/workouts.ts`
- `src/lib/sync/sync-engine.ts`
- `src/lib/sync/types.ts` (may need to create/expand)

---

## 7. API Error Handling Standardization

### Problem

Inconsistent error handling patterns:

- `src/lib/api/handler.ts` has `handleApiError`, `withApiHandler`
- `src/lib/api/errors.ts` has `ApiError`, `createApiError`
- Each route handler does its own try/catch

### Solution

Create a unified API handler wrapper:

```typescript
// src/lib/api/api-handler.ts

import { handleApiError } from './handler';
import type { SessionPayload } from '../session';

type HandlerFn<T> = (context: {
  session: SessionPayload;
  db: ReturnType<typeof createDb>;
  d1Db: D1Database;
}) => Promise<T>;

export function createApiHandler<T>(
  handler: HandlerFn<T>
): HandlerFn<Response> {
  return async (context) => {
    try {
      return await handler(context);
    } catch (err) {
      return handleApiError(err, handler.name || 'API operation');
    }
  };
}
```

Then update routes to use it:

```typescript
// Example: src/routes/api/exercises.ts
export const Route = createFileRoute('/api/exercises')({
  server: {
    handlers: {
      GET: createApiHandler(async ({ session, d1Db }) => {
        const exercises = await getExercisesByWorkosId(d1Db, session.sub, {...});
        return Response.json(exercises);
      }),
    },
  },
});
```

### Files to Modify

- Create `src/lib/api/api-handler.ts`
- Update API routes (optional, can be done gradually)

---

## 8. Batch Operation Optimization

### Problem

Current chunked insert in `src/lib/db/workout/workouts.ts:402-408`:

```typescript
if (setsToInsert.length > 0) {
  const CHUNK_SIZE = calculateChunkSize(7);
  for (let i = 0; i < setsToInsert.length; i += CHUNK_SIZE) {
    const batch = setsToInsert.slice(i, i + CHUNK_SIZE);
    await db.insert(workoutSets).values(batch).run();
  }
}
```

### Current Approach

This is already correct for D1's variable limit. The `calculateChunkSize` ensures we stay under 999 variables.

### Potential Improvements

1. **Group in transaction**: Wrap all inserts in one transaction:
   ```typescript
   await db.transaction(async (tx) => {
     // Insert workout
     // Insert exercises  
     // Insert sets in chunks
   });
   ```

2. **Use Drizzle's chunking**: Drizzle 0.27+ handles this automatically

### Verification Steps

1. Check current Drizzle version in `package.json`
2. If using an older version, test if chunking can be removed
3. Benchmark with large workouts (10+ exercises, 30+ sets)

---

## 9. Component Lazy Loading

### Problem

Some components load heavy dependencies eagerly:
- Charts via `recharts` (`src/components/progress/StrengthChart.tsx`) — imported in `src/routes/progress.tsx`
- Template editor (`src/components/TemplateEditor/index.tsx`) — imported in `src/routes/templates.new.tsx`

### Solution

**Do NOT use `React.lazy`** — it does not work with SSR (TanStack Start). Instead, use TanStack Router's built-in `createLazyFileRoute` to split heavy routes into lazy-loaded chunks. This is SSR-compatible and already supported by the file-based routing setup.

Split the route component out of the main route file into a `.lazy.tsx` file. The main route file keeps the `loader`/server logic, while the `.lazy.tsx` file contains the component (and its heavy imports like `recharts`).

**Example for `progress` route:**

```typescript
// src/routes/progress.tsx — keeps loader, server functions
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/progress')({
  loader: async () => { /* existing loader logic */ },
});
```

```typescript
// src/routes/progress.lazy.tsx — lazy-loaded component with heavy recharts import
import { createLazyFileRoute } from '@tanstack/react-router';
import { StrengthChart } from '~/components/progress/StrengthChart';

export const Route = createLazyFileRoute('/progress')({
  component: ProgressPage,
});

function ProgressPage() {
  // existing component code that uses StrengthChart/recharts
}
```

**Example for `templates.new` route:**

```typescript
// src/routes/templates.new.lazy.tsx
import { createLazyFileRoute } from '@tanstack/react-router';
import { TemplateEditor } from '@/components/TemplateEditor';

export const Route = createLazyFileRoute('/templates/new')({
  component: () => <TemplateEditor mode="create" />,
});
```

### Files to Modify

- `src/routes/progress.tsx` → split into `progress.tsx` (loader) + `progress.lazy.tsx` (component)
- `src/routes/templates.new.tsx` → split into `templates.new.tsx` (loader) + `templates.new.lazy.tsx` (component)

### Mobile Considerations

- Route-level splitting means `recharts` (~45KB gzipped) only loads when the progress page is visited
- TanStack Router shows the route's `pendingComponent` while the lazy chunk loads
- Test on low-end Android devices to verify load time improvement

---

## Testing Strategy

### Unit Tests

For each refactored module:

1. **Date utilities**: Test all edge cases (leap years, timezones)
2. **Repository patterns**: Mock DB, test pagination/orderby
3. **Exercise categories**: Test comprehensive exercise name list

### Integration Tests

Run existing E2E tests after each change:

```bash
bun run test:e2e
```

### Performance Tests

1. **Database**: Profile queries with `EXPLAIN QUERY PLAN`
2. **Bundle size**: Check with `bun run build && ls -la dist/`
3. **Mobile**: Test on physical device if possible

---

## Rollout Plan

### Phase 1: Low Risk (Week 1)

1. ✅ Date utilities consolidation
2. ✅ DB index additions (add only, don't remove)
3. ✅ Exercise category optimization

### Phase 2: Medium Risk (Week 2)

4. Repository pattern extraction
5. Type safety fixes

### Phase 3: Higher Risk (Week 3)

6. Service layer cleanup
7. API error standardization
8. Component lazy loading

---

## Appendix: File Reference

### Key Files by Category

**Database:**
- `src/lib/db/schema.ts` - Table definitions, indexes
- `src/lib/db/index.ts` - DB factory
- `src/lib/db/exercise/repository.ts` - Exercise CRUD
- `src/lib/db/template/repository.ts` - Template CRUD
- `src/lib/db/workout/workouts.ts` - Workout CRUD

**Services:**
- `src/lib/services/workout-service.ts` - Workout business logic
- `src/lib/services/set-service.ts` - Set business logic

**API:**
- `src/lib/api/handler.ts` - Error handling
- `src/lib/api/errors.ts` - Error types

**Utilities:**
- `src/lib/date.ts` - TO BE REMOVED
- `src/lib/utils/date.ts` - Target date utilities
- `src/lib/exercise-categories.ts` - Exercise type detection

---

## Open Questions

1. **Service layer**: Should we merge services into repositories or keep separate?
2. **Error handling**: Is the unified API handler approach acceptable?
3. **Caching**: Should we add caching for exercise library? (Dexie already has some)

---

*Document version: 1.0*  
*Last updated: 2026-02-16*
