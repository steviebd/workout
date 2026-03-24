# Codebase Cleanup Plan — Round 2

> Generated from a full audit of the `src/` directory (Mar 2026).
> Priority: 🔴 High (dead code / correctness) · 🟡 Medium (maintainability) · 🟢 Low (polish)

---

## 1. 🔴 Dead Hooks (~830 lines, zero consumers)

| Hook | Lines |
|------|-------|
| `src/hooks/useExercises.ts` | 58 |
| `src/hooks/useIsMobile.ts` | 19 |
| `src/hooks/useOfflineSync.ts` | 111 |
| `src/hooks/useTemplates.ts` | 59 |
| `src/hooks/useWorkouts.ts` | 58 |
| `src/hooks/useActiveWorkout/` (4 files) | 524 |

**Action:** Delete all. Run `bun run typecheck` to verify no breakage.

---

## 2. 🔴 Dead UI / Feature Components

| File | Lines | Notes |
|------|-------|-------|
| `src/components/LoadingSpinner.tsx` | 15 | Zero consumers |
| `src/components/ui/ListCard.tsx` | ~55 | Only re-exported from barrel, never imported |
| `src/components/ui/ChartSkeleton.tsx` | ~20 | Zero consumers |
| `src/components/ui/ScrollArea.tsx` | ~25 | Zero consumers |
| `src/components/exercises/ExerciseHistoryChart.tsx` | ~120 | Re-exported from barrel but never used by any route |

**Action:** Delete files. Remove corresponding exports from barrel files (`ui/index.ts`, `exercises/index.ts`).

---

## 3. 🔴 Duplicate Type Definitions (§1 from previous audit — never fixed)

Local interfaces re-declared instead of importing from canonical sources.

### `interface Exercise` — 10 duplicates

| File | Canonical Source |
|------|------------------|
| `src/components/workouts/ExerciseLogger.tsx:19` | `src/lib/db/exercise/types.ts` |
| `src/components/exercises/InlineEditExercise.tsx:6` | `src/lib/db/exercise/types.ts` |
| `src/components/exercises/ExerciseSearch.tsx:11` | `src/lib/db/exercise/types.ts` |
| `src/components/templates/ExerciseList.tsx:5` | `src/lib/db/exercise/types.ts` |
| `src/hooks/useWorkoutSession.ts:35` | `src/lib/db/exercise/types.ts` |
| `src/routes/workouts.new.tsx:12` | `src/lib/db/exercise/types.ts` |
| `src/routes/progress.lazy.tsx:24` | `src/lib/db/exercise/types.ts` |
| `src/routes/exercises.$id.tsx:10` | `src/lib/db/exercise/types.ts` |
| `src/routes/workouts._index.tsx:22` | `src/lib/db/exercise/types.ts` |
| `src/routes/exercises.$id.edit.tsx:27` | `src/lib/db/exercise/types.ts` |

### `interface WorkoutSet` — 3 duplicates

| File | Canonical Source |
|------|------------------|
| `src/components/workouts/SetLogger.tsx:10` | `src/lib/db/workout/types.ts` |
| `src/components/workouts/ExerciseLogger.tsx:12` | `src/lib/db/workout/types.ts` |
| `src/hooks/useWorkoutSession.ts:23` | `src/lib/db/workout/types.ts` |

### `interface Template` — 3 duplicates

| File | Canonical Source |
|------|------------------|
| `src/routes/workouts.start.$templateId.tsx:20` | `src/lib/db/template/types.ts` |
| `src/routes/templates._index.tsx:17` | `src/lib/db/template/types.ts` |
| `src/routes/workouts._index.tsx:15` | `src/lib/db/template/types.ts` |

### `interface PersonalRecord` — 3 duplicates

| File | Canonical Source |
|------|------------------|
| `src/components/progress/PRBoard.tsx:7` | `src/lib/domain/stats/types.ts` |
| `src/components/dashboard/RecentPRs.tsx:8` | `src/lib/domain/stats/types.ts` |
| `src/routes/_index.tsx` (inline) | `src/lib/domain/stats/types.ts` |

### `interface ExerciseHistoryItem` — 2 duplicates

| File | Canonical Source |
|------|------------------|
| `src/components/exercises/ExerciseHistoryChart.tsx:7` | `src/lib/domain/stats/types.ts` |

### `interface WorkoutExercise` — 2 duplicates

| File | Canonical Source |
|------|------------------|
| `src/hooks/useWorkoutSession.ts:12` | `src/lib/db/workout/types.ts` |

**Action:** Delete local interfaces, import from canonical type files. If shapes differ, extend the canonical type or create a pick/omit alias.

---

## 4. 🔴 Dead / Misplaced Dependencies in `package.json`

| Dependency | Issue |
|------------|-------|
| `@libsql/client` | Zero imports in `src/` — not used |
| `@opendataloader/pdf` | Zero imports in `src/` — not used |
| `agent-browser` | In `dependencies` — should be `devDependencies` (testing tool) |

**Action:** Remove dead deps. Move `agent-browser` to `devDependencies`.

---

## 5. 🟡 ESLint Failure

| File | Error |
|------|-------|
| `src/components/ui/SectionHeader.tsx:14` | `react/jsx-no-leaked-render` — `{action && <div>}` pattern |

**Action:** Change `{action && <div>...}` to `{action ? <div>...</div> : null}`.

---

## 6. 🟡 Debug `console.log` in Production Code

| File | Line(s) | Description |
|------|---------|-------------|
| `src/routes/api/auth/me.tsx` | 10 | `console.log('[/api/auth/me] Cookie header:', ...)` |
| `src/routes/api/auth/me.tsx` | 13 | `console.log('[/api/auth/me] Session result:', ...)` |

**Action:** Remove debug logs. The `console.error` on line 24 is fine to keep.

---

## 7. 🟡 `as unknown as` Casts (26 occurrences)

Most are in the offline/sync layer casting entities to `Record<string, unknown>` for `queueOperation`. Key locations:

| File | Count | Pattern |
|------|-------|---------|
| `src/lib/db/local/workout-sets.ts` | 2 | `as unknown as Record<string, unknown>` |
| `src/lib/db/local/workouts.ts` | 3 | `as unknown as Record<string, unknown>` |
| `src/lib/db/local/exercises.ts` | 2 | `as unknown as Record<string, unknown>` |
| `src/lib/db/local/templates.ts` | 2 | `as unknown as Record<string, unknown>` |
| `src/lib/db/local/workout-exercises.ts` | 1 | `as unknown as Record<string, unknown>` |
| `src/hooks/useActiveWorkout/index.ts` | 3 | `as unknown as Record<string, unknown>` |
| `src/routes/workouts.$id_.summary.tsx` | 4 | `as unknown as WorkoutExerciseWithDetails[]` |
| `src/lib/services/workout-service.ts` | 1 | `as unknown as CompleteWorkoutResult` |
| `src/lib/db/ownership.ts` | 2 | Dynamic column access |
| `src/lib/db/workout/workouts.ts` | 2 | Query builder casting |
| `src/lib/db/local-db.ts` | 1 | Mock database object |
| `src/lib/sync/sync-engine.ts` | 1 | `as any` — Dexie table update |
| `src/routes/programs.$slug.start.tsx` | 1 | Event cast |
| `src/components/ui/ListCard.tsx` | 1 | Event cast |

**Action:** Add a generic type parameter to `queueOperation` so the 13 offline-layer casts can be removed. For the rest, add justifying comments or fix with proper generics/Zod parsing.

---

## 8. 🟡 Confusing Duplicate Component Pairs

| Simple Version | Full Version | Issue |
|---------------|-------------|-------|
| `ExerciseSearchSimple.tsx` (24 lines) | `ExerciseSearch.tsx` (407 lines) | Barrel aliases both as `ExerciseSearch` / `ExerciseSearchEditor` |
| `ExerciseListSimple.tsx` (15 lines) | `ExerciseList.tsx` (286 lines) | Barrel aliases both as `ExerciseList` / `ExerciseListEditor` |

The barrel file (`components/exercises/index.ts`) has 9 exports with aliased duplicates making it unclear which to use.

**Action:** Clarify naming — rename or consolidate. Remove the confusing barrel aliases.

---

## 9. 🟡 Two Hooks Directories

| Directory | Contents |
|-----------|----------|
| `src/hooks/` | 10 hook files (6 dead — see §1) |
| `src/lib/hooks/` | 1 file: `use-set-logger-state.ts` |

**Action:** After deleting dead hooks (§1), consolidate to a single directory. Move `use-set-logger-state.ts` to `src/hooks/` or keep all in `src/lib/hooks/`.

---

## 10. 🟡 Bloated Route / Component Files

| File | Lines | Issue |
|------|-------|-------|
| `src/routes/progress.lazy.tsx` | 758 | God route — fetching, charts, and state all in one file |
| `src/routes/programs.cycle.$cycleId_.tsx` | 541 | 10+ `console.error` handlers, massive `useEffect` chains |
| `src/routes/templates.$id.edit.tsx` | 540 | Many `useState` hooks |
| `src/components/TemplateEditor/index.tsx` | 510 | Still has 1 `.then()` chain (line 221) |
| `src/routes/workouts.$id.tsx` | 486 | — |

**Action:** Extract sub-components, custom hooks, or data-fetching helpers. Low priority unless actively modifying these files.

---

## 11. 🟡 Type Re-export Confusion

`src/lib/types/core.ts` re-exports types from `src/lib/domain/stats/types.ts`. Some consumers import from `core.ts`, others directly from `domain/stats`. No single canonical import path.

**Action:** Pick one canonical path and update all consumers. Delete the re-exports.

---

## Execution Order

1. **Phase 1 — Delete dead code** (§1, §2, §4): Hooks, components, deps. Run `bun run typecheck` after.
2. **Phase 2 — Fix broken lint & logs** (§5, §6): Quick wins.
3. **Phase 3 — Deduplicate types** (§3, §11): Replace local interfaces with canonical imports.
4. **Phase 4 — Structural cleanup** (§7, §8, §9): Fix casts, clarify component naming, consolidate hooks dir.
5. **Phase 5 — Refactor bloat** (§10): Extract sub-components from large files. Low priority.

After each phase, run:
```bash
bun run typecheck && bun run lint && bun run test
```
