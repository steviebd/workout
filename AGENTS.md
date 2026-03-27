# Development Guide

## Quick Reference
- [Offline Architecture](docs/OFFLINE.md)
- [Components](docs/COMPONENTS.md)
- [API Errors](docs/API.md)
- [Performance](docs/PERFORMANCE.md)

## Project Overview
**Fit Workout App** - Personal workout tracking with TanStack Start + React, Drizzle ORM + D1, WorkOS auth, Tailwind CSS, Cloudflare Workers.

## Database Schema
See `src/lib/db/schema.ts` with section headers.

## Development Commands

| Command | Purpose |
|---------|---------|
| `bun run dev` | Start local dev server (port 8787) |
| `bun run db:init:dev` | Initialize local D1 |
| `bun run db:push:dev` | Push schema to local D1 |
| `bun run db:generate` | Generate migration file |
| `bun run db:deploy:wrangler` | Apply migrations to remote dev D1 |
| `bun run typecheck` | Type checking |
| `bun run lint` | Linting |
| `bun run test` | Unit tests |
| `bun run test:e2e` | Playwright E2E tests |
| `bun run build` | Build for production |
| `bun run deploy:staging` | Deploy to staging |
| `bun run deploy:prod` | Deploy to production |

## CI/CD Pipeline
1. **Push any branch** → Lint + Typecheck + Tests
2. **Push non-main** → Auto-deploy to staging
3. **Push main** → Auto-deploy to production
4. **Pull Request** → Full test suite

## Environment Detection

| Value | Behavior |
|-------|----------|
| `dev` | Local dev, workout-dev D1 |
| `staging` | Staging, workout-staging D1 |
| `prod` | Production, workout-prod D1 |

## Required Secrets (Infisical)

| Secret | Purpose |
|--------|---------|
| `WORKOS_API_KEY` | WorkOS authentication |
| `WORKOS_CLIENT_ID` | WorkOS OAuth client |
| `POSTHOG_API_KEY` | Analytics |
| `POSTHOG_PROJECT_URL` | Posthog server |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare API |
| `CLOUDFLARE_API_TOKEN` | Cloudflare API |
| `CLOUDFLARE_D1_DATABASE_ID` | D1 database binding |

## File Locations

| Purpose | Location |
|---------|----------|
| Routes | `src/routes/` |
| Components | `src/components/` |
| Database | `src/lib/db/` |
| Auth | `src/lib/auth.ts` |
| Analytics | `src/lib/posthog.ts` |
| Wrangler configs | `wrangler*.toml` |
| Drizzle config | `drizzle.config.ts` |

## Import Patterns

| Pattern | Usage | Example |
|---------|-------|---------|
| `@/` | Components | `import Button from '@/components/ui/Button'` |
| `~/` | Lib utilities | `import { db } from '~/lib/db'` |
| `~/api/` | API helpers | `import { requireAuth } from '~/lib/api/route-helpers'` |
| `~/validators/` | Validation | `import { createExerciseSchema } from '~/lib/validators'` |
| Relative | Same directory | `import { type Foo } from './types'` |

## Database Structure

```
src/lib/db/
├── schema.ts                    # Tables
├── exercise/
│   ├── index.ts
│   ├── types.ts
│   └── repository.ts
├── workout/
│   ├── index.ts
│   ├── types.ts
│   └── repository.ts
├── template/
│   ├── index.ts
│   ├── types.ts
│   └── repository.ts
```

## Key Rules
- **Never hardcode secrets** - Use Infisical
- **Use Drizzle ORM** - No raw SQL or direct D1 API
- **File-based routing** - Routes in `src/routes/`
- **WorkOS hosted UI** - Auth at `/auth/callback`
- **Use TanStack Query for data fetching** - Never use `useEffect` for API calls

## Naming Conventions

### Internal vs External APIs

The codebase uses `camelCase` for internal TypeScript/React code. However, external APIs and analytics services often require `snake_case`.

| Context | Convention | Example |
|---------|------------|---------|
| Internal app code | `camelCase` | `templateId`, `workoutId` |
| Analytics/Posthog | `snake_case` | `template_id`, `workout_id` |
| OAuth params (Whoop, WorkOS) | `snake_case` | `client_id`, `response_type` |

**Rule:** Keep `snake_case` for external APIs and analytics. Use `camelCase` internally.

When the mix of conventions is confusing, add a mapping layer at the API boundary:

```typescript
// External API (snake_case)
const payload = { template_id: templateId, workout_id: workoutId };
trackEvent('workout_started', payload);

// Internal conversion helper if needed
const toExternalFormat = (data: { templateId: string }) => ({
  template_id: data.templateId,
});
```

## Data Fetching with TanStack Query

### When to Use TanStack Query
Use `useQuery` for **all API data fetching**. This includes:
- Fetching workout, exercise, template, or program data
- Loading user preferences or settings
- Any `fetch()` call that populates component state

### When to Keep useEffect
useEffect is appropriate for **side effects that are NOT data fetching**:
- Event listener setup/cleanup (scroll, resize, IntersectionObserver)
- DOM manipulation
- Analytics tracking (page views, errors)
- Auth state handling with complex caching
- Auto-save debouncing
- LocalStorage/sync state management

### TanStack Query Pattern

```typescript
import { useQuery } from '@tanstack/react-query';

// GOOD: useQuery for data fetching
const { data, isLoading } = useQuery<MyData>({
  queryKey: ['my-data', id],
  queryFn: async () => {
    const res = await fetch(`/api/data/${id}`, { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch');
    return res.json();
  },
  enabled: !!auth.user && !!id, // Don't run if id is missing
});
```

### Derived State Pattern

For form state initialized from query data, use `useEffect` to sync, not `useMemo`:

```typescript
// GOOD: useState + useEffect sync from query
const [formData, setFormData] = useState({ name: '', description: '' });

useEffect(() => {
  if (data) {
    setFormData({ name: data.name, description: data.description });
  }
}, [data]);

// GOOD: useMemo for computed values (not form state)
const isValid = useMemo(() => formData.name.length > 0, [formData.name]);
```

### Infinite Scroll / Pagination

Use TanStack Query with page state for infinite scroll:

```typescript
const [page, setPage] = useState(1);

const { data } = useQuery({
  queryKey: ['items', page, filters],
  queryFn: () => fetchItems(page, filters),
  enabled: !!auth.user,
});

// IntersectionObserver only updates page state, doesn't call fetch
useEffect(() => {
  const observer = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting && hasMore) {
      setPage((p) => p + 1);
    }
  }, { rootMargin: '500px' });
  // observer setup...
}, [hasMore]);
```

### Query Invalidation

After mutations, invalidate related queries:

```typescript
const mutation = useMutation({
  mutationFn: createItem,
  onSuccess: () => {
    void queryClient.invalidateQueries({ queryKey: ['items'] });
  },
});
```

### Common Mistakes

```typescript
// BAD: useEffect + manual fetch for data
useEffect(() => {
  const fetchData = async () => {
    const res = await fetch('/api/data');
    setData(await res.json());
  };
  fetchData();
}, [id]);

// GOOD: TanStack Query
const { data } = useQuery({
  queryKey: ['data', id],
  queryFn: () => fetch('/api/data').then(r => r.json()),
  enabled: !!id,
});
```

## External Resources
- [TanStack Start](https://tanstack.com/start)
- [Drizzle ORM](https://orm.drizzle.team)
- [Cloudflare Workers](https://developers.cloudflare.com/workers/)
- [WorkOS](https://workos.com/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Posthog](https://posthog.com/docs)
