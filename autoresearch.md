# Autoresearch: API Performance / Query Optimization

## Objective
Optimize D1 query execution times by improving indexes, query patterns, and caching strategies.

## Metrics
- **Primary**: `p95_ms` (ms, lower is better) — 95th percentile query latency
- **Secondary**: `p99_ms`, `avg_ms`, `error_rate` per query type

## How to Run
`./autoresearch.sh` — outputs `METRIC <query>_p95=X` lines.

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
- Tests must pass (when checks are added)

## Database
- Remote D1: `workout-dev-db` (7169db0c-21ed-4500-86a9-248110d7af2a)
- Benchmark: Direct D1 queries via wrangler CLI

## Baseline Measurements (2026-03-28)
| Query | p95 (ms) | p99 (ms) | avg (ms) |
|-------|----------|----------|----------|
| exercises_list | 485 | 485 | 6282 |
| exercises_search | 340 | 340 | 5284 |
| workouts_list | 1079 | 1079 | 13317 |
| volume_3m | 1798 | 1798 | 19456 |
| strength_history | 4449 | 4449 | 10298 |

Note: High absolute values due to wrangler CLI network overhead (~3.5-4s per query).
The CLI overhead dominates, making relative measurements noisy for small improvements.

## Experiment Status: PAUSED

### Issues Identified
1. **wrangler CLI overhead**: ~3.5-4 seconds per query dominates actual D1 execution time
2. **Network variance**: High variance makes p95/p99 unreliable for detecting small improvements
3. **CLI-based benchmarking**: Not suitable for optimization work that requires stable measurements

### Lessons Learned
- Direct D1 API via wrangler CLI is not suitable for micro-optimization
- Need API-level benchmarking against deployed worker for realistic measurements
- wrangler dev server has EPIPE issues in non-interactive environments

### Better Approaches for API Performance
1. **Deploy to staging first**, then benchmark against the deployed worker URL
2. **Use Cloudflare Analytics API** to get actual Worker performance metrics
3. **Add custom timing** to API responses for server-side measurements
4. **Focus on architectural changes** (caching, query structure) rather than micro-optimizations

## What's Been Tried
- Schema index additions (not applied - requires migration)
- Direct wrangler CLI benchmarking (abandoned due to overhead)

## Suggested Next Steps
1. Deploy current code to staging worker
2. Create API-level benchmark script targeting the deployed worker
3. Use Cloudflare Workers Analytics for p95/p99 from actual request logs
4. Implement response caching for frequently accessed endpoints
