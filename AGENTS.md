# Development Guide

## Project Overview
**Fit Workout App** - Personal workout tracking with TanStack Start + React, Drizzle ORM + D1, WorkOS auth, Tailwind CSS, Cloudflare Workers.

## Key Rules
- **Never hardcode secrets** - Use Infisical
- **Use Drizzle ORM** - No raw SQL or direct D1 API
- **File-based routing** - Routes in `src/routes/`
- **WorkOS hosted UI** - Auth at `/auth/callback`
- **Use TanStack Query for data fetching** - Never use `useEffect` for API calls

## Development Commands

| Command | Purpose |
|---------|---------|
| `bun run dev` | Start local dev server (port 8787) |
| `bun run db:init:dev` | Initialize local D1 |
| `bun run db:push:dev` | Push schema to local D1 |
| `bun run db:generate` | Generate migration file |
| `bun run db:deploy:wrangler` | Apply migrations to remote dev D1 |
| `bun run db:deploy:staging` | Apply migrations to remote dev D1 |
| `bun run db:deploy:prod` | Apply migrations to remote dev D1 |
| `bun run typecheck` | Type checking |
| `bun run lint` | Linting |
| `bun run test` | Unit tests |
| `bun run check` | Both Linting and Unit Tests |
| `bun run test:e2e` | Playwright E2E tests |
| `bun run build` | Build for production |

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

## File Locations

| Purpose | Location |
|---------|----------|
| Routes | `src/routes/` |
| Components | `src/components/` |
| Database | `src/lib/db/` |
| Auth | `src/lib/auth.ts` |
| Analytics | `src/lib/posthog.ts` |

## Import Patterns

| Pattern | Usage | Example |
|---------|-------|---------|
| `@/` | Components | `import Button from '@/components/ui/Button'` |
| `~/` | Lib utilities | `import { db } from '~/lib/db'` |
| `~/api/` | API helpers | `import { requireAuth } from '~/lib/api/route-helpers'` |
| `~/validators/` | Validation | `import { createExerciseSchema } from '~/lib/validators'` |

## Database Schema
See `src/lib/db/schema.ts` with section headers.

## Secrets
All secrets managed via Infisical and should never be stored locally or hardcoded.
