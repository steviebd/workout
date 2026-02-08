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

## Common Patterns

### Fetching Data (Read)

```typescript
GET: async ({ request }) => {
  const session = await requireAuth(request);
  if (!session) {
    return Response.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const url = new URL(request.url);
  const id = url.searchParams.get('id');

  const exercise = await getExerciseById(db, id!, session.sub);
  if (!exercise) {
    return Response.json({ error: 'Not found' }, { status: 404 });
  }

  return Response.json(exercise);
}
```

### Creating Data (Write)

```typescript
POST: async ({ request }) => {
  const session = await requireAuth(request);
  if (!session) {
    return Response.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const body = validateBody(request, createExerciseSchema);
  if (!body) {
    return Response.json({ error: 'Invalid body' }, { status: 400 });
  }

  const exercise = await createExercise(db, { ...body, workosId: session.sub });
  return Response.json(exercise, { status: 201 });
}
```

## Input Validation Schemas

Available validators in `src/lib/validators/`:
- `exercise.schema.ts` - Exercise creation/update validation
- `template.schema.ts` - Template creation/update validation
- `workout.schema.ts` - Workout creation/update validation
- `program.schema.ts` - Program creation/update validation
