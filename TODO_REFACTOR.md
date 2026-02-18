# Refactoring Plan

## 🔴 Priority 1 — High-Impact, Low-Risk

### 1. Consolidate API Handler Abstractions

Three overlapping patterns exist that all do auth + error handling, but none are used — every route inlines `try/catch` with `withApiContext` + `handleApiError` instead.

| File | Abstraction | Status |
|------|------------|--------|
| `lib/api/api-handler.ts` | `createApiHandler()` | **Dead code** (0 imports) |
| `lib/api/api-route.ts` | `apiRoute()` | **Dead code** (0 imports) |
| `lib/api/handler.ts` | `withApiHandler()` | **Dead code** (0 imports) |

**Action:**
- [ ] Adopt `apiRoute()` / `apiRouteWithParams()` as the single pattern (handles context + error wrapping in one call)
- [ ] Migrate all eligible API routes from inline `try/catch` to `apiRoute()` or `apiRouteWithParams()`
- [ ] Delete `api-handler.ts` and `withApiHandler()` from `handler.ts`
- [ ] Move remaining utilities (`handleApiError`, `parseQueryParams`, `parseAndValidateQueryParams`) into `handler.ts` as internal helpers

**Routes that cannot use `apiRoute()`** (3 valid exclusions):

| Route | Reason |
|-------|--------|
| `programs.ts` | No auth required — returns static program data |
| `analytics/track.ts` | No auth required — accepts anonymous events |
| `integrations.whoop.callback.ts` | OAuth callback with 302 redirects, cookie parsing, multi-step token exchange |

**Routes that should still be migrated** (they do the same auth+DB setup as `withApiContext`):

| Route | Uses | Migrate to |
|-------|------|-----------|
| `health.data.ts` | `getSession` + `env.DB` | `apiRoute()` — identical to `withApiContext` |
| `integrations.whoop.connect.ts` | `getSession` (no DB) | `apiRoute()` — ignore `db` param, or add an `apiRouteAuthOnly()` variant |
| `user.preferences.ts` | `requireAuth` + `env.DB` + `createDb` | `apiRoute()` — exact match |
| `program-cycles.$id.current-workout.ts` | `requireAuth` + `env.DB` + `createDb` | `apiRouteWithParams()` — needs `params.id` |
| `program-cycles.$id.start-workout.ts` | `requireAuth` + `env.DB` + `createDb` | `apiRouteWithParams()` — needs `params.id` |

### 2. Eliminate Duplicate Components

| Component | `src/components/` (top-level) | `src/components/exercises/` |
|-----------|------|------|
| `ExerciseList.tsx` | 342 lines (drag+drop, swipe) | 15 lines (simple wrapper) |
| `ExerciseSearch.tsx` | 406 lines (fuzzy search, create) | 24 lines (basic input) |

The `exercises/` versions have zero imports anywhere in the codebase.

**Action:**
- [ ] Delete `src/components/exercises/ExerciseList.tsx`
- [ ] Delete `src/components/exercises/ExerciseSearch.tsx`
- [ ] Move the top-level `ExerciseList.tsx` and `ExerciseSearch.tsx` into `components/exercises/` (update the one import in `TemplateEditor/index.tsx`)

### 3. Consolidate Duplicate Type Definitions

`CreateExerciseInput` and `UpdateExerciseInput` are defined in three places:

- `src/lib/types/api.ts`
- `src/lib/db/repositories/types.ts`
- `src/lib/db/exercise/types.ts`

**Action:**
- [ ] Keep `db/exercise/types.ts` as the canonical source for exercise data types
- [ ] Keep `types/api.ts` only for API request/response envelope types (`ApiSuccess`, `ApiError`, `PaginatedResponse`, etc.)
- [ ] Remove duplicated input types from `types/api.ts` and `repositories/types.ts`, import from `db/*/types.ts` instead
- [ ] Audit `types/core.ts` — it's mostly re-exports from `db/schema.ts`; consider removing this indirection

---

## 🟡 Priority 2 — Structural Improvements

### 4. Organize Loose `src/lib/` Files

11 loose files in `src/lib/` should be grouped by feature:

| File(s) | Move to |
|---------|---------|
| `auth.ts` + `auth/offline-auth.ts` | `lib/auth/` (merge into single dir) |
| `session.ts` | `lib/auth/session.ts` |
| `badges.ts`, `streaks.ts` | `lib/gamification/` |
| `exercise-library.ts`, `exercise-categories.ts` | `lib/db/exercise/` (or `lib/exercises/`) |
| `fuzzy-match.ts` | `lib/utils/fuzzy-match.ts` |
| `units.ts` | `lib/utils/units.ts` |
| `posthog.ts`, `posthog.server.ts` | `lib/analytics/` |
| `cn.ts` | Keep as-is (widely used utility) |

**Action:**
- [ ] Create `lib/auth/` with `index.ts`, `session.ts`, `offline-auth.ts`
- [ ] Create `lib/gamification/` with `badges.ts`, `streaks.ts`
- [ ] Create `lib/analytics/` with `posthog.ts`, `posthog.server.ts`
- [ ] Move `fuzzy-match.ts` and `units.ts` into `lib/utils/`
- [ ] Move `exercise-library.ts` and `exercise-categories.ts` into `lib/db/exercise/`
- [ ] Update all imports

### 5. Move Top-Level Components into Feature Directories

17 components sit at `src/components/` root without grouping:

| Components | Move to |
|------------|---------|
| `ExerciseList`, `ExerciseSearch`, `ExerciseSelect`, `ExerciseHistoryChart`, `InlineEditExercise` | `components/exercises/` |
| `AccessorySection`, `BodyweightExerciseRow`, `VideoTutorialButton`, `VideoTutorialModal` | `components/workouts/` |
| `WeeklySchedule`, `RescheduleDialog` | `components/programs/` |
| `PullToRefresh`, `ChartSkeleton`, `PageHeader` | `components/ui/` |
| `Header`, `BottomNav` | `components/layout/` |
| `Providers`, `ErrorBoundary`, `ToastProvider` | `components/app/` |

**Action:**
- [ ] Create `components/layout/` and `components/app/` dirs
- [ ] Create `components/programs/` dir
- [ ] Relocate components per table above
- [ ] Update all imports

### 6. Resolve `db/repositories/` vs `db/exercise/` Duplication

Two competing repository patterns exist:

- `db/exercise/repository.ts` — functional, actively used by all API routes
- `db/repositories/exercise/{local,remote}.ts` — OOP interface-based with `UnifiedExercise`, appears to be an incomplete migration

**Action:**
- [ ] Audit `db/repositories/` for any live imports
- [ ] If unused, delete `db/repositories/` entirely (including `types.ts` with its `ExerciseRepository` interface)
- [ ] If partially used, finish the migration or consolidate into the functional pattern

---

## 🟢 Priority 3 — Nice-to-Have

### 7. Reduce Context Provider Sprawl

6 context providers could be consolidated:

| Current | Merge into |
|---------|-----------|
| `UnitContext`, `DateFormatContext`, `ThemeContext`, `WorkoutPreferencesContext` | `UserPreferencesContext` |
| `DashboardContext` | Keep |
| `StreakContext` | Keep (or merge into `DashboardContext`) |

- [ ] Create unified `UserPreferencesContext` backed by the `userPreferences` table
- [ ] Migrate consumers of individual contexts
- [ ] Delete old context files

### 8. Audit `types/` Directory

- [ ] Check if `shared.ts` utility types (`SnakeCase`, `CamelCase`, `NonEmptyArray`, `Result`) are actually imported anywhere — delete unused ones
- [ ] Verify `local.ts` types match the actual Dexie schema in `db/local-db.ts`
- [ ] Audit `index.ts` barrel exports for unused re-exports

### 9. Split Large Components

| Component | Lines | Action |
|-----------|-------|--------|
| `TemplateEditor/index.tsx` | 507 | Extract form sections into sub-components |
| `ExerciseSearch.tsx` | 406 | Extract `CreateExerciseForm` into its own component |
| `ExerciseList.tsx` | 342 | Extract drag-and-drop logic into a `useDragReorder` hook |
| `useWorkoutSession.ts` | 328 | Split timer logic from set-tracking logic |

---

## Execution Order

1. **Delete dead code** — unused API abstractions, unused `exercises/` components, unused repository pattern (zero risk)
2. **Adopt `apiRoute()` across all 47 API routes** — mechanical, high readability impact
3. **Consolidate duplicate types** — prevents bugs from type drift
4. **Reorganize `lib/` loose files** — improves discoverability
5. **Move top-level components into feature dirs** — cosmetic but helps navigation
6. Context consolidation, type audits, component splits as capacity allows
