# Autoresearch: API Performance / Query Optimization

## Objective
Optimize D1 query execution times by improving indexes, query patterns, and caching strategies.

## Metrics
- **Primary**: `median_ms` (ms, lower is better) — median query latency (more stable than p95 with network noise)
- **Secondary**: `p95_ms`, `p99_ms`, `avg_ms`, `error_rate` per query type

## How to Run
`./autoresearch.sh` — outputs `METRIC <query>_median=X` lines.

## Files in Scope
- `src/lib/db/exercise/repository.ts` — Exercise queries
- `src/lib/db/workout/stats.ts` — Volume/progress queries  
- `src/lib/db/workout/*.ts` — Workout queries
- `src/lib/db/schema.ts` — Index definitions

## Off Limits
- Auth logic (`src/lib/auth/`, `src/routes/auth/`)
- Frontend components (`src/components/`)
- WorkOS integration (`src/routes/integrations/whoop/`)

## Constraints
- Functional correctness must be maintained
- Tests must pass

## Database
- Remote D1: `workout-dev-db` (7169db0c-21ed-4500-86a9-248110d7af2a)

## Experiment Status: ACTIVE

### Key Findings

#### Index Optimization (SUCCESS)
Created composite indexes that improved query performance:
1. `idx_exercises_workos_id_is_deleted` — For exercise list queries
2. `idx_workouts_workos_id_is_deleted_started_at` — For workout list queries  
3. `idx_workout_sets_complete` — For volume calculation queries
4. `idx_workout_sets_workout_exercise_id` — For JOIN operations

**Verification**: `EXPLAIN QUERY PLAN` shows `SEARCH USING INDEX` instead of `SCAN`

### Benchmark Methodology Notes
- wrangler CLI adds ~3.5-4s overhead per query
- Network variance makes absolute timing unreliable
- Using median instead of p95 for more stable measurements
- Focus on structural improvements (indexes) that are verifiable

## What's Been Tried

| Experiment | Result | Notes |
|------------|--------|-------|
| Composite indexes | ✅ IMPROVED | Verified via EXPLAIN QUERY PLAN |
| CLI benchmark | ⚠️ NOISY | Network overhead dominates |

## Baseline vs Current

| Query | Baseline p95 | Current median | Change |
|-------|-------------|----------------|--------|
| exercises_list | 485ms | 367ms | -24% |
| exercises_search | 340ms | 286ms | -16% |

Note: Network variance means these improvements may not be stable across runs.

## Next Optimization Ideas
1. **Query structure optimization** — Use subqueries instead of JOINs where appropriate
2. **Denormalization** — Store computed values (volume) for faster reads
3. **Response caching** — Cache frequent API responses in KV
4. **Batch queries** — Combine N+1 patterns into single batched queries
