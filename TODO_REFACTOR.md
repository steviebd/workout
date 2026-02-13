# Refactoring Plan

> **Goal:** Improve performance and maintainability (especially for LLM/Agent workflows).  
> **Status:** Draft — pending review.

---

## Phase 1: Normalize DB Access

**Effort:** ~2 hours | **Impact:** Maintainability + reduces bug surface

### Problem

Every repository function accepts raw `D1Database` and wraps it with `createDb()` internally — **94 calls across 8 files**. Meanwhile `withApiContext()` already creates a Drizzle instance, but routes often destructure `d1Db` and pass it to repos that wrap it again.

Additionally, this 2-line boilerplate is repeated **20+ times**:

```ts
const isTransaction = 'transaction' in dbOrTx;
const db = isTransaction ? dbOrTx : createDb(dbOrTx as D1Database);
```

### Affected Files

- `src/lib/db/workout/repository.ts` (28 calls)
- `src/lib/db/program.ts` (20 calls)
- `src/lib/db/template/repository.ts` (18 calls)
- `src/lib/streaks.ts` (9 calls)
- `src/lib/db/exercise.ts` (8 calls)
- `src/lib/badges.ts` (5 calls)
- `src/lib/db/user.ts` (3 calls)
- `src/lib/db/preferences.ts` (3 calls)

### Plan

1. Add a `getDb(dbOrTx: DbOrTx): DrizzleDb` helper in `src/lib/db/index.ts`
2. Change all repository function signatures to accept `DbOrTx` (Drizzle db or tx), **not** raw `D1Database`
3. Update route handlers to pass `db` (already Drizzle) from `withApiContext()` instead of `d1Db`
4. Remove all inline `isTransaction` / `createDb()` boilerplate

---

## Phase 2: Fix N+1 Queries

**Effort:** ~1–2 days | **Impact:** Performance (largest latency wins)

### 2a. Server: `getAllTimeBestPRs` — per-exercise query loop

**File:** `src/lib/db/workout/repository.ts` (lines 1607–1766)

The function queries all exercises' best weight via `GROUP BY`, then **loops through each result** to fetch the set detail at max weight with a separate query. This is O(N) queries where N = number of exercises with completed sets.

**Fix:** Single query returning candidate max sets per exercise using `GROUP BY exerciseId` with `MAX(weight)`, then join back for reps/date in one pass. Alternatively, fetch all relevant sets ordered by `(exerciseId, weight DESC, reps DESC)` and take first per exercise in JS.

### 2b. Server: `getExerciseHistory` — O(n²) find loop

**File:** `src/lib/db/workout/repository.ts` (~line 475)

Uses `workoutSetsData.find(...)` inside a loop instead of pre-building a `Map<workoutId, data>`.

**Fix:** Pre-compute a `workoutId → {name, date}` map once before the loop.

### 2c. Local: `getLocalPersonalRecords` — nested workout→exercise→set loops

**File:** `src/lib/db/local-repository.ts` (lines 602–753)

Iterates through each completed workout, then queries `workoutExercises` per workout, then queries `workoutSets` per exercise. On mobile this is worse than server N+1 due to IndexedDB overhead.

**Fix:** Bulk-fetch all data in 3 queries:
1. All completed workouts for user
2. All workoutExercises for those workouts (`.where('workoutId').anyOf([...])`)
3. All workoutSets for those exercises (`.where('workoutExerciseId').anyOf([...])`)

Then group and compute PRs in pure JS.

### 2d. Local: `getAllTimeLocalBestPRs` — same nested loop pattern

**File:** `src/lib/db/local-repository.ts` (lines 771–881)

Same N+1 pattern as 2c.

**Fix:** Same bulk-fetch approach.

### 2e. Sync: `applyServerChanges` — sequential await per entity

**File:** `src/lib/sync/sync-engine.ts` (lines 323–337)

```ts
for (const { table, items } of allData) {
  for (const serverData of items) {
    await this.mergeLocalAndServer(table, serverData);  // sequential!
  }
}
```

Each merge does an IndexedDB lookup + conditional write. With hundreds of entities this serializes badly.

**Fix:** Batch operations per table — collect all items, do bulk lookups with `.where('localId').anyOf([...])`, then `bulkPut`/`bulkAdd` in a single transaction.

---

## Phase 3: Extract Shared Domain Logic

**Effort:** ~1–2 days | **Impact:** Maintainability (eliminates largest duplication)

### Problem

~500 lines of near-identical business logic exist in **both**:
- `src/lib/db/workout/repository.ts` (D1/Drizzle backend)
- `src/lib/db/local-repository.ts` (Dexie/IndexedDB backend)

Functions like PR calculation, volume aggregation, strength history, and 1RM estimation are duplicated with only the data-access layer differing. Bug fixes to one side often miss the other.

### Plan

1. Create `src/lib/domain/stats/` with pure computation functions:
   - `calculateE1RM(weight, reps)` — already exists in workout repo, extract
   - `computePersonalRecords(maxes, options)` — takes pre-fetched max data, returns PRs
   - `computeWeeklyVolume(sets, options)` — takes pre-fetched sets, returns volume data
   - `computeStrengthHistory(sets, options)` — takes pre-fetched sets, returns strength points
2. Server repository becomes: query raw data from D1 → call pure computation
3. Local repository becomes: query raw data from Dexie → call same pure computation
4. Add shared types in `src/lib/domain/stats/types.ts`

### Verification

Write snapshot/unit tests for the pure computation functions using fixture data. Run against both implementations during transition to ensure behavior parity.

---

## Phase 4: Split `workout/repository.ts`

**Effort:** ~1 day | **Impact:** Maintainability + LLM context efficiency

### Problem

`src/lib/db/workout/repository.ts` is **1766 lines** containing CRUD operations, workout history, exercise history, weekly volume, strength history, and PR calculations all in one file. This exceeds typical LLM context windows and makes targeted edits risky.

### Plan

Split into cohesive modules (do this **after Phase 3** to avoid spreading duplication):

```
src/lib/db/workout/
├── index.ts              # Re-exports (unchanged public API)
├── types.ts              # Unchanged
├── workouts.ts           # Workout CRUD + listing
├── exercises.ts          # WorkoutExercise CRUD + reorder
├── sets.ts               # WorkoutSet CRUD
├── history.ts            # Exercise history, workout history queries
└── stats.ts              # Volume, strength, PR queries (data fetching only)
```

Keep the public API in `workout/index.ts` re-exporting the same function names — no downstream churn.

---

## Phase 5: Consistency Pass

**Effort:** ~0.5 day | **Impact:** Maintainability + LLM/Agent friendliness

### 5a. Standardize module structure

`src/lib/db/exercise.ts` is a flat 266-line file with types + repository mixed together. `workout/` and `template/` use the folder pattern (`repository.ts` + `types.ts` + `index.ts`).

**Fix:** Convert `exercise.ts` to the folder pattern, or document clearly when each pattern applies.

### 5b. Standardize route validation

`src/routes/api/exercises.ts` and `workouts.ts` use Zod schemas from `src/lib/validators/`. `src/routes/api/templates.ts` POST handler does **manual inline validation** (lines 54–71) with hand-written type/length checks.

**Fix:** Add `createTemplateSchema` to `src/lib/validators/template.schema.ts` and use `validateBody()` in the templates route, matching the pattern used everywhere else.

### 5c. Add per-directory AGENTS.md files

Currently only the root `AGENTS.md` exists. LLM agents working in subdirectories have no domain-specific guidance.

**Add:**

- **`src/lib/db/AGENTS.md`** — `DbOrTx` conventions, transaction patterns, "no N+1" rule, where domain logic vs query logic lives, soft-delete pattern
- **`src/routes/api/AGENTS.md`** — `withApiContext()` usage, Zod validation requirement, error response conventions (`createApiError` + `API_ERROR_CODES`), empty component export pattern
- **`src/components/AGENTS.md`** — component conventions, Radix UI usage, Tailwind patterns, `@/` import alias

---

## Appendix: Risk Notes

| Risk | Mitigation |
|------|------------|
| PR logic behavior drift during dedup (Phase 3) | Write shared fixture tests, run against both implementations during transition |
| Sync semantics change during batch optimization (Phase 2e) | Preserve entity ordering (exercises → templates → workouts → sets) and `serverUpdatedAt > localUpdatedAt` rule |
| Breaking re-exports during god-file split (Phase 4) | Keep `workout/index.ts` re-exporting all functions, run `bun run typecheck` after each move |
| Regression in route validation (Phase 5b) | Ensure new Zod schema matches existing manual validation rules exactly (field names, max lengths) |
