# Autoresearch: API Performance / Query Optimization

## Objective
Optimize p95/p99 response latency of key API endpoints by improving Drizzle ORM queries, adding indexes, and implementing caching strategies.

## Metrics
- **Primary**: `p95_ms` (ms, lower is better) — 95th percentile response time
- **Secondary**: `p99_ms`, `avg_ms`, `error_rate`, `db_queries_per_request`

## How to Run
`./autoresearch.sh` — outputs `METRIC p95_ms=X` lines.

## Files in Scope
- `src/routes/api/` — API route handlers
- `src/lib/db/exercise/repository.ts` — Exercise queries
- `src/lib/db/workout/stats.ts` — Volume/progress queries
- `src/lib/db/workout/*.ts` — Workout queries
- `src/lib/db/schema.ts` — Index definitions

## Off Limits
- Auth logic (`src/lib/auth/`, `src/routes/auth/`)
- Frontend components (`src/components/`)
- WorkOS integration (`src/routes/integrations/whoop/`)
- Test files (`*.test.ts`, `*.spec.ts`)

## Constraints
- Functional correctness must be maintained
- All existing tests must pass
- No breaking changes to API contract

## Database
- Remote D1 via `REMOTE=true bun dev:wrangler`
- Test user workosId: `user_01K9CFQ93YCA0D8AP85ASDQWKR`
- JWT secret from `wrangler.toml`: `6aFm7arZrbZ6fKtW3bOfgMCiea/8/C5cI93tBrZWmZc=`

## API Endpoints Under Test
1. `GET /api/exercises` — List exercises (search, filter, sort)
2. `GET /api/exercises?search=bench` — Exercise search
3. `GET /api/workouts` — List workouts
4. `GET /api/progress/volume?dateRange=3m` — Weekly volume data
5. `GET /api/progress/strength?exerciseId=X` — Strength history

## Baseline Measurements
Run `./autoresearch.sh` baseline to establish baseline metrics.

## What's Been Tried
- (No experiments yet — baseline pending)
