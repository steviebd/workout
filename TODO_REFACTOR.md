# Refactoring Plan

## Priority 1: Unify API Route Wrapper

**Problem:** Inconsistent patterns across 50+ API routes:
- `withApiContext` imported from different modules (`~/lib/api/handler` vs `../../lib/api/context`)
- Error handling varies: `handleApiError` vs inline `console.error + createApiError`
- Request parsing varies: `validateBody` vs raw `await request.json()` with ad-hoc checks
- Query parsing varies: `parseQueryParams` vs manual `url.searchParams.get(...)`
- Inline Zod schemas in some routes (`workout-exercises.ts`), no Zod at all in others (`workout-sets.ts`)

**Action:**
- [ ] Create a single `apiRoute()` wrapper in `~/lib/api/api-route.ts` that handles context, auth, and error catching
- [ ] Create shared `parseQuery(schema)` and `parseBody(schema)` helpers (both Zod-based)
  - `parseBody(schema)` replaces both `validateBody` (from `route-helpers.ts`) and raw `request.json()` calls
  - `parseQuery(schema)` replaces `parseQueryParams` and manual `url.searchParams.get(...)` calls
  - Both should throw `ApiError(400)` on failure instead of returning `null`
- [ ] Move all inline schema definitions into `~/lib/validators/` (e.g. `workout-exercises.ts` defines schemas inline)
- [ ] Migrate all 50+ routes to use the unified wrapper
- [ ] Remove `validateBody` from `route-helpers.ts` once fully migrated

**Current state (for reference):**
- `validateBody` in `route-helpers.ts` — Zod-based but returns `null` on failure (no error details)
- Routes using `validateBody`: `exercises.ts`, `workouts.ts`, `workouts.$id.ts`, `templates.ts`, `workout-exercises.ts`
- Routes using raw `request.json()`: `workout-sets.ts`, `program-cycles.ts`, `templates.$id.ts`, `workouts.$id.exercises.ts`, `analytics/track.ts`
- Routes using `parseQueryParams`: `exercises.ts`, `workouts.ts`

```ts
// lib/api/api-route.ts
export function apiRoute(name: string, fn: (ctx: ApiCtx) => Promise<Response>) {
  return async ({ request }: { request: Request }) => {
    try {
      const ctx = await withApiContext(request);
      return await fn(ctx);
    } catch (err) {
      return handleApiError(err, name);
    }
  };
}

// lib/api/parse.ts
export async function parseBody<T>(request: Request, schema: ZodSchema<T>): Promise<T> {
  const body = await request.json();
  const result = schema.safeParse(body);
  if (!result.success) {
    throw new ApiError('Invalid request body', 400, API_ERROR_CODES.VALIDATION_ERROR);
  }
  return result.data;
}

export function parseQuery<T>(url: URL, schema: ZodSchema<T>): T {
  const params = Object.fromEntries(url.searchParams);
  const result = schema.safeParse(params);
  if (!result.success) {
    throw new ApiError('Invalid query parameters', 400, API_ERROR_CODES.VALIDATION_ERROR);
  }
  return result.data;
}
```

---

## Priority 2: Consolidate DB Layer Organization

**Problem:** Both flat files and folders exist for the same domain:
- `src/lib/db/exercise.ts` re-exports `./exercise/index`
- `src/lib/db/exercise/index.ts` exports `types` + `repository`
- Same duplication for `template.ts` / `template/`
- `workout/index.ts` and `workout/repository.ts` both barrel-export the same things

**Action:**
- [ ] Keep folder convention only: `lib/db/exercise/{repository.ts, types.ts, index.ts}`
- [ ] Remove flat re-export files: `exercise.ts`, `template.ts`, `workout.ts`
- [ ] Update all imports to use `~/lib/db/exercise` (folder index)
- [ ] Clean up redundant barrel exports inside `workout/`
- [ ] Do one domain at a time (exercise → template → workout), run typecheck after each

---

## Priority 3: Shared Repository Helpers

**Problem:** Repeated patterns copy-pasted across repositories:
- Ownership filters: `eq(table.workosId, workosId)` in every query
- Soft-delete: `eq(table.isDeleted, false)` + `set({ isDeleted: true, updatedAt: now })`
- `updatedAt` stamping: `new Date().toISOString()` everywhere instead of reusing `nowISO()`
- List endpoints repeat sorting/limit/offset logic with `(query as any)` casts

**Action:**
- [ ] Create `~/lib/db/helpers.ts` with shared utilities:
  - `nowISO()` — reuse existing from schema, stop inlining `new Date().toISOString()`
  - `applyPagination(query, { limit, offset })`
  - `applySort(query, sortBy, sortOrder, columnsMap)`
- [ ] **Keep soft-delete domain-specific** — each domain already has its own `softDeleteExercise`, `softDeleteTemplate`, `softDeleteProgramCycle` with identical patterns but domain-specific tables and program uses `status: 'deleted'` instead of `isDeleted: true`. The inconsistent soft-delete mechanisms make a generic helper fragile. Leave as-is.
- [ ] Refactor repositories to use `nowISO()`, `applyPagination`, `applySort` helpers
- [ ] Enforce pattern: every repo function that reads/writes user-owned rows must accept `workosId`

---

## Priority 4: Service Layer for Workflows

**Problem:** API routes contain business logic + DB queries directly:
- `/api/workouts` GET builds complex queries inline
- `/api/workout-sets` does ownership joins in the route
- `/api/sync` has multi-step sync logic in the route handler
- Some workflows exist in DB layer (e.g., `createWorkoutWithDetails`), others live in routes

**Action:**
- [ ] Create `~/lib/services/` for multi-step operations:
  - `workout-service.ts` — `createWorkoutFromTemplate()`, completion logic
  - `sync-service.ts` — `syncPull()`, `syncPush()`
  - `set-service.ts` — `createSetWithOwnershipCheck()`
- [ ] Routes become thin: parse input → call service → return JSON
- [ ] Existing repository functions stay as pure data access

---

## Priority 5: Split God Files

**Problem:** Many files do too much (data fetching, state management, undo/redo, autosave, UI).

**Large route files (by line count):**
| File | Lines |
|------|-------|
| `programs.$slug.start.tsx` | 867 |
| `progress.tsx` | 750 |
| `workouts.$id.tsx` | 681 |
| `workouts.$id_.edit.tsx` | 627 |
| `templates.$id.edit.tsx` | 590 |
| `workouts.$id_.summary.tsx` | 570 |
| `programs.cycle.$cycleId_.tsx` | 543 |

**Large components:**
| File | Lines |
|------|-------|
| `TemplateEditor.tsx` | 787 |
| `ExerciseSearch.tsx` | 406 |

**Large hooks:**
| File | Lines |
|------|-------|
| `useActiveWorkout.ts` | 516 |
| `useAutoSave.ts` | 183 |

### `TemplateEditor.tsx` (787 lines)
- [ ] Extract `useTemplateEditorState` — form state + undo/redo + validation
- [ ] Extract `useTemplateApi` — fetch/save/sync API calls
- [ ] Keep component as presentational orchestrator

### `workouts.$id.tsx` (681 lines)
- [ ] Extract `useWorkoutSession(workoutId)` — data + mutations
- [ ] Keep route component lean (just UI)

### `useActiveWorkout.ts` (516 lines)
- [ ] Extract pure functions: `mapLocalToActiveWorkout`, `getActiveWorkoutWithDetails`
- [ ] Split commands into separate files: `workoutCommands.ts`, `exerciseCommands.ts`, `setCommands.ts`, `reorderCommands.ts`
- [ ] Keep hook as thin orchestrator wiring commands + state

### `programs.$slug.start.tsx` (867 lines)
- [ ] Extract program setup logic into a `useProgramSetup` hook
- [ ] Extract UI sections into sub-components

### `progress.tsx` (750 lines)
- [ ] Extract chart data fetching into dedicated hooks
- [ ] Extract each chart section into its own component (already partially done with `progress/` folder)

### `workouts.$id_.edit.tsx` (627 lines) / `workouts.$id_.summary.tsx` (570 lines)
- [ ] Extract shared workout data hooks
- [ ] Move form logic into dedicated hooks

---

## Priority 6: Naming Consistency

**Problem:** Mixed conventions across the codebase:
- Hook files: `use-mobile.ts` (kebab) vs `useActiveWorkout.ts` (camelCase)
- API routes: `.ts` vs `.tsx` extensions (most return `null` component, don't need TSX)
- Context variables: `db` vs `d1Db` used inconsistently

**Action:**
- [ ] Rename `use-mobile.ts` → `useIsMobile.ts` (match camelCase convention)
- [ ] Convert API route files from `.tsx` to `.ts` where no JSX is used
- [ ] **Keep both `db` and `d1Db`** — they serve different purposes:
  - `db` = Drizzle instance (`createDb(d1Db)`) — used for ORM queries
  - `d1Db` = raw D1 binding — needed by repositories that accept `D1Database` directly (all Whoop integration routes, program-cycles, streaks, badges, exercises, workouts, etc.)
  - Most routes destructure `d1Db` from `withApiContext()` and pass it to repository functions. Only a few use the Drizzle `db` directly.
  - **Consider renaming for clarity:** `d1` instead of `d1Db` to be less redundant, but keep both variables in context

---

## Priority 7: Remove Legacy Validation Utilities

**Problem:** `src/lib/validation.ts` contains `isValidEmail`, `isStrongPassword`, `trimObject` that appear unused now that Zod schemas handle validation. Routes still manually call `.trim()` on fields.

**Action:**
- [ ] Verify `validation.ts` exports are unused and delete the file
- [ ] Add `.trim()` transforms to Zod schemas instead of trimming in routes
- [ ] Consolidate all validation into `~/lib/validators/`
