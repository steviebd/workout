# Autoresearch: Reduce Lines of Code and Complexity

## Objective
Reduce the total lines of code (LOC) and complexity in the codebase. The goal is to simplify the code while maintaining all functionality.

## Metrics
- **Primary**: Total Lines of Code in src/ (lower is better)
- **Secondary**: Number of files, Average lines per file

## How to Run
`./autoresearch.sh` — outputs `METRIC loc=number` lines.

## Files in Scope
- All `.ts` and `.tsx` files in `src/`
- Focus areas: components, routes, lib utilities

## Off Limits
- Don't remove functionality - only simplify/DRY up code
- Don't break tests
- Keep type safety

## Constraints
- Tests must pass (`bun run test`)
- Type checking must pass (`bun run typecheck`)
- No new dependencies

## What's Been Tried
- **formatDuration consolidation**: Merged 3 duplicate formatDuration functions (in workout-summary.ts, progress.lazy.tsx, useWorkoutSession.ts) into 1 universal function - saved ~21 LOC
- **calculateE1RM deduplication**: Removed duplicate calculateE1RM from workout-summary.ts, imported from calculations.ts - saved ~4 LOC
- **Date range utilities**: Consolidated getThisWeekRange and getThisMonthRange in progress.lazy.tsx to use date utilities - saved ~16 LOC
- **Exercise category helpers**: Consolidated getTested1RMs to use isSquat, isBench, isDeadlift, isOverheadPress helper functions from categories.ts - saved ~1 LOC

Total saved: ~40 LOC (35,782 → 35,742)
