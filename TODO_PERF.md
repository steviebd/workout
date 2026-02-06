# TODO_PERF.md - AI/LLM Developer Experience Improvements

## Status

**Started:** Feb 6, 2026
**Completed:** Feb 6, 2026

## Progress Checklist

- [x] Phase 1: Split Large Database Files
- [x] Phase 2: Standardize API Routes
- [x] Phase 3: Centralize Validation with Zod
- [x] Phase 4: Enhance AGENTS.md
- [x] Phase 5: Refactor Wrangler Config Script
- [x] Phase 6: Consistent Error Handling

---

## Completed Work Summary

### Phase 1: Split Large Database Files

**Created:**
- `src/lib/db/workout/index.ts`
- `src/lib/db/workout/repository.ts`
- `src/lib/db/workout/types.ts`
- `src/lib/db/template/index.ts`
- `src/lib/db/template/repository.ts`
- `src/lib/db/template/types.ts`

### Phase 2: Standardize API Routes

**Updated 40+ API routes** to use `requireAuth()`:
- All routes in `src/routes/api/` now use consistent auth pattern
- Removed manual session checks in favor of `requireAuth()` helper

### Phase 3: Centralize Validation with Zod

**Created:**
- `src/lib/validators/index.ts`
- `src/lib/validators/exercise.schema.ts`
- `src/lib/validators/template.schema.ts`
- `src/lib/validators/workout.schema.ts`

### Phase 4: Enhance AGENTS.md

**Added sections:**
- Creating New API Endpoints (with full example)
- Creating New Database Functions
- Code Review Checklist
- Import Patterns table
- API Common Patterns (GET/POST)
- File Structure Reference

### Phase 5: Refactor Wrangler Config Script

**Created:**
- `scripts/generate-wrangler-config.ts` (pure TypeScript)

**Deleted:**
- `scripts/generate-wrangler-config.sh`

**Updated:**
- All `package.json` scripts to use TypeScript version

### Phase 6: Consistent Error Handling

**Created:**
- `src/lib/api/route-helpers.ts` (requireAuth, validateBody, constants)
- `src/lib/api/errors.ts` (createApiError, API_ERROR_CODES)

---

## Verification Results

| Check | Status |
|-------|--------|
| Lint | ✅ Pass |
| Typecheck | ✅ Pass |
| Unit Tests | ✅ 258 passed |

---

## Files Changed Summary

| Type | Count |
|------|-------|
| Created | 13 |
| Modified | 45+ |
| Deleted | 1 |

---

## Backward Compatibility

All refactoring maintains backward compatibility:
- Original `src/lib/db/workout.ts` re-exports from new structure
- Original `src/lib/db/template.ts` re-exports from new structure
- All imports still work as before
- No breaking changes to API contracts

## Priority Matrix

| Priority | Effort | Impact | Change |
|----------|--------|--------|--------|
| 1. Split DB files | High | High | Split workout.ts, template.ts |
| 2. API helpers | Medium | High | Create route-helpers.ts |
| 3. Zod schemas | Medium | Medium | Centralize validation |
| 4. Enhance AGENTS.md | Low | Medium | Add examples + checklist |
| 5. Refactor wrangler script | Low | Low | TypeScript rewrite |
| 6. Consistent errors | Low | Medium | Create error helpers |

---

## Phase 1: Split Large Database Files

### 1.1 Refactor `src/lib/db/workout.ts` (1546 lines)

**Goal:** Split into focused, single-responsibility files

**New Structure:**
```
src/lib/db/
├── schema.ts                    # Keep - tables + types
├── workout/
│   ├── index.ts                 # Re-export all workout exports
│   ├── types.ts                 # Workout-specific types
│   ├── repository.ts            # Data access layer
│   ├── validators.ts            # Input validation
│   └── services.ts              # Business logic (optional)
```

**Pattern for each function:**
```typescript
// OLD (workout.ts)
export async function createWorkout(...) { ... }
export async function getWorkoutById(...) { ... }

// NEW (workout/repository.ts)
export async function createWorkout(db: D1Database, data: CreateWorkoutData): Promise<Workout> { ... }
export async function getWorkoutById(db: D1Database, id: string): Promise<Workout | null> { ... }
```

**Affected Files:**
- `src/lib/db/workout.ts` → split into `workout/` directory
- `src/routes/api/workouts.ts` → update imports
- All files importing from workout.ts → update imports

### 1.2 Refactor `src/lib/db/template.ts` (443 lines)

**Goal:** Extract to single-responsibility files

**New Structure:**
```
src/lib/db/
├── schema.ts
├── template/
│   ├── index.ts
│   ├── types.ts
│   ├── repository.ts
│   └── validators.ts
```

### 1.3 Apply Pattern to Other DB Modules

**Already well-sized (keep as-is):**
- `src/lib/db/exercise.ts` (~219 lines)
- `src/lib/db/preferences.ts` (~90 lines)
- `src/lib/db/user.ts` (~90 lines)
- `src/lib/db/index.ts` (~10 lines)
- `src/lib/db/local-repository.ts` (~300 lines)

**Review later:**
- `src/lib/db/program.ts`
- `src/lib/db/utils.ts`

---

## Phase 2: Standardize API Routes

### 2.1 Create Route Helpers (`src/lib/api/`)

**New File:** `src/lib/api/route-helpers.ts`

```typescript
import { getSession } from '~/lib/session';
import type { SessionPayload } from '~/lib/auth';

export async function requireAuth(request: Request): Promise<SessionPayload | null> {
  const session = await getSession(request);
  return session?.sub ? session : null;
}

export function validateBody<T>(request: Request, schema: ZodSchema<T>): T | null {
  try {
    return schema.parse(await request.json());
  } catch {
    return null;
  }
}

export function createApiError(message: string, status: number, code: string): Response {
  return Response.json({ error: message, code }, { status });
}
```

### 2.2 Update Route Pattern

**Before:**
```typescript
// src/routes/api/exercises.ts
GET: async ({ request }) => {
  const session = await getSession(request);
  if (!session?.sub) {
    return Response.json({ error: 'Not authenticated' }, { status: 401 });
  }
  // ...
}
```

**After:**
```typescript
// src/routes/api/exercises.ts
import { requireAuth, createApiError } from '~/lib/api/route-helpers';

GET: async ({ request }) => {
  const session = await requireAuth(request);
  if (!session) {
    return createApiError('Not authenticated', 401, 'UNAUTHORIZED');
  }
  // ...
}
```

### 2.3 Standardize Auth Field Usage

**Current Inconsistency:**
- Some routes use `session.sub`
- Some routes use `session.workosId`

**Decision:** Use `session.sub` consistently as the user identifier.

---

## Phase 3: Centralize Validation with Zod

### 3.1 Create Validation Schemas (`src/lib/validators/`)

**New Structure:**
```
src/lib/validators/
├── index.ts                     # Export all schemas
├── exercise.schema.ts
├── template.schema.ts
├── workout.schema.ts
├── program.schema.ts
└── common.schema.ts             # Shared types (pagination, etc.)
```

### 3.2 Schema Examples

```typescript
// src/lib/validators/exercise.schema.ts
import { z } from 'zod';

export const createExerciseSchema = z.object({
  name: z.string().min(1).max(200),
  muscleGroup: z.string().max(50).optional(),
  description: z.string().max(1000).optional(),
  localId: z.string().optional(),
  libraryId: z.string().optional(),
});

export const updateExerciseSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  muscleGroup: z.string().max(50).optional(),
  description: z.string().max(1000).optional(),
}).refine(data => Object.values(data).some(v => v !== undefined), {
  message: "At least one field must be provided",
});
```

### 3.3 Update Routes to Use Schemas

**Before:**
```typescript
// src/routes/api/exercises.ts
if (!name || typeof name !== 'string') {
  return Response.json({ error: 'Name is required' }, { status: 400 });
}
if (name.length > MAX_NAME_LENGTH) {
  return Response.json({ error: `Name too long` }, { status: 400 });
}
```

**After:**
```typescript
// src/routes/api/exercises.ts
import { createExerciseSchema } from '~/lib/validators';

POST: async ({ request }) => {
  const body = validateBody(request, createExerciseSchema);
  if (!body) {
    return createApiError('Invalid request body', 400, 'VALIDATION_ERROR');
  }
  // Use body.name, body.muscleGroup, etc.
}
```

---

## Phase 4: Enhance AGENTS.md

### 4.1 New Sections to Add

```markdown
## Creating New API Endpoints

1. Create route file in `src/routes/api/`
2. Add validation schema in `src/lib/validators/`
3. Use route helpers from `src/lib/api/`
4. Import DB functions from appropriate repository

Example: `src/routes/api/exercises.ts`

## Creating New Database Functions

1. Identify domain (workout, exercise, template)
2. Add to appropriate repository in `src/lib/db/{domain}/`
3. Export from `src/lib/db/{domain}/index.ts`
4. Add unit tests in `tests/unit/`

## Code Review Checklist

- [ ] Auth check using `requireAuth()` helper
- [ ] Input validated with Zod schema
- [ ] DB operations use repository functions
- [ ] Error responses use `createApiError()`
- [ ] Tests cover success + error cases

## Import Patterns

- `@/` for components: `import Button from '@/components/ui/Button'`
- `~/` for lib utilities: `import { db } from '~/lib/db'`
- Relative for same-directory: `import { type Foo } from './types'`

## Common Patterns

### Fetching Data (Read)
```typescript
GET: async ({ request }) => {
  const session = await requireAuth(request);
  if (!session) return createApiError('Unauthorized', 401, 'UNAUTH');

  const url = new URL(request.url);
  const id = url.searchParams.get('id');

  const exercise = await getExerciseById(db, id!, session.sub);
  if (!exercise) return createApiError('Not found', 404, 'NOT_FOUND');

  return Response.json(exercise);
}
```

### Creating Data (Write)
```typescript
POST: async ({ request }) => {
  const session = await requireAuth(request);
  if (!session) return createApiError('Unauthorized', 401, 'UNAUTH');

  const body = validateBody(request, createExerciseSchema);
  if (!body) return createApiError('Invalid body', 400, 'VALIDATION');

  const exercise = await createExercise(db, { ...body, workosId: session.sub });
  return Response.json(exercise, { status: 201 });
}
```
```

---

## Phase 5: Refactor Wrangler Config Script

### 5.1 Convert to TypeScript

**Before:** `scripts/generate-wrangler-config.sh` (bash + python hybrid)

**After:** `scripts/generate-wrangler-config.ts`

```typescript
interface ConfigParams {
  env: 'dev' | 'staging' | 'prod';
  remote: boolean;
}

interface WranglerConfig {
  name: string;
  main: string;
  compatibility_date: string;
  compatibility_flags: string[];
  d1_databases: {
    binding: string;
    database_name: string;
    database_id: string;
    remote: boolean;
  }[];
  observability: { enabled: boolean };
  vars: Record<string, string>;
}

export function generateConfig(params: ConfigParams): WranglerConfig {
  const { env, remote } = params;
  // Implementation
  return config;
}
```

**Benefits:**
- Type safety for config structure
- Easier to test
- IDE support
- Consistent with rest of codebase

---

## Phase 6: Consistent Error Handling

### 6.1 Create Error Types

**New File:** `src/lib/api/errors.ts`

```typescript
export const API_ERROR_CODES = {
  UNAUTHORIZED: 'UNAUTHORIZED',
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  SERVER_ERROR: 'SERVER_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
} as const;

export type ApiErrorCode = typeof API_ERROR_CODES[keyof typeof API_ERROR_CODES];

export interface ApiErrorResponse {
  error: string;
  code: ApiErrorCode;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code: ApiErrorCode
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function createApiError(
  message: string,
  status: number,
  code: ApiErrorCode
): Response {
  return Response.json({ error: message, code }, { status });
}
```

### 6.2 Update All Routes

Replace scattered error responses with `createApiError()`:
- `src/routes/api/exercises.ts`
- `src/routes/api/templates.$id.ts`
- `src/routes/api/workouts.ts`
- All other API routes

---

## Implementation Order

### Phase 1: Database Refactoring
1. Create `src/lib/db/workout/` directory
2. Move workout functions to `workout/repository.ts`
3. Create `workout/index.ts` exports
4. Update all imports
5. Repeat for `template` module

### Phase 2: Route Helpers
1. Create `src/lib/api/route-helpers.ts`
2. Update one route as test pattern
3. Update remaining routes

### Phase 3: Zod Validation
1. Create `src/lib/validators/` directory
2. Add exercise schema (most used)
3. Add remaining schemas
4. Update routes to use schemas

### Phase 4: AGENTS.md
1. Add "Creating New API Endpoints" section
2. Add "Creating New Database Functions" section
3. Add "Code Review Checklist"
4. Add "Common Patterns" examples

### Phase 5: Wrangler Script
1. Convert `scripts/generate-wrangler-config.sh` to TypeScript
2. Update `package.json` scripts
3. Verify generation works

### Phase 6: Error Handling
1. Create `src/lib/api/errors.ts`
2. Update all routes to use `createApiError()`

---

## Files Affected Summary

### Created
- `src/lib/db/workout/index.ts`
- `src/lib/db/workout/repository.ts`
- `src/lib/db/workout/types.ts`
- `src/lib/db/template/index.ts`
- `src/lib/db/template/repository.ts`
- `src/lib/db/template/types.ts`
- `src/lib/api/route-helpers.ts`
- `src/lib/api/errors.ts`
- `src/lib/validators/index.ts`
- `src/lib/validators/exercise.schema.ts`
- `src/lib/validators/template.schema.ts`
- `src/lib/validators/workout.schema.ts`
- `scripts/generate-wrangler-config.ts`

### Modified
- `src/lib/db/workout.ts` → deleted
- `src/lib/db/template.ts` → deleted
- `src/routes/api/exercises.ts`
- `src/routes/api/templates.$id.ts`
- `src/routes/api/workouts.ts`
- AGENTS.md

### Deleted
- `scripts/generate-wrangler-config.sh`

---

## Success Criteria

1. No file in `src/lib/db/` exceeds 300 lines
2. All API routes use `requireAuth()` helper
3. All API routes use Zod schemas for input validation
4. All API routes use `createApiError()` for responses
5. AGENTS.md includes working examples for common patterns
6. All tests pass after refactoring

---

## Timeline Estimate

- Phase 1: 2-3 hours
- Phase 2: 1 hour
- Phase 3: 2 hours
- Phase 4: 1 hour
- Phase 5: 1 hour
- Phase 6: 1 hour

**Total: 8-9 hours**

---

## Notes

- Do not change any business logic during refactoring
- Update imports atomically (one file at a time)
- Run tests after each phase
- Update AGENTS.md as you complete each phase
