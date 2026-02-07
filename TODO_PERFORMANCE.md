# Performance Audit TODO

## Critical N+1 Query Issues

### 1. `/api/streaks` - 12+ queries per request
- **Location**: `src/routes/api/streaks.ts:15-43`
- **Issue**: Makes 4 sequential calls, where `calculateThirtyDayStreak()` calls `getWorkoutsPerWeek()` which executes 8 separate COUNT queries
- **Fix**: Combine into single query with GROUP BY week

### 2. `getWorkoutsPerWeek()` - N+1 pattern
- **Location**: `src/lib/streaks.ts:68-102`
- **Issue**: Executes separate COUNT query for each week (default 8 weeks)
- **Fix**: Single query with `GROUP BY week`

### 3. `calculateMonthlyStreak()` - 12 separate queries
- **Location**: `src/lib/streaks.ts:275-312`
- **Issue**: Loops 12 times calling `getWorkoutsInDateRange()`
- **Fix**: Single query with GROUP BY month

### 4. Template + exercises fetched separately
- **Location**: `src/routes/api/templates.$id.ts:27,33`
- **Issue**: Calls `getTemplateById()` then `getTemplateExercises()` - the latter re-validates ownership
- **Fix**: Combine into single JOIN query

### 5. Program cycle + workouts fetched separately
- **Location**: `src/routes/api/program-cycles.$id.ts:31,36`
- **Issue**: Calls `getProgramCycleById()` then `getCycleWorkouts()`
- **Fix**: Combine with JOIN or use transaction

### 6. `getExerciseHistory()` - In-memory aggregation
- **Location**: `src/lib/db/workout/repository.ts:1023-1111`
- **Issue**: Loads all set data then aggregates in JavaScript
- **Fix**: Use SQL GROUP BY and aggregation functions

### 7. `getRecentPRs()` - Two-query pattern with in-memory processing
- **Location**: `src/lib/db/workout/repository.ts:1395-1513`
- **Issue**: Loads workout maxes, then reloads sets to find reps at max
- **Fix**: Could be combined into single query with window functions

---

## Memory Usage Concerns

### 1. Large dataset loading
- **Issue**: `getExerciseHistory()` loads all sets for date range into memory then processes
- **Impact**: Users with long workout history could hit memory limits

### 2. No pagination on history endpoints
- **Issue**: History queries lack default limits
- **Fix**: Add `LIMIT 100` default, implement cursor-based pagination

### 3. Complex JOINs with GROUP BY
- **Issue**: `getWorkoutsByWorkoutId()` at `repository.ts:447-538` uses multiple JOINs and GROUP BY
- **Fix**: Can be slow on large datasets; consider materialized views or pre-aggregation

### 4. Date manipulation repeated
- **Issue**: Date calculations duplicated across `streaks.ts`, `workout/repository.ts`
- **Fix**: Create `~/lib/utils/date.ts` utility

---

## Caching Opportunities

### 1. No server-side caching
- **Issue**: Only 8 routes have `Cache-Control` headers (all set to `no-store`)
- **Fix**: Add caching:
  - Streak data: cache 5-10 minutes
  - PR data: cache 10-15 minutes
  - Workout stats: cache 5 minutes

### 2. React Query stale times
- **Issue**: StreakContext uses 30-second staleTime (very short)
- **Fix**: Increase to 5-10 minutes for less-frequently-changing data

### 3. User preferences caching
- **Issue**: `getUserPreferences()` called on every streak request
- **Fix**: Cache in memory (Cloudflare Workers) or extend user session

### 4. Offline-first architecture is good
- Dexie IndexedDB implementation is solid
- Sync engine well-designed
- **Opportunity**: Could cache API responses in IndexedDB for offline access

---

## Quick Wins (High Impact, Low Effort)

| Issue | Location | Impact | Effort |
|-------|----------|--------|--------|
| Combine streak queries | `streaks.ts:68-102` | High | Medium |
| Add Cache-Control headers | All API routes | High | Low |
| Increase React Query staleTime | `StreakContext.tsx` | Medium | Low |
| Add pagination limits | History queries | Medium | Low |
| Create date utility | New file | Low | Low |

---

## Recommended Implementation Order

### Week 1: Critical N+1 Fixes
1. [ ] Fix `getWorkoutsPerWeek()` - single query with GROUP BY
2. [ ] Fix `calculateMonthlyStreak()` - single query with GROUP BY
3. [ ] Fix `/api/streaks` - combine queries

### Week 2: Caching Layer
1. [ ] Add Cache-Control headers to streak endpoints
2. [ ] Add Cache-Control headers to PR endpoints
3. [ ] Add Cache-Control headers to workout stats endpoints
4. [ ] Increase React Query staleTime in StreakContext

### Week 3: Entity Loading Optimization
1. [ ] Optimize template route with JOIN
2. [ ] Optimize program-cycle route with JOIN
3. [ ] Optimize `getRecentPRs()` - reduce queries

### Week 4: Long-term Improvements
1. [ ] Add pagination to exercise history
2. [ ] Create date utility module
3. [ ] Implement cursor-based pagination for history
4. [ ] Consider pre-aggregation for analytics queries

---

## Files to Modify

### High Priority
- `src/lib/streaks.ts`
- `src/routes/api/streaks.ts`
- `src/lib/db/template/repository.ts`
- `src/routes/api/templates.$id.ts`
- `src/lib/db/program.ts`
- `src/routes/api/program-cycles.$id.ts`
- `src/lib/db/workout/repository.ts`
- `src/routes/api/progress.prs.ts`

### Medium Priority
- `src/routes/api/workouts.stats.ts`
- `src/routes/api/progress.volume.ts`
- `src/routes/api/progress.strength.ts`
- `src/components/StreakContext.tsx` (if exists)
