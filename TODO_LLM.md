# LLM/Agent Readability Improvements Plan

This document outlines improvements to make the codebase more accessible and navigable for LLM/AI agents.

## Goal
Reduce the time and context required for an LLM to understand, navigate, and contribute to the codebase by using a modular documentation architecture.

## Documentation Architecture

AGENTS.md serves as the **index** and **quick reference**. Detailed topics are delegated to separate docs in `docs/` that AGENTS.md references.

```
AGENTS.md (main index)
├── references docs/OFFLINE.md
├── references docs/COMPONENTS.md
├── references docs/API.md
├── references docs/PERFORMANCE.md
└── keeps only high-level patterns & quick lookup tables
```

This reduces AGENTS.md size and keeps context windows manageable.

---

## Phase 1: Create Reference Documents

### 1. Document Offline-First Architecture

**Status:** Pending  
**Priority:** High  
**Effort:** Low

**Output:** `docs/OFFLINE.md`

```markdown
# Offline-First Architecture

## Data Flow
1. Client creates data → stored in IndexedDB (Dexie)
2. Data marked as `syncStatus: 'pending'`
3. When online → sync to remote D1
4. Conflict resolution → uses last-write-wins with timestamp

## Key Files
- `src/lib/db/local-db.ts` - IndexedDB wrapper and schema
- `src/lib/db/local-repository.ts` - Offline CRUD operations
- `src/lib/sync/sync-engine.ts` - Sync logic and conflict resolution

## Important Patterns
- Never write directly to D1 when offline
- Always check `syncStatus` before operations
- Use `localId` for offline records, `id` for synced records
```

---

### 2. Create Component Documentation

**Status:** Pending  
**Priority:** Medium  
**Effort:** Low

**Output:** `docs/COMPONENTS.md`

```markdown
# Component Documentation

## UI Component Library
All UI components use Radix UI primitives under the hood.

## Pattern: CVA Variants
```typescript
const buttonVariants = cva("base-styles", {
  variants: {
    variant: { primary: "...", secondary: "..." },
    size: { sm: "...", md: "...", lg: "..." }
  }
});
```

## Pattern: Compound Components
Dialog, Select, Drawer use compound component pattern.

## Icon Usage
Use Lucide React icons:
```tsx
import { Plus, Trash, Edit } from 'lucide-react';
```

## File Locations
- Primitive components: `src/components/ui/`
- Feature components: `src/components/{feature}/` (achievements, dashboard, progress, workouts)
- Shared layouts: `src/components/PageLayout.tsx`
```

---

### 3. API Error Reference

**Status:** Pending  
**Priority:** Medium  
**Effort:** Low

**Output:** `docs/API.md`

```markdown
# API Reference

## Error Response Format
All API errors follow this format:
```typescript
{ error: string; code: string; details?: unknown }
```

## Error Codes
| Code | HTTP Status | Meaning | Common Cause |
|------|-------------|---------|--------------|
| NOT_AUTHENTICATED | 401 | No valid session | Token expired |
| NOT_FOUND | 404 | Resource doesn't exist | Invalid ID |
| CONFLICT | 409 | Duplicate entry | Same localId exists |
| INVALID_BODY | 400 | Schema validation failed | Missing required field |
| DB_ERROR | 500 | Database operation failed | Connection issue |

## Error Handling Pattern
```typescript
try {
  await db.insert(...).values(...);
} catch (error) {
  if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
    throw new ApiError('CONFLICT', 'Resource already exists');
  }
  throw new ApiError('DB_ERROR', 'Database operation failed');
}
```
```

---

### 4. Performance Guidelines

**Status:** Pending  
**Priority:** Low  
**Effort:** Low

**Output:** `docs/PERFORMANCE.md`

```markdown
# Performance Guidelines

## Database Queries

### Prefer `.get()` for single records
```typescript
// Bad - returns array with one element
const result = await db.select().from(users).where(eq(users.id, id));

// Good - returns single object
const user = await db.select().from(users).where(eq(users.id, id)).get();
```

### Use `.limit()` for pagination
```typescript
const workouts = await db
  .select()
  .from(workouts)
  .where(eq(workouts.workosId, workosId))
  .orderBy(desc(workouts.startedAt))
  .limit(20)
  .offset(0);
```

### Avoid N+1 queries in templates
```typescript
// Bad - N+1 queries
for (const template of templates) {
  const exercises = await getTemplateExercises(template.id);
}

// Good - single query with join
const templatesWithExercises = await db
  .select({
    template: templates,
    exercises: templateExercises,
  })
  .from(templates)
  .leftJoin(templateExercises, eq(templates.id, templateExercises.templateId));
```

## React Performance

### Use `useMemo` for expensive computations
```typescript
const processedData = useMemo(() => {
  return data.filter(x => x.active).sort(byDate);
}, [data]);
```

### Use `React.memo` for large lists
```typescript
const WorkoutSet = React.memo(({ set }) => (
  <SetRow data={set} />
));
```
```

---

## Phase 2: Code-Level Improvements

### 5. JSDoc Comments for Repository Functions

**Status:** Pending  
**Priority:** High  
**Effort:** Medium

### Files to Update
- `src/lib/db/exercise.ts`
- `src/lib/db/workout.ts`
- `src/lib/db/template.ts`
- `src/lib/db/program.ts`
- `src/lib/db/template/repository.ts`
- `src/lib/db/workout/repository.ts`
- `src/lib/db/local-db.ts`
- `src/lib/db/local-repository.ts`
- `src/lib/db/preferences.ts`
- `src/lib/db/user.ts`

### Template
```typescript
/**
 * Creates a new exercise for a user
 * @param db - D1 database instance
 * @param data - Exercise creation data including workosId
 * @returns The created exercise with all fields populated
 * @throws Will throw if database operation fails
 */
export async function createExercise(...)
```

---

### 6. Add Schema Header Comments

**Status:** Pending  
**Priority:** High  
**Effort:** Low

### Target: `src/lib/db/schema.ts`

Add section dividers:

```typescript
// ============================================
// CORE ENTITIES
// ============================================
export const users = sqliteTable('users', { ... });
export const userPreferences = sqliteTable('user_preferences', { ... });

// ============================================
// EXERCISE LIBRARY
// ============================================
export const exercises = sqliteTable('exercises', { ... });

// ============================================
// TEMPLATES (Workout Blueprints)
// ============================================
export const templates = sqliteTable('templates', { ... });
export const templateExercises = sqliteTable('template_exercises', { ... });

// ============================================
// WORKOUTS (Completed Sessions)
// ============================================
export const workouts = sqliteTable('workouts', { ... });
export const workoutExercises = sqliteTable('workout_exercises', { ... });
export const workoutSets = sqliteTable('workout_sets', { ... });

// ============================================
// GAMIFICATION & STREAKS
// ============================================
export const userStreaks = sqliteTable('user_streaks', { ... });

// ============================================
// PROGRAMS (Multi-Week Training Plans)
// ============================================
export const userProgramCycles = sqliteTable('user_program_cycles', { ... });
export const programCycleWorkouts = sqliteTable('program_cycle_workouts', { ... });

// ============================================
// DATABASE INDEXES
// ============================================
// ... existing indexes ...
```

---

### 7. Validators Index

**Status:** Pending  
**Priority:** Medium  
**Effort:** Low

### Target: `src/lib/validators/index.ts`

Ensure this file exists and exports all schemas:

```typescript
export * from './exercise.schema';
export * from './template.schema';
export * from './workout.schema';
export * from './program.schema';
```

---

## Phase 3: AGENTS.md Updates

After creating reference documents, update AGENTS.md to:

1. **Add reference section** at top with links to docs/
2. **Keep only quick lookup tables** (constants, error codes, type patterns)
3. **Link to detailed docs** instead of embedding content

### New AGENTS.md Structure

```markdown
# Development Guide

## Quick Reference
- [Offline Architecture](docs/OFFLINE.md)
- [Components](docs/COMPONENTS.md)
- [API Errors](docs/API.md)
- [Performance](docs/PERFORMANCE.md)

## Database Schema
See `src/lib/db/schema.ts` with section headers

## Type Patterns
| Pattern | Example | Use |
|---------|---------|-----|
| `{Entity}` | `Exercise` | DB row type |
| `New{Entity}` | `NewExercise` | DB insert type |
| `Create{Entity}Data` | `CreateExerciseData` | API create input |
```

---

## Implementation Order

| Order | Task | Output | Priority |
|-------|------|--------|----------|
| 1 | Create docs/OFFLINE.md | Offline-first architecture | High |
| 2 | Create docs/COMPONENTS.md | UI patterns | Medium |
| 3 | Create docs/API.md | Error codes | Medium |
| 4 | Create docs/PERFORMANCE.md | Performance patterns | Low |
| 5 | Add schema headers | `src/lib/db/schema.ts` | High |
| 6 | Add JSDoc to repos | `src/lib/db/*.ts` | High |
| 7 | Validators index | `src/lib/validators/index.ts` | Medium |
| 8 | Update AGENTS.md | Add reference section | Medium |

---

## Verification

After implementing changes, verify with:

```bash
# Check JSDoc coverage
grep -r "@param\|@returns" src/lib/db/ | wc -l

# Verify imports work
bun run typecheck

# Run lint
bun run lint
```

---

## Related Files

- `AGENTS.md` - Main index (keep lean)
- `docs/OFFLINE.md` - Offline-first documentation
- `docs/COMPONENTS.md` - Component patterns
- `docs/API.md` - API errors and responses
- `docs/PERFORMANCE.md` - Performance guidelines
- `README.md` - Project overview
- `docs/SPECSHEET.md` - Technical specifications
