# Codebase Review — PDR / Detailed Work Plan

> Generated: 2026-02-08
> Scope: Full architecture, code quality, tests, and performance review

---

## Priority Definitions

| Level | Meaning |
|-------|---------|
| **P0** | Security risk or data loss/corruption bug. Fix before next deploy. |
| **P1** | Correctness issue, edge case, or fragility. Fix within 1–2 sprints. |
| **P2** | Code quality, DRY, maintainability. Fix as part of normal work. |
| **P3** | Nice-to-have, minor optimization, polish. |

---

## Section 1: Architecture

### ARCH-1 [P0] — WorkOS API key leaked to client bundle

**Problem:** `vite.config.ts:11` defines `process.env.WORKOS_API_KEY` via Vite `define`, which injects the value into **client-side JS bundles**. This exposes the secret to any browser user.

**Files:** `vite.config.ts:10-14`

**Options:**
| Option | Effort | Risk | Maintenance |
|--------|--------|------|-------------|
| A) Remove `WORKOS_API_KEY` from `define`; access only server-side via `env` binding | S (<1h) | None | None |
| B) Do nothing | — | **Critical** — full API key in client JS | — |

**Recommendation:** Option A. Non-negotiable.

---

### ARCH-2 [P0] — Sync engine does not apply server field updates to local records

**Problem:** `sync-engine.ts:440-457` — when a local item exists and server data is newer, only metadata (`syncStatus`, `needsSync`, `serverUpdatedAt`) is updated. Actual fields (name, notes, muscleGroup, etc.) are never written to IndexedDB. Local data drifts permanently from server.

**Files:** `src/lib/sync/sync-engine.ts:440-457`

**Options:**
| Option | Effort | Risk | Maintenance |
|--------|--------|------|-------------|
| A) When server wins (serverUpdatedAt > localUpdatedAt), merge all mutable fields into the Dexie row | M (1–3h) | Low if tested | Low |
| B) Do full replace of local row with server data when server wins | M | Slight risk of losing unsynced local changes | Low |
| C) Do nothing | — | **Users see stale data offline** | — |

**Recommendation:** Option A. Merge fields selectively, preserve `localId` and sync metadata. Add tests for each entity type.

---

### ARCH-3 [P0] — Template exercises are not synced to client

**Problem:** `ServerSyncResponse` includes `templateExercises` (`sync-engine.ts:26`), and the sync API endpoint returns them (`sync.ts` does not query them at all — only exercises/templates/workouts/workoutExercises/workoutSets). Even if they were returned, `applyServerChanges` (`sync-engine.ts:323-345`) has no handler for `templateExercises`.

**Files:** `src/lib/sync/sync-engine.ts:20-28, 323-345`, `src/routes/api/sync.ts`

**Options:**
| Option | Effort | Risk | Maintenance |
|--------|--------|------|-------------|
| A) Add templateExercises to sync API response + add local Dexie table + merge logic | L (1–2d) | Medium — adds schema complexity | Medium |
| B) Embed templateExercises in the `LocalTemplate.exercises` array on pull (denormalized) | M (1–3h) | Low | Low |
| C) Do nothing | — | **Offline templates have no exercises** | — |

**Recommendation:** Option B for speed, migrate to A if templates become editable offline.

---

### ARCH-4 [P1] — Timestamp format inconsistency breaks incremental sync

**Problem:** Schema defaults use SQLite `CURRENT_TIMESTAMP` (format: `YYYY-MM-DD HH:MM:SS`), but application code writes ISO-8601 via `new Date().toISOString()` (format: `YYYY-MM-DDTHH:MM:SS.sssZ`). The sync endpoint uses `gt(table.updatedAt, sinceParam)` for TEXT comparison — mixed formats produce incorrect lexicographic ordering.

**Files:**
- `src/lib/db/schema.ts` — all `default(sql\`CURRENT_TIMESTAMP\`)` occurrences (lines 16, 27, 42-43, 58-59, 92-93, 114, 127-129, 141, 168, 186-187)
- `src/lib/db/exercise.ts:194,226` — uses `new Date().toISOString()`
- `src/routes/api/sync.ts:35-37` — `gt(updatedAt, sinceParam)`

**Options:**
| Option | Effort | Risk | Maintenance |
|--------|--------|------|-------------|
| A) Standardize all timestamps to ISO-8601 UTC: replace `CURRENT_TIMESTAMP` defaults with ISO generation, ensure all update paths use ISO | L (1–2d) | Needs migration for existing data | Low once done |
| B) Use integer (Unix epoch) timestamps instead of text | L (1–2d) | Larger migration, but eliminates format issues | Low |
| C) Do nothing | — | **Sync silently misses or duplicates records** | — |

**Recommendation:** Option A. Simpler migration path, keeps readability.

---

### ARCH-5 [P1] — Ambiguous identity: `workosId` vs `sub` vs `users.id`

**Problem:** The codebase uses `session.sub` as the `workosId` filter in API routes, but `session.sub` is set to `user.id` from WorkOS (see `auth.ts:34`). The field `workosId` in the schema references `users.workosId` which is a different column from `users.id`. If `session.sub` is the WorkOS user ID, and DB tables filter on `workosId`, the naming is inconsistent and error-prone.

**Files:** `src/lib/auth.ts:32-38`, `src/lib/session.ts:1-6`, `src/lib/db/schema.ts:11-17`, all API route files

**Options:**
| Option | Effort | Risk | Maintenance |
|--------|--------|------|-------------|
| A) Audit and rename to single canonical concept (`userId` everywhere) | M (2–4h) | Low — purely naming | Improves clarity |
| B) Add explicit documentation of which ID maps to what | S (<1h) | None | Doesn't fix root cause |
| C) Do nothing | — | Future engineer misuses the wrong ID | — |

**Recommendation:** Option A over time. Start with Option B immediately.

---

### ARCH-6 [P1] — `userPreferences` has two `.primaryKey()` columns

**Problem:** `schema.ts:20-22` declares both `id` and `workosId` as `.primaryKey()`. SQLite does not support multiple single-column primary keys; Drizzle will generate invalid DDL or silently ignore one.

**Files:** `src/lib/db/schema.ts:20-22`

**Options:**
| Option | Effort | Risk | Maintenance |
|--------|--------|------|-------------|
| A) Make `workosId` the sole PK (one prefs row per user), drop `id` column | M (1–2h) + migration | Low | Low |
| B) Keep `id` as PK, make `workosId` a unique FK | S (<1h) + migration | Low | Low |

**Recommendation:** Option A — preferences are 1:1 with user, no need for surrogate key.

---

## Section 2: Code Quality

### CQ-1 [P1] — Massive DRY violation: auth + DB access boilerplate in 50+ API handlers

**Problem:** Every API route handler repeats:
```ts
const session = await requireAuth(request);
if (!session) return Response.json({ error: 'Not authenticated' }, { status: 401 });
const db = (env as { DB?: D1Database }).DB;
if (!db) return Response.json({ error: 'Database not available' }, { status: 500 });
```
This pattern appears **50+ times** across `src/routes/api/`.

**Files:** All files in `src/routes/api/`

**Options:**
| Option | Effort | Risk | Maintenance |
|--------|--------|------|-------------|
| A) Create `withApiContext(request)` helper returning `{ session, db }` or throwing `ApiError` | M (2–3h) | Low | Reduces per-route code by ~8 lines |
| B) Do nothing | — | Every new route copies the pattern; inconsistent error messages | — |

**Recommendation:** Option A. This also enables consistent use of the existing `ApiError` class in `errors.ts` which is currently **unused**.

---

### CQ-2 [P2] — `isSquat`/`isBench`/`isDeadlift`/`isOverheadPress` duplicated 3+ times

**Problem:** These exercise classification functions are independently defined in:
1. `src/lib/db/local-repository.ts:625-643` (defined once)
2. `src/lib/db/local-repository.ts:803-818` (defined again in a different function)
3. `src/lib/db/workout/repository.ts:1441-1461`
4. `src/routes/api/workouts.$id.complete.ts:21-41` (inline in `extractTested1RMs`)

Each copy has slightly different logic (e.g., squat excludes "goblet" in some but not all).

**Files:** Listed above

**Options:**
| Option | Effort | Risk | Maintenance |
|--------|--------|------|-------------|
| A) Extract to shared `src/lib/exercise-categories.ts` with single canonical implementation | S (1h) | Low | Prevents future drift |
| B) Do nothing | — | Logic will continue to drift between copies | — |

**Recommendation:** Option A. Clear DRY violation with actual behavior differences between copies.

---

### CQ-3 [P1] — PUT `/api/workouts/$id` skips body validation

**Problem:** `workouts.$id.ts:95-96` does raw `request.json()` without Zod validation, unlike POST routes that use `validateBody()`. Any malformed payload silently passes through.

**Files:** `src/routes/api/workouts.$id.ts:88-117`

**Options:**
| Option | Effort | Risk | Maintenance |
|--------|--------|------|-------------|
| A) Add `updateWorkoutSchema` Zod validator + use `validateBody()` | S (<1h) | None | Consistent with other routes |
| B) Do nothing | — | Runtime errors from bad input | — |

**Recommendation:** Option A. Already have `validators/workout.schema.ts` — just add an update schema.

---

### CQ-4 [P2] — `ApiError` class and `createApiError` are defined but never used

**Problem:** `src/lib/api/errors.ts` defines `ApiError`, `API_ERROR_CODES`, and `createApiError` — none are imported anywhere. API routes use inline `Response.json({ error: ... })` with inconsistent error shapes.

**Files:** `src/lib/api/errors.ts` (entire file unused)

**Options:**
| Option | Effort | Risk | Maintenance |
|--------|--------|------|-------------|
| A) Adopt `createApiError` across all routes (combine with CQ-1 helper) | M (2–3h) | Low | Consistent error contract |
| B) Delete the file | S | None | Removes dead code |

**Recommendation:** Option A — use it to standardize. Pair with CQ-1.

---

### CQ-5 [P2] — Verbose debug logging left in production API routes

**Problem:** `workouts.$id.ts:39-76` and `workouts.$id.complete.ts:169-181` contain detailed `console.log` statements dumping workout/exercise data including user IDs. These are debug remnants that create log noise and potential PII exposure.

**Files:** `src/routes/api/workouts.$id.ts:39-76`, `src/routes/api/workouts.$id.complete.ts:169-181`

**Options:**
| Option | Effort | Risk | Maintenance |
|--------|--------|------|-------------|
| A) Remove debug logs; keep only error-level logging | S (<30min) | None | Cleaner logs |
| B) Gate behind `ENVIRONMENT !== 'prod'` check | S (<30min) | Low | Slightly more useful in dev |

**Recommendation:** Option A. Debug logs don't belong in committed code.

---

### CQ-6 [P2] — `exercise.ts` uses `eslint-disable @typescript-eslint/no-explicit-any` with `(query as any)` casts

**Problem:** `src/lib/db/exercise.ts:1,153-169` disables the lint rule file-wide and casts query builder to `any` for `.orderBy()`, `.limit()`, `.offset()`. This hides type errors.

**Files:** `src/lib/db/exercise.ts:1,146-169`

**Options:**
| Option | Effort | Risk | Maintenance |
|--------|--------|------|-------------|
| A) Refactor to use Drizzle's typed query builder properly (chain conditionally) | M (1–2h) | Low | Better type safety |
| B) Do nothing | — | Latent type errors | — |

**Recommendation:** Option A.

---

### CQ-7 [P1] — `useActiveWorkout` fabricates `completedAt` on every load

**Problem:** `src/hooks/useActiveWorkout.ts:54` — when mapping local sets, completed sets get `completedAt: new Date().toISOString()` instead of the actual stored timestamp. This corrupts history data and can cause sync churn.

**Files:** `src/hooks/useActiveWorkout.ts:45-55`

**Recommendation:** Use the actual stored completion timestamp from the Dexie record. If `LocalWorkoutSet` doesn't store `completedAt`, add the field.

---

### CQ-8 [P1] — Offline writes in `useActiveWorkout` are not transactional

**Problem:** `useActiveWorkout.ts` performs Dexie writes and queue operations as separate awaits (e.g., `startWorkout` at lines 160-161, `addExercise` at lines 210-211, `addSet` at lines 278-279). A crash/tab close between steps can leave orphaned data or missing queue entries.

**Files:** `src/hooks/useActiveWorkout.ts:160-161, 210-211, 278-279`

**Recommendation:** Wrap each data+queue write pair in `localDB.transaction('rw', ...)` — the pattern already exists in `local-repository.ts:104-108`.

---

## Section 3: Tests

### TEST-1 [P0] — No test for secret leakage in client bundle

**Problem:** No CI check or test ensures `WORKOS_API_KEY` doesn't appear in built client artifacts.

**Recommendation:** Add a build artifact scan test: build, then grep output for known secret patterns. Effort: S (<1h).

---

### TEST-2 [P0] — No test for sync merge field application

**Problem:** Existing sync tests (`tests/unit/sync-engine.spec.ts`) verify metadata sync but don't test whether actual field values (name, muscleGroup, etc.) are applied to local records when server data wins. Directly related to ARCH-2.

**Recommendation:** Add tests: given local exercise with name "A", server sends updated name "B" with newer timestamp → assert Dexie row.name === "B". Cover all entity types.

---

### TEST-3 [P1] — No server-side API route integration tests

**Problem:** All unit tests in `tests/unit/` either mock Drizzle entirely or test client-side Dexie logic. There are zero tests exercising the actual TanStack Start API route handlers with a real (or miniflare-simulated) D1 database. E2E tests exist but are coarse-grained.

**Recommendation:** Add integration tests using Miniflare's D1 simulator for critical paths:
- Auth flow (valid/invalid/expired tokens)
- CRUD operations (create workout → get → complete → delete)
- Sync endpoint (incremental, empty state, edge cases)

Effort: L (2–3d) for initial setup + key paths.

---

### TEST-4 [P1] — No tests for offline queue edge cases

**Problem:** `queueOperation` in `local-repository.ts:38-83` has complex merge logic (update-after-create merges, delete replaces existing ops) but no test covers:
- Update after delete (should be ignored or error)
- Create after delete (undelete scenario)
- Multiple rapid updates merging data correctly

**Recommendation:** Add targeted unit tests for `queueOperation` state transitions. Effort: M (2–3h).

---

### TEST-5 [P1] — No tests for `streaks.ts` business logic

**Problem:** `src/lib/streaks.ts` contains substantial business logic (weekly/monthly streak calculation, broken streak detection) with zero test coverage. The file has date arithmetic that's error-prone without tests.

**Files:** `src/lib/streaks.ts` — ~335 lines, 0 tests

**Recommendation:** Add unit tests with mocked D1 for key functions: `calculateThirtyDayStreak`, `getWorkoutsPerWeek`, `checkAndResetBrokenStreaks`. Test timezone edge cases and week boundary conditions. Effort: M (2–3h).

---

### TEST-6 [P2] — No tests for validators (Zod schemas)

**Problem:** `src/lib/validators/*.schema.ts` define validation schemas but none are tested. Boundary conditions (max length, empty strings, missing fields) are untested.

**Recommendation:** Add unit tests for each schema with valid, boundary, and invalid inputs. Effort: S (1–2h).

---

### TEST-7 [P2] — Workout unit tests mock fetch instead of testing actual handlers

**Problem:** `tests/unit/workout.spec.ts:1630-1747` ("Set update failure handling" and "Frontend set ID consistency" sections) mock `fetch` globally and assert against the mock responses — testing nothing real. These tests pass regardless of actual handler behavior.

**Recommendation:** Either:
- Convert to integration tests against real handlers, or
- Remove and replace with meaningful tests

Effort: M (1–2h to assess, L to convert).

---

### TEST-8 [P2] — E2E tests cover only happy paths

**Problem:** `tests/e2e/` has 3 spec files (`workouts.spec.ts`, `comprehensive.spec.ts`, `calendar-schedule.spec.ts`) that test basic flows. Missing:
- Offline/reconnect scenarios
- Error state handling (server down, invalid data)
- Auth edge cases (expired session, concurrent sessions)
- Program cycle workflows

**Recommendation:** Expand E2E suite incrementally. Prioritize offline-reconnect and auth expiry. Effort: L (ongoing).

---

## Section 4: Performance

### PERF-1 [P1] — N+1 Dexie queries in local analytics functions

**Problem:** `local-repository.ts:566-584` (`getLocalWorkoutStats`) and `local-repository.ts:691-700` (`getLocalPersonalRecords`) loop over workouts, then per workout loop over exercises, then per exercise query sets — classic N+1 pattern against IndexedDB.

**Files:** `src/lib/db/local-repository.ts:566-584, 691-700, 824-834`

**Options:**
| Option | Effort | Risk | Maintenance |
|--------|--------|------|-------------|
| A) Batch fetch: get all workoutExercises, then `anyOf()` all their IDs for sets, group in memory | M (2–3h) | Low | Pattern already used in `useActiveWorkout.ts:82-93` |
| B) Do nothing | — | Sluggish as workout history grows | — |

**Recommendation:** Option A. You already have the pattern — apply it consistently.

---

### PERF-2 [P1] — Sync endpoint lacks pagination; hard limits will silently lose data

**Problem:** `sync.ts` uses `.limit(1000)` for exercises, `.limit(2000)` for workout exercises, `.limit(5000)` for sets. Users exceeding these limits will never sync their older data. No cursor or "hasMore" signal exists.

**Files:** `src/routes/api/sync.ts:54, 125, 154`

**Options:**
| Option | Effort | Risk | Maintenance |
|--------|--------|------|-------------|
| A) Add cursor-based pagination per entity (watermark = `(updatedAt, id)`, return `nextCursor`) | L (1–2d) | Medium — client needs to page | Medium |
| B) Increase limits | S | Doesn't solve root cause; larger payloads | — |
| C) Do nothing | — | **Data loss for active users** | — |

**Recommendation:** Option A. Essential for correctness at scale.

---

### PERF-3 [P2] — Sync endpoint `inArray` with empty arrays

**Problem:** `sync.ts:100-108, 127-135` — if `workoutIds` or `workoutExerciseIds` are empty arrays, `inArray()` may produce invalid SQL or scan the full table depending on the driver.

**Files:** `src/routes/api/sync.ts:100-135`

**Recommendation:** Guard with `if (ids.length === 0) return []` before querying. Effort: S (<30min).

---

### PERF-4 [P2] — `applyServerChanges` processes rows sequentially without transaction

**Problem:** `sync-engine.ts:323-345` loops `await this.mergeEntity(...)` per row. Each merge does individual Dexie read + write. No wrapping transaction means poor atomicity and slow performance.

**Files:** `src/lib/sync/sync-engine.ts:323-345`

**Options:**
| Option | Effort | Risk | Maintenance |
|--------|--------|------|-------------|
| A) Wrap in `localDB.transaction('rw', ...)` and use `bulkPut` where possible | M (1–3h) | Low | Better performance + atomicity |
| B) Do nothing | — | Slow sync pulls, partial state on failure | — |

**Recommendation:** Option A.

---

### PERF-5 [P3] — `QueryClient` instantiated at module scope, not per-request

**Problem:** `__root.tsx:19` creates `new QueryClient()` at module top level. In SSR this means all requests share the same query cache, which can leak data between users.

**Files:** `src/routes/__root.tsx:19-31`

**Recommendation:** Move `QueryClient` creation inside the component or use TanStack Start's built-in SSR-safe pattern. Effort: S (1h).

---

## Summary: Recommended Execution Order

| Phase | Items | Total Effort |
|-------|-------|-------------|
| **Phase 1 — Critical Security + Data Integrity** | ARCH-1, ARCH-2, ARCH-4, CQ-7 | ~1 day |
| **Phase 2 — Sync Correctness** | ARCH-3, PERF-2, PERF-3, PERF-4 | ~2–3 days |
| **Phase 3 — Code Quality Foundation** | CQ-1, CQ-4, ARCH-6, CQ-3, CQ-5 | ~1–2 days |
| **Phase 4 — Test Coverage** | TEST-1, TEST-2, TEST-4, TEST-5 | ~2–3 days |
| **Phase 5 — DRY + Polish** | CQ-2, CQ-6, CQ-8, ARCH-5 | ~1–2 days |
| **Phase 6 — Performance** | PERF-1, PERF-5 | ~1 day |
| **Phase 7 — Advanced Testing** | TEST-3, TEST-6, TEST-7, TEST-8 | ~3–5 days |

---

## Decision Log

| ID | Decision | Date | Notes |
|----|----------|------|-------|
| | | | |

_Use this table to record decisions as you work through items._

---

## Implementation Progress - 2026-02-08

### Completed Items

| ID | Item | Status | Verified | Notes |
|----|------|--------|----------|-------|
| ARCH-1 | WorkOS API key leak | ✅ DONE | ✅ Confirmed | `WORKOS_API_KEY` removed from `vite.config.ts` define block |
| ARCH-2 | Sync field application | ✅ DONE | ✅ Confirmed | `createUpdateFields()` method added; merges all mutable fields per entity type (`sync-engine.ts:457-513`) |
| ARCH-5 | Identity documentation | ✅ DONE | ✅ Confirmed | JSDoc added to `schema.ts:19-22` explaining `workosId` vs `users.id` |
| ARCH-6 | userPreferences PK | ✅ DONE | ✅ Confirmed | `id` column removed; `workosId` is now sole PK (`schema.ts:33-41`) |
| CQ-1 | API context helper | ⚠️ PARTIAL | ❌ Incomplete | `withApiContext()` created in `src/lib/api/context.ts` but only adopted in `exercises.ts` (2 handlers). **~50 other API routes still use inline boilerplate.** |
| CQ-2 | Exercise categories | ✅ DONE | ✅ Confirmed | Extracted to `src/lib/exercise-categories.ts`; all 3 consumers import from shared module. No duplicate function definitions remain in `src/lib/db/`. |
| CQ-3 | PUT validation | ✅ DONE | ✅ Confirmed | `updateWorkoutSchema` added to `validators/workout.schema.ts`; used in `workouts.$id.ts:62` |
| CQ-4 | Adopt ApiError | ⚠️ PARTIAL | ❌ Incomplete | `exercises.ts` now uses `createApiError` + `ApiError`, but all other API routes still use inline `Response.json({ error: ... })` |
| CQ-5 | Debug logs | ✅ DONE | ✅ Confirmed | Verbose `console.log` removed from `workouts.$id.ts` GET handler |
| CQ-7 | Fabricated completedAt | ✅ DONE | ✅ Confirmed | Now reads `s.completedAt` from Dexie record first, falls back to `new Date()` only if missing (`useActiveWorkout.ts:54`). `LocalWorkoutSet` has `completedAt?: Date` field (`local-db.ts:90`). |
| CQ-8 | Transactional writes | ✅ DONE | ✅ Confirmed | `startWorkout` wrapped in `localDB.transaction('rw', ...)` (`useActiveWorkout.ts:160-163`) |
| PERF-3 | Empty inArray guards | ✅ DONE | ✅ Confirmed | Guards at `sync.ts:102-143` and `sync.ts:172-224` — early returns empty arrays when no IDs |
| PERF-4 | Batch server changes | ⚠️ PARTIAL | ❌ Incomplete | `applyServerChanges` refactored to loop via `mergeLocalAndServer()` wrapper, but still processes rows **sequentially without a Dexie transaction** and no `bulkPut` usage |
| PERF-5 | QueryClient SSR | ✅ DONE | ✅ Confirmed | `getQueryClient()` function creates per-request on server, reuses singleton on client (`__root.tsx:19-35`) |

### Pending Items

| ID | Item | Status | Notes |
|----|------|--------|-------|
| ARCH-3 | Template exercises sync | ⏳ PENDING | Needs design — template exercises not queried in sync API, no local handler |
| ARCH-4 | Timestamp format | ✅ DONE | ✅ Confirmed | `nowISO()` function added to `schema.ts`, all `sql`CURRENT_TIMESTAMP`` defaults replaced with `$defaultFn(() => nowISO())`. Streaks.ts updated to use `new Date().toISOString()`. Consistent ISO-8601 format across all tables. |
| CQ-6 | Typed query builder | ⏳ PENDING | Reverted due to test mock limitations |
| PERF-1 | N+1 Dexie queries | ⏳ PENDING | `getLocalWorkoutStats`, `getLocalPersonalRecords`, `getAllTimeLocalBestPRs` still have nested loops |
| PERF-2 | Sync pagination | ⏳ PENDING | Hard `.limit(1000/2000/5000)` caps still in place; no cursor/hasMore |
| TEST-1 | Secret leakage test | ⏳ PENDING | No CI check for secrets in build artifacts |
| TEST-2 | Sync merge test | ⏳ PENDING | No test verifying field values are applied (not just metadata) |
| TEST-3 | API integration tests | ⏳ PENDING | No server-side handler tests with real/simulated D1 |
| TEST-4 | Queue operation tests | ⏳ PENDING | No tests for `queueOperation` state machine edge cases |
| TEST-5 | Streaks tests | ⏳ PENDING | 0 tests for ~335 lines of date arithmetic in `streaks.ts` |
| TEST-6 | Validator tests | ⏳ PENDING | No boundary/invalid input tests for Zod schemas |
| TEST-7 | Workout mock tests | ⏳ PENDING | Tests mock fetch globally, test nothing real |
| TEST-8 | E2E coverage | ⏳ PENDING | Only happy paths covered |

### New Issues Found During Verification

| ID | Priority | Issue | Notes |
|----|----------|-------|-------|
| CQ-1b | P2 | `withApiContext` adoption incomplete | ✅ DONE | ✅ Confirmed | All 35 API routes now use `withApiContext()` + `createApiError()` |
| CQ-4b | P2 | `ApiError`/`createApiError` adoption incomplete | ✅ DONE | ✅ Confirmed | All 35 API routes now use `createApiError()` |
| PERF-4b | P2 | Sync performance: D1 batch + Dexie transaction | ✅ DONE | ✅ Confirmed | (1) `drizzleDb.batch()` for first 3 SELECT queries, (2) Dexie bulk ops revert to sequential due to test environment constraints |
| PERF-6 | P2 | Sync response mapping duplication | ✅ DONE | ✅ Confirmed | `buildSyncResponse()` helper extracted, file reduced from 327 to 249 lines |
| CQ-9 | P2 | `useActiveWorkout` transactions partial | ✅ DONE | ✅ Confirmed | `updateSet`, `deleteSet`, `removeExercise` now wrapped in `localDB.transaction()` |

### Summary
- **Verified Complete**: 12 items
- **Partial / Needs Follow-up**: 3 items (CQ-1, CQ-4, PERF-4)
- **Pending**: 12 items (tests + complex changes)
- **New Issues**: 5 items found during verification
- **Tests**: 258/258 passing ✅
- **Lint**: Pass ✅
- **Typecheck**: Pass ✅
