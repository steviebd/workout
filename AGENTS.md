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

## External Resources
- [TanStack Start](https://tanstack.com/start)
- [Drizzle ORM](https://orm.drizzle.team)
- [Cloudflare Workers](https://developers.cloudflare.com/workers/)
- [WorkOS](https://workos.com/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Posthog](https://posthog.com/docs)
