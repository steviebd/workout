# Codebase Pattern Audit — Race Conditions & Anti-Patterns

> Audit date: 2026-03-27
> Status: **Pending Review**
> Last updated: 2026-03-27 (expanded audit)

---

## 🔴 Critical Issues

### 1. Race Condition: `ExerciseSelect.tsx` — fetch without abort/debounce

**File:** `src/components/exercises/ExerciseSelect.tsx:32-55`

Every keystroke changes `search` → recreates `fetchExercises` via `useCallback` → triggers `useEffect` → fires a new fetch. There is no `AbortController`, no debounce, and no stale-closure guard. Rapid typing will fire many concurrent requests that can resolve out of order, showing results for a stale query.

**Fix:** Replace manual fetch with `useQuery` keyed on a debounced search value, or add an `AbortController` in the `useEffect` cleanup.

---

### 2. Race Condition: `WeeklySchedule.tsx` — manual fetch in useEffect

**File:** `src/components/programs/WeeklySchedule.tsx:50-81`

Manual `fetch` inside `useEffect` with no `AbortController` or cleanup. If `cycleId` changes quickly, multiple requests can resolve out of order, setting stale workout data.

**Fix:** Replace with `useQuery({ queryKey: ['cycle-workouts', cycleId], ... })`.

---

### 3. setState during render: `exercises._index.tsx`

**File:** `src/routes/exercises._index.tsx:83-94`

```typescript
if (exercisesData) {
  const mapped = ...;
  if (JSON.stringify(mapped) !== JSON.stringify(exercises)) {
    setExercises(mapped); // ❌ setState DURING RENDER
  }
}
```

This calls `setExercises` during the render phase — a React anti-pattern that causes unnecessary re-renders and can cause infinite render loops. The `JSON.stringify` comparison on every render is also expensive. The entire `exercises` state is redundant since `exercisesData` from `useQuery` is already available.

**Fix:** Remove the `exercises`/`loading` state entirely. Use `exercisesData` directly (with a `.map()` in a `useMemo` if the shape transform is needed).

---

### 4. setState during render: `1rm-test.tsx`

**File:** `src/routes/1rm-test.tsx:64-66`

```typescript
if (preferencesData?.weightUnit && weightUnit !== preferencesData.weightUnit) {
  setWeightUnit(preferencesData.weightUnit);
}
```

`setWeightUnit` is called during render when `preferencesData` loads and the weight unit differs from current state. This causes an immediate re-render after the current one completes.

**Fix:** Move to `useEffect` with `preferencesData?.weightUnit` as dependency.

---

### 5. setState during render: `programs.$slug.start.tsx`

**File:** `src/routes/programs.$slug.start.tsx:100-102, 104-135`

Two instances:
1. Lines 100-102: `setWeightUnit` called during render
2. Lines 104-135: `setFormData` and `setPrefilled` called during render when `oneRmData` is available

```typescript
if (oneRmData && !prefilled.squat1rm && !prefilled.bench1rm && !prefilled.deadlift1rm && !prefilled.ohp1rm) {
  // ... sets form data during render
}
```

**Fix:** Move all setState calls into `useEffect` hooks.

---

## 🟠 Significant Issues

### 6. Duplicate state + redundant `handleRefresh`: `exercises._index.tsx`

**File:** `src/routes/exercises._index.tsx:25-81`

The component maintains both `useQuery` data (`exercisesData`) AND separate `useState` (`exercises`, `loading`). The `handleRefresh` callback (L56-81) manually re-fetches the same data that `useQuery` already manages.

**Fix:** Remove `exercises` and `loading` useState. Use `queryClient.invalidateQueries({ queryKey: ['exercises'] })` for pull-to-refresh instead of a manual fetch.

---

### 7. Sequential await waterfall: `templates.$id.edit.tsx`

**File:** `src/routes/templates.$id.edit.tsx:303-338`

Template save does `DELETE` calls in a loop, then `PUT`/`POST` calls in another loop — all sequential `await`s. Each request waits for the previous one to complete.

**Fix:** Use `Promise.all` for the batch of deletes, then `Promise.all` for the batch of adds/reorders.

---

### 8. Sequential await waterfall: 1RM test routes

**Files:**
- `src/routes/1rm-test.tsx:99-144`
- `src/routes/programs.cycle.$cycleId.1rm-test.tsx:133-163`

Multiple sequential fetch calls where independent requests could be parallelized with `Promise.all`.

---

### 9. Sequential await waterfall: WHOOP sync (HIGH impact)

**File:** `src/routes/api/integrations.whoop.sync.ts:82-108`

Four sequential `for` loops with `await` inside each:

| Lines | Loop | Operations |
|-------|------|------------|
| 83-85 | `for (const cycle of cyclesResult.value)` | `await whoopRepository.upsertCycle(...)` |
| 90-92 | `for (const sleep of sleepsResult.value)` | `await whoopRepository.upsertSleep(...)` |
| 97-99 | `for (const recovery of recoveriesResult.value)` | `await whoopRepository.upsertRecovery(...)` |
| 104-106 | `for (const workout of workoutsResult.value)` | `await whoopRepository.upsertWorkout(...)` |

Each loop processes a different dataset independently — could be parallelized with `Promise.all`.

**Fix:** Parallelize all four loops with `Promise.all`.

---

### 10. Sequential await waterfall: `useTemplateApi.ts` (HIGH impact)

**File:** `src/components/TemplateEditor/useTemplateApi.ts:86-133`

Two sequential `for` loops with fetch awaits:
- Lines 86-93: DELETE requests for removed exercises (could be `Promise.all`)
- Lines 95-133: Reorder (PUT) or create (POST) exercises sequentially

**Fix:** Use `Promise.all` for both the deletes and the add/reorder operations.

---

### 11. Sequential await waterfall: `program-cycles.$id.ts`

**File:** `src/routes/api/program-cycles.$id.ts:43-51`

```typescript
if (has1RMUpdate) {
  updated = await updateProgramCycle1RM(...);
}
if (hasProgressUpdate) {
  updated = await updateProgramCycleProgress(...);
}
if (isComplete) {
  updated = await completeProgramCycle(...);
}
```

If multiple conditions are true, these execute sequentially but could run in parallel with `Promise.all`.

---

### 12. Sequential await waterfall: `create-1rm-test-workout.ts`

**File:** `src/routes/api/program-cycles.$id.create-1rm-test-workout.ts:31-61`

For each of 4 lifts, sequentially awaits:
1. `getExercisesByWorkosId`
2. `createExercise` (if exercise not found)
3. `createWorkoutExercise`
4. `createWorkoutSet`

Each lift's operations are independent and could be parallelized with `Promise.all`.

---

### 13. `window.location.href` instead of router navigation (widespread)

**Total: 28 instances** across the codebase use `window.location.href = '/path'` for navigation, causing full page reloads instead of client-side transitions.

**Fix:** Replace with TanStack Router's `navigate()` or `<Link>` component.

#### Complete list of `window.location.href` navigation instances:

| File | Line | Navigation |
|------|------|------------|
| `src/routes/programs.cycle.$cycleId_.tsx` | 314 | `/workouts/${data.workoutId}` |
| `src/routes/programs.cycle.$cycleId_.tsx` | 459 | `/workouts/${data.workoutId}` |
| `src/routes/progress.lazy.tsx` | 345 | `/workouts` |
| `src/routes/progress.lazy.tsx` | 382 | `/exercises/new` |
| `src/routes/workouts.$id_.summary.tsx` | 181 | `/` |
| `src/routes/templates.$id.edit.tsx` | 142 | `/auth/signin` |
| `src/routes/exercises.$id.tsx` | 56 | `/exercises` |
| `src/routes/templates._index.tsx` | 126 | `/templates/new` |
| `src/routes/exercises._index.tsx` | 53 | `/exercises/${id}` |
| `src/routes/templates.$id.tsx` | 74 | `/templates/${newTemplate.id}` |
| `src/routes/templates.$id.tsx` | 95 | `/templates` |
| `src/routes/templates.$id.tsx` | 142 | `/templates` |
| `src/routes/health.tsx` | 109 | `/api/integrations/whoop/connect` |
| `src/routes/workouts.start.$templateId.tsx` | 72 | `/auth/signin` |
| `src/routes/workouts.$id.tsx` | 150 | `redirectUrl` (dynamic) |
| `src/routes/workouts.$id.tsx` | 192 | `/` |
| `src/routes/workouts._index.tsx` | 144 | `/templates/new` |
| `src/routes/workouts._index.tsx` | 181 | `/workouts/new` |
| `src/routes/workouts._index.tsx` | 212 | `/exercises/new` |
| `src/routes/workouts.$id_.edit.tsx` | 82 | `/progress` |
| `src/routes/__root.tsx` | 100 | `/api/auth/signout` |
| `src/hooks/useWorkoutSession.ts` | 108 | `/auth/signin` |
| `src/hooks/useWorkoutSession.ts` | 114 | `/workouts/${workoutId}/summary` |
| `src/hooks/useWorkoutSession.ts` | 198 | `/workouts` |
| `src/hooks/useWorkoutSession.ts` | 285 | `redirectUrl` (dynamic) |
| `src/hooks/useRequireAuth.ts` | 9 | `/auth/signin` |
| `src/components/TemplateEditor/useTemplateEditorState.tsx` | 69 | `/auth/signin` |
| `src/components/layout/Header.tsx` | 264 | `/auth/signin` |

---

### 14. Unsafe type assertions: `workouts.$id_.summary.tsx`

**File:** `src/routes/workouts.$id_.summary.tsx` — Lines 128, 148, 154, 160, 237

```typescript
workout.exercises as unknown as WorkoutExerciseWithDetails[]
```

5 occurrences of `as unknown as` cast bypass type checking entirely. The API returns exercises with inline sets but functions/components expect full `WorkoutExerciseWithDetails` structure.

**Fix:** Create a proper mapping function to transform API response to expected type.

---

### 15. Unsafe type assertions: Drizzle/D1 batch operations

**Files:** Multiple files use `as unknown as` for Drizzle batch operations:

| File | Line | Issue |
|------|------|-------|
| `src/lib/db/template/repository.ts` | 318 | Batch insert statements |
| `src/lib/db/workout/exercises.ts` | 197 | Batch insert statements |
| `src/lib/db/workout/workouts.ts` | 249, 261, 463 | Query builder type mismatches, batch |

The Drizzle query builder types don't expose `.orderBy()` at compile time even though D1 supports it at runtime.

---

### 16. Unsafe type assertions: Other locations

| File | Line | Context |
|------|------|---------|
| `src/lib/services/workout-service.ts` | 186 | CompleteWorkoutResult built conditionally |
| `src/lib/db/ownership.ts` | 104-105 | Dynamic table property access |
| `src/lib/db/local/sync.ts` | 30, 38, 45, 55 | Offline queue operations |
| `src/lib/db/local-db.ts` | 181 | Database proxy wrapper |
| `src/routes/programs.$slug.start.tsx` | 305 | Native DOM Event cast to React FormEvent |

---

## 🟡 Minor Issues

### 17. `useEffect` for auth redirect: `templates.$id.edit.tsx`

**File:** `src/routes/templates.$id.edit.tsx:139-144`

Uses `useEffect` to redirect unauthenticated users via `window.location.href`. The route already has a `loader` pattern available (like other routes already do with `getSessionServerFn`).

**Fix:** Add a route `loader` with a session check + `redirect()`, matching the pattern in other routes.

---

### 18. `useEffect` for redirect: `workouts.$id_.summary.tsx`

**File:** `src/routes/workouts.$id_.summary.tsx:107-119`

Async function inside `useEffect` to redirect incomplete workouts. This is a route guard concern, not a component concern.

**Fix:** Move to route loader or handle via `enabled` / conditional rendering.

---

### 19. Unused `saving` state: `workouts.$id_.edit.tsx`

**File:** `src/routes/workouts.$id_.edit.tsx:30,80-83`

`setSaving(true)` is called right before `window.location.href = '/progress'` which navigates away immediately. The saving state is never visible to the user.

**Fix:** Either remove the state or add proper save-then-navigate logic with `navigate()`.

---

### 20. `notes` state not initialized from workout data

**Files:**
- `src/routes/workouts.$id.tsx` (initialUIState)
- `src/routes/workouts.$id_.edit.tsx:29`

Both components initialize `notes` as `''` but never sync it with `workout.notes` when data loads. The display fallback `{notes ?? workout.notes ?? 'No notes added'}` works for display but editing always starts from an empty string.

**Fix:** Add a `useEffect` to sync `notes` from `workout.notes` when the query data loads, or initialize from query data.

---

### 21. `'use client'` directive used inconsistently

**Total: 45 files** contain `'use client'` at line 1 — a Next.js convention that has **no effect** in TanStack Start.

#### Files with `'use client'`:

**Routes (6):**
- `src/routes/workouts.$id_.summary.tsx`
- `src/routes/health.tsx`
- `src/routes/workouts.new.tsx`
- `src/routes/achievements.tsx`
- `src/routes/workouts.$id.tsx`
- `src/routes/workouts.$id_.edit.tsx`

**Context Providers (3):**
- `src/lib/context/StreakContext.tsx`
- `src/lib/context/DashboardContext.tsx`
- `src/lib/context/UserPreferencesContext.tsx`

**Hooks (2):**
- `src/hooks/useWorkoutSession.ts`
- `src/hooks/use-set-logger-state.ts`

**UI Components (8):**
- `src/components/ui/Tooltip.tsx`
- `src/components/ui/Toaster.tsx`
- `src/components/ui/ThemeToggle.tsx`
- `src/components/ui/Select.tsx`
- `src/components/ui/PullToRefresh.tsx`
- `src/components/ui/Drawer.tsx`
- `src/components/ui/DatePicker.tsx`

**Workout Components (3):**
- `src/components/workouts/WorkoutTemplateCard.tsx`
- `src/components/workouts/SetLogger.tsx`
- `src/components/workouts/ExerciseLogger.tsx`

**Progress Components (5):**
- `src/components/progress/VolumeScopeToggle.tsx`
- `src/components/progress/WeeklyVolumeChart.tsx`
- `src/components/progress/StrengthChart.tsx`
- `src/components/progress/DateRangeSelector.tsx`
- `src/components/progress/PRBoard.tsx`

**Template Components (1):**
- `src/components/templates/ExerciseList.tsx`

**Program Components (5):**
- `src/components/programs/ScheduleSelector.tsx`
- `src/components/programs/WeeklySchedule.tsx`
- `src/components/programs/RescheduleDialog.tsx`
- `src/components/programs/ProgramReview.tsx`
- `src/components/programs/OneRMInput.tsx`

**Layout Components (2):**
- `src/components/layout/Header.tsx`
- `src/components/layout/BottomNav.tsx`

**Dashboard Components (7):**
- `src/components/dashboard/VolumeSummary.tsx`
- `src/components/dashboard/StreakCard.tsx`
- `src/components/dashboard/RecentPRs.tsx`
- `src/components/dashboard/QuickActions.tsx`
- `src/components/dashboard/EmptyStateBanner.tsx`
- `src/components/dashboard/DashboardWidgets.tsx`
- `src/components/dashboard/DashboardCustomizer.tsx`

**Exercise Components (1):**
- `src/components/exercise/ExerciseSelector.tsx`

**Achievement Components (2):**
- `src/components/achievements/StreakDisplay.tsx`
- `src/components/achievements/BadgeCard.tsx`

**App Components (1):**
- `src/components/app/Providers.tsx`

**Fix:** Remove all `'use client'` directives from these files.

---

## Suggested Priority

| Priority | Issues | Impact |
|----------|--------|--------|
| **P0** | #3–#5 (setState during render) | Can cause infinite render loops |
| **P0** | #1, #2 (race conditions) | Stale/incorrect data displayed to user |
| **P1** | #6 (duplicate state) | Redundant fetches, confusing data flow |
| **P1** | #13 (window.location) | 28 full page reloads kill SPA experience |
| **P2** | #7–#12 (waterfalls) | Slow save operations, 6 locations found |
| **P2** | #14–#16 (unsafe casts) | 29 occurrences hidden type errors |
| **P3** | #17–#21 (minor) | Code quality / consistency |

---

## ⚠️ Corrections to Previous Audit

### Issue #9 (WHOOP sync waterfall) — PARTIALLY INCORRECT

The TODO claims the four `for` loops in `whoop.sync.ts:82-108` are independent and could be parallelized with `Promise.all`. This is **wrong for a correctness reason**: the upserts within each loop are sequential `await`s hitting the same D1 database. D1 does not support concurrent writes well — running all upserts in parallel could cause write contention or transaction failures. The four *categories* (cycles, sleeps, recoveries, workouts) could potentially be batched with `Promise.all` per category, but individual upserts within each loop likely need to stay sequential for D1 reliability. The API fetches are already correctly parallelized with `Promise.allSettled` on L56-61.

**Revised fix:** Use `Promise.all` across the four category loops (not within them), or use Drizzle batch insert instead of individual upserts.

### Issue #11 (program-cycles.$id.ts waterfall) — INCORRECT

The TODO claims the three conditions (`has1RMUpdate`, `hasProgressUpdate`, `isComplete`) could run in parallel. This is **wrong**: each call updates the same database row, and `updated` is intentionally overwritten with the latest state. Running them in parallel would cause a race condition on the same row. The sequential execution is correct — each update depends on the previous state. This is NOT a waterfall issue.

**Action:** Remove issue #11 from the TODO.

---

## 🔴 Additional Issues Found (Not in Original Audit)

### 22. Memory leak: DOM element appended without cleanup — `ExerciseList.tsx`

**File:** `src/components/exercises/ExerciseList.tsx:44-55`

The `useEffect` creates a `div` element and appends it to the DOM via `listRef.current.appendChild(indicator)`, but there is no cleanup function to remove it. Additionally, this is redundant — lines 187-191 already render the same drop indicator as JSX in the return statement, meaning the DOM-appended one is never cleaned up and creates a duplicate.

**Fix:** Remove the `useEffect` entirely — the JSX `dropIndicatorRef` div on L187-191 already handles this.

---

### 23. Memory leak: uncleaned setTimeout in `useAutoSave.ts`

**File:** `src/hooks/useAutoSave.ts:60-62`

```typescript
setTimeout(() => {
  setSaved(false);
}, UI.TIMING.SAVED_INDICATOR_DURATION_MS);
```

This `setTimeout` inside the `save` callback has no cleanup. If the component unmounts before it fires, `setSaved(false)` will attempt to update state on an unmounted component (React warning in dev, no-op in production but still a leak).

**Fix:** Store the timeout ID in a ref and clear it in the cleanup `useEffect` on L95-101.

---

### 24. Memory leak: uncleaned setTimeout in `exercises.$id.edit.tsx`

**File:** `src/routes/exercises.$id.edit.tsx:166-169`

```typescript
setTimeout(() => {
  navigate({ to: '/exercises/$id', params: { id } }).catch(() => {});
}, 1000);
```

1-second delay before navigation with no cleanup. If the user navigates away or the component unmounts before the timer fires, the navigation will still execute.

**Fix:** Use a ref for the timeout ID and clean it up, or navigate immediately without the delay.

---

### 25. Memory leak: uncleaned setTimeout in `workouts.$id.tsx`

**File:** `src/routes/workouts.$id.tsx:149-151`

```typescript
setTimeout(() => {
  window.location.href = redirectUrl;
}, 1000);
```

Same pattern — 1-second delay with no cleanup.

---

### 26. `fetchWhoopData` function is dead code — `health.tsx`

**File:** `src/routes/health.tsx:76-92`

`fetchWhoopData()` manually fetches the same data that two `useQuery` hooks already manage (L52-73), but it never updates the query cache. The fetched responses are consumed with `void statusRes.json()` / `void dataRes.json()` — the results are literally thrown away. Called by `handleSync` and `handleDisconnect`, it does nothing useful.

**Fix:** Replace calls to `fetchWhoopData()` with `queryClient.invalidateQueries({ queryKey: ['whoop-status'] })` and `queryClient.invalidateQueries({ queryKey: ['whoop-data'] })`.

---

### 27. Silent error handling in `health.tsx`

**File:** `src/routes/health.tsx:94-119`

Three handlers (`handleSync`, `handleDisconnect`, `handleConnect`) have no user-facing error feedback:
- `handleSync` (L94-106): catch only does `console.error`
- `handleDisconnect` (L112-119): catch only does `console.error`
- Neither shows a toast or error state to the user

**Fix:** Add `toast.error(...)` calls in the catch blocks.

---

### 28. `1rm-test.tsx` submit loop continues silently on partial failure

**File:** `src/routes/1rm-test.tsx:114-144`

The `for` loop adding exercises to the workout uses `continue` on failure (`if (!exerciseRes.ok) continue`). If 2 of 4 exercises fail to be added, the user sees "1RM test saved!" with a toast.success — no indication that their workout is incomplete.

**Fix:** Track failures and show a warning toast if any exercises failed to save.

---

### 29. `programs.cycle.$cycleId.1rm-test.tsx` — missing response.ok checks

**File:** `src/routes/programs.cycle.$cycleId.1rm-test.tsx:139-163`

Two fetch calls (PUT to update cycle L139, PUT to update workout L150) have no `response.ok` check. If either fails silently, the user is still navigated to the complete page with potentially stale data.

**Fix:** Check `response.ok` for both calls and show an error if either fails.

---

### 30. `programs.$slug.start.tsx` — toast.info called during render

**File:** `src/routes/programs.$slug.start.tsx:133`

Inside the setState-during-render block (issue #5), `toast.info('Loaded 1RMs from your previous cycle')` is called during the render phase. Toast side effects should not happen during render.

**Fix:** Move to `useEffect` along with the setState calls.

---

## Audit Summary

| Category | Original Count | Expanded Count | Verified Count |
|----------|---------------|---------------|----------------|
| Race conditions | 2 | 2 | 2 ✅ |
| setState during render | 1 | 5 | 5 ✅ (issue #5 also has toast side effect) |
| Sequential await waterfalls | 2 routes | 6 locations | 4 valid (#9 partially wrong, #11 incorrect) |
| Memory leaks | 0 | 0 | 4 new (issues #22-#25) |
| Silent error handling | 0 | 0 | 3 new (issues #27-#29) |
| Dead code | 0 | 0 | 1 new (issue #26) |
| Side effects during render | 0 | 0 | 1 new (issue #30) |
| window.location.href | ~20 | 28 | 28 ✅ |
| Unsafe type assertions | 4 lines | 29 occurrences | 29 ✅ |
| 'use client' directive | 3 files | 45 files | 45 ✅ |
