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

### Use query keys for caching
```typescript
const queryClient = new QueryClient();

const { data: exercises } = useQuery({
  queryKey: ['exercises', userId],
  queryFn: () => fetchExercises(userId),
  staleTime: 5 * 60 * 1000, // 5 minutes
});
```

## Bundle Size

### Lazy load routes
```typescript
const AsyncWorkout = lazy(() => import('./routes/workouts.$id'));
```

### Avoid large dependencies
Prefer lightweight alternatives:
- `date-fns` over `moment`
- `clsx`/`tailwind-merge` for class composition
- `lucide-react` for icons
