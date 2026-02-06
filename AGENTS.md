# AGENTS.md - Development Guide for AI Agents

This document provides instructions for AI assistants (OpenCode, AmpCode, etc.) working on this project.

## Project Overview

**Fit Workout App** - A personal workout tracking application built with:
- TanStack Start + React
- Drizzle ORM + D1 (Cloudflare)
- WorkOS for authentication
- Tailwind CSS for styling
- Cloudflare Workers for deployment

## Critical Rules

### 1. NEVER Hardcode Secrets

All secrets must be fetched from Infisical. Never commit `.env` files or hardcoded API keys.

**Correct:**
```typescript
const apiKey = process.env.WORKOS_API_KEY;
```

**Incorrect:**
```typescript
const apiKey = "sk_live_123456789";
```

### 2. Use Drizzle for All Database Operations

Never write raw SQL or use direct D1 API calls. Always use Drizzle ORM.

**Correct:**
```typescript
import { db } from '~/lib/db';
import { exercises } from '~/lib/db/schema';

await db.insert(exercises).values({ ... });
```

**Incorrect:**
```typescript
const result = await env.DB.prepare('INSERT INTO exercises ...').run();
```

### 3. File-Based Routing

Routes are defined by file location in `src/routes/`. Follow the existing pattern.

**Examples:**
- `src/routes/exercises._index.tsx` → `/exercises`
- `src/routes/exercises.$id.tsx` → `/exercises/:id`
- `src/routes/templates.new.tsx` → `/templates/new`

### 4. Environment-Specific Behavior

The `ENVIRONMENT` environment variable determines behavior:

| Value | Behavior |
|-------|----------|
| `dev` | Local development, use workout-dev D1 |
| `staging` | Staging deployment, use workout-staging D1 |
| `prod` | Production deployment, use workout-prod D1 |

### 5. WorkOS Authentication

- Use WorkOS hosted UI exclusively for sign-in/sign-up
- Handle OAuth callback at `/auth/callback`
- Sync user data (id, name, email) to local DB after auth
- Store session in secure cookie

## Database Schema (Drizzle)

The schema is defined in `src/lib/db/schema.ts`. Key tables:

- **users** - Synced from WorkOS (workos_id, name, email)
- **exercises** - User-created exercises
- **templates** - Workout templates grouping exercises
- **template_exercises** - Links exercises to templates with order
- **workouts** - Completed workout sessions
- **workout_exercises** - Exercises within a workout
- **workout_sets** - Individual sets with weight/reps/RPE

## Development Commands

```bash
# Start local dev server (port 8787, remote D1 from Infisical)
bun run dev

# Initialize local D1 database with migrations (run once on first setup)
bun run db:init:dev

# Push database schema changes/updates to local D1
bun run db:push:dev

# Generate migration file from schema changes
bun run db:generate

# Apply migrations to remote dev D1
bun run db:deploy:wrangler

# Type checking
bun run typecheck

# Linting
bun run lint

# Run tests
bun run test          # Unit tests
bun run test:e2e      # Playwright E2E tests

# Build for production
bun run build

# Deploy to staging
bun run deploy:staging

# Deploy to production
bun run deploy:prod
```

## CI/CD Pipeline

1. **Push to any branch** → Lint + Typecheck + Tests
2. **Push to non-main branch** → Auto-deploy to staging
3. **Push to main** → Auto-deploy to production
4. **Pull Request** → Run full test suite

## Infisical Integration

Secrets are managed via Infisical. The `.infisical.json` file configures the workspace.

**Required secrets per environment:**

| Secret | Purpose |
|--------|---------|
| `WORKOS_API_KEY` | WorkOS authentication |
| `WORKOS_CLIENT_ID` | WorkOS OAuth client |
| `POSTHOG_API_KEY` | Analytics |
| `POSTHOG_PROJECT_URL` | Posthog server |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare API |
| `CLOUDFLARE_API_TOKEN` | Cloudflare API |
| `CLOUDFLARE_D1_DATABASE_ID` | D1 database binding |

## Styling Guidelines

- Use Tailwind CSS for all styling
- Follow existing component patterns
- No custom CSS files unless absolutely necessary
- Use Lucide React for icons

## Testing Requirements

- Write Vitest tests for all utilities and components
- Write Playwright E2E tests for critical user flows
- Run `bun run test` before committing
- E2E tests must pass in CI/CD

## Code Style

- TypeScript strict mode enabled
- ESLint configured
- No comments unless explaining complex logic
- Use functional React patterns with hooks
- Prefer file-based routes over code-based routes

## File Locations

| Purpose | Location |
|---------|----------|
| Routes | `src/routes/` |
| Components | `src/components/` |
| Database | `src/lib/db/` |
| Auth | `src/lib/auth.ts` |
| Analytics | `src/lib/posthog.ts` |
| Base Config | `wrangler.toml` |
| Staging Config | `wrangler.staging.toml` |
| Production Config | `wrangler.prod.toml` |
| Dev Script | `dev.sh` |
| Drizzle Config | `drizzle.config.ts` |

## Adding New Features

1. **Create schema changes** → Update `src/lib/db/schema.ts`
2. **Generate migration** → Run `bun run db:generate`
3. **Apply migrations** → Run `bun run db:deploy:wrangler`
4. **Create routes** → Add file in `src/routes/`
5. **Add components** → Add to `src/components/`
6. **Add tests** → Add to `tests/` directory
7. **Verify** → Run lint, typecheck, and tests

## Common Patterns

### Fetching Data in Routes

```typescript
import { createFileRoute } from '@tanstack/react-router';
import { exercises } from '~/lib/db/schema';
import { db } from '~/lib/db';

export const Route = createFileRoute('/exercises/_index')({
  loader: async () => {
    return await db.select().from(exercises);
  },
  component: ExercisesComponent,
});
```

### Protected Routes

```typescript
import { createProtectedRoute } from '~/lib/auth';

export const protectedLoader = createProtectedRoute(async ({ context }) => {
  // Only authenticated users reach here
  return { user: context.user };
});
```

### Database Inserts

```typescript
import { db } from '~/lib/db';
import { exercises } from '~/lib/db/schema';

await db.insert(exercises).values({
  userId: user.id,
  name: 'Bench Press',
  muscleGroup: 'Chest',
});
```

### Environment Detection

```typescript
const isDev = process.env.ENVIRONMENT === 'dev';
const isStaging = process.env.ENVIRONMENT === 'staging';
const isProd = process.env.ENVIRONMENT === 'prod';
```

## Troubleshooting

### D1 Binding Errors
Ensure `CLOUDFLARE_D1_DATABASE_ID` is set in Infisical for the correct environment:
- Local dev: uses dev environment
- Staging deploy: uses staging environment
- Production deploy: uses prod environment

### Worker Deployment Errors
Check which wrangler config is being used:
- Staging: `wrangler.staging.toml` → worker `workout-staging`
- Production: `wrangler.prod.toml` → worker `workout-prod`

### Local Dev Setup
For first-time local development:
1. Ensure Infisical is configured with dev environment secrets
2. Run database initialization: `bun run db:init:dev`
3. Start dev server: `bun run dev`

### Auth Errors
Check WorkOS redirect URIs match exactly:
- `http://localhost:8787/auth/callback`
- `https://staging.fit.stevenduong.com/auth/callback`
- `https://fit.stevenduong.com/auth/callback`

### Database Migration Errors
For a fresh database, run initialization:
```bash
bun run db:init:dev
```

For schema updates/changes, push migrations:
```bash
bun run db:push:dev
```


## Creating New API Endpoints

1. Create route file in `src/routes/api/`
2. Add validation schema in `src/lib/validators/` (if POST/PUT)
3. Use route helpers from `src/lib/api/`
4. Import DB functions from appropriate repository

### Example: Creating an exercise

```typescript
import { createFileRoute } from '@tanstack/react-router';
import { env } from 'cloudflare:workers';
import { requireAuth } from '~/lib/api/route-helpers';
import { validateBody } from '~/lib/api/route-helpers';
import { createExerciseSchema } from '~/lib/validators';
import { createExercise } from '~/lib/db/exercise';

export const Route = createFileRoute('/api/exercises')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const session = await requireAuth(request);
        if (!session) {
          return Response.json({ error: 'Not authenticated' }, { status: 401 });
        }

        const body = validateBody(request, createExerciseSchema);
        if (!body) {
          return Response.json({ error: 'Invalid request body' }, { status: 400 });
        }

        const db = (env as { DB?: D1Database }).DB;
        if (!db) {
          return Response.json({ error: 'Database not available' }, { status: 500 });
        }

        const exercise = await createExercise(db, {
          ...body,
          workosId: session.sub,
        });

        return Response.json(exercise, { status: 201 });
      },
    },
  },
});
```

## Creating New Database Functions

1. Identify the domain (workout, exercise, template)
2. Add to appropriate repository in `src/lib/db/{domain}/repository.ts`
3. Add types to `src/lib/db/{domain}/types.ts` if needed
4. Export from `src/lib/db/{domain}/index.ts`
5. Add unit tests in `tests/unit/`

## Code Review Checklist

- [ ] Auth check using `requireAuth()` helper
- [ ] Input validated with Zod schema (for POST/PUT)
- [ ] DB operations use repository functions from `src/lib/db/`
- [ ] Error responses are consistent
- [ ] Tests cover success + error cases
- [ ] No hardcoded strings for limits - use constants from route-helpers

## Import Patterns

| Pattern | Usage | Example |
|---------|-------|---------|
| `@/` | Components | `import Button from '@/components/ui/Button'` |
| `~/` | Lib utilities | `import { db } from '~/lib/db'` |
| `~/api/` | API helpers | `import { requireAuth } from '~/lib/api/route-helpers'` |
| `~/validators/` | Validation | `import { createExerciseSchema } from '~/lib/validators'` |
| Relative | Same directory | `import { type Foo } from './types'` |

## API Common Patterns

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

## File Structure Reference

```
src/lib/db/
├── schema.ts                    # Database tables
├── exercise/
│   ├── index.ts                # Exports
│   ├── types.ts                # Exercise types
│   └── repository.ts            # Exercise CRUD
├── workout/
│   ├── index.ts
│   ├── types.ts
│   └── repository.ts
├── template/
│   ├── index.ts
│   ├── types.ts
│   └── repository.ts

src/lib/api/
├── route-helpers.ts             # requireAuth, validateBody
├── errors.ts                    # createApiError

src/lib/validators/
├── index.ts                     # All exports
├── exercise.schema.ts
├── template.schema.ts
└── workout.schema.schema.ts
```

## Resources

- [TanStack Start Docs](https://tanstack.com/start)
- [Drizzle ORM Docs](https://orm.drizzle.team)
- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [WorkOS Docs](https://workos.com/docs)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [Posthog Docs](https://posthog.com/docs)
