# Autoresearch: Test Coverage for Vital Features

## Objective
Improve test coverage for vital features in the workout app. Fix broken E2E tests and add tests for key features that lack coverage.

## Metrics
- **Primary**: passing_tests (count, higher is better) - total number of passing tests
- **Secondary**: e2e_passing (count), unit_passing (count), test_coverage (%)

## How to Run
```bash
# Run all tests
bun test

# Run unit tests only
bun run test

# Run E2E tests only
bun run test:e2e
```

## Files in Scope
- `tests/unit/*.spec.ts` - Unit tests (already passing)
- `tests/e2e/*.spec.ts` - E2E tests (some broken)
- `tests/components/*.test.tsx` - Component tests
- `playwright.config.ts` - E2E test configuration

## Vital Features to Cover
Based on app routes and functionality:

| Feature | Unit Tests | E2E Tests | Status |
|---------|------------|-----------|--------|
| Dashboard | ✅ (dashboard.spec.ts) | ❌ | Needs E2E |
| Exercises CRUD | ✅ (exercise.spec.ts) | ❌ | Needs E2E |
| Templates CRUD | ✅ (template.spec.ts) | ❌ | Needs E2E |
| Workouts CRUD | ✅ (workout.spec.ts) | ⚠️ (3 tests) | Partial |
| Programs/Cycles | ❌ | ❌ | Needs tests |
| 1RM Tests | ❌ | ❌ | Needs tests |
| Progress/Charts | ❌ | ❌ | Needs tests |
| Calendar/Schedule | ❌ | ⚠️ (22 tests, broken) | Needs fix |
| Achievements | ❌ | ❌ | Needs tests |
| Health Tracking | ❌ | ❌ | Needs tests |
| Offline Sync | ✅ (sync-engine.spec.ts) | ❌ | Needs E2E |
| Auth Flow | ❌ | ⚠️ (implicit) | Needs tests |

## Constraints
- Tests must pass after changes
- No breaking changes to app functionality
- Keep existing passing tests working

## Current Baseline
- Unit tests: 267 passing
- E2E tests: 193 failing, 4 passing (due to Playwright config issue with test.describe nesting)
- Total: ~271 passing tests

## What's Been Tried
- [Baseline] Initial state: 267 unit tests pass, E2E tests have structural issues

## What's Broken
1. **program-flow.spec.ts** - Has `test.describe` nested incorrectly at line 222
2. **E2E tests** - Playwright configuration issue with test.describe being called incorrectly

## Strategy
1. Fix the Playwright test.describe nesting issue in program-flow.spec.ts
2. Run E2E tests to see which features work
3. Add missing E2E tests for key features
4. Consider adding component tests for UI elements
