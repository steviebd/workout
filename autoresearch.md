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
- (Baseline to be established)
