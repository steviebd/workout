# Technical Specifications

## Project Structure

```
workout-app/
├── src/
│   ├── routes/              # File-based routing
│   │   ├── _root.tsx       # Root layout
│   │   ├── index.tsx       # Dashboard
│   │   ├── auth.callback.tsx
│   │   ├── exercises/
│   │   ├── templates/
│   │   ├── workouts/
│   │   └── history/
│   ├── components/          # Reusable UI components
│   ├── lib/                 # Utilities and configurations
│   │   ├── db/             # Drizzle schema and connection
│   │   ├── auth.ts         # WorkOS integration
│   │   └── posthog.ts      # Analytics
│   └── entry-client.tsx
├── docs/                    # Documentation
├── public/                  # Static assets
├── wrangler.toml           # Base Cloudflare Worker config
├── wrangler.staging.toml   # Staging worker config
├── wrangler.prod.toml      # Production worker config
├── drizzle.config.ts       # Drizzle configuration
├── .infisical.json         # Infisical configuration
└── package.json
```

## Environment Variables (.env.example)

```bash
# Infisical manages all secrets - these are for local reference only
# DO NOT COMMIT ACTUAL VALUES

# App Configuration
NODE_ENV=development

# WorkOS (get from Infisical)
WORKOS_API_KEY=
WORKOS_CLIENT_ID=

# Posthog (get from Infisical)
POSTHOG_API_KEY=
POSTHOG_PROJECT_URL=

# Cloudflare (get from Infisical)
CLOUDFLARE_ACCOUNT_ID=
CLOUDFLARE_API_TOKEN=
CLOUDFLARE_D1_DATABASE_ID=

# Environment (dev/staging/prod) - Infisical sets this
ENVIRONMENT=development
```

## Drizzle Schema

```typescript
import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// Users table - synced from WorkOS
export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  workosId: text('workos_id').notNull().unique(),
  name: text('name').notNull(),
  email: text('email').notNull(),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

// Exercises - primary building blocks
export const exercises = sqliteTable('exercises', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  muscleGroup: text('muscle_group'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

// Templates - workout templates
export const templates = sqliteTable('templates', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

// Template Exercises - links exercises to templates with ordering
export const templateExercises = sqliteTable('template_exercises', {
  id: text('id').primaryKey(),
  templateId: text('template_id').notNull().references(() => templates.id, { onDelete: 'cascade' }),
  exerciseId: text('exercise_id').notNull().references(() => exercises.id, { onDelete: 'cascade' }),
  orderIndex: integer('order_index').notNull(),
  targetSets: integer('target_sets'),
  targetReps: integer('target_reps'),
  notes: text('notes'),
});

// Workouts - completed workout sessions
export const workouts = sqliteTable('workouts', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  templateId: text('template_id').references(() => templates.id, { onDelete: 'set null' }),
  name: text('name').notNull(),
  startedAt: text('started_at').notNull(),
  completedAt: text('completed_at'),
  notes: text('notes'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

// Workout Exercises - exercises within a completed workout
export const workoutExercises = sqliteTable('workout_exercises', {
  id: text('id').primaryKey(),
  workoutId: text('workout_id').notNull().references(() => workouts.id, { onDelete: 'cascade' }),
  exerciseId: text('exercise_id').notNull().references(() => exercises.id, { onDelete: 'cascade' }),
  orderIndex: integer('order_index').notNull(),
  notes: text('notes'),
});

// Workout Sets - actual performed sets with all attempts
export const workoutSets = sqliteTable('workout_sets', {
  id: text('id').primaryKey(),
  workoutExerciseId: text('workout_exercise_id').notNull().references(() => workoutExercises.id, { onDelete: 'cascade' }),
  setNumber: integer('set_number').notNull(),
  weight: real('weight'),
  reps: integer('reps'),
  rpe: real('rpe'),
  isComplete: integer('is_complete', { mode: 'boolean' }).default(false),
  completedAt: text('completed_at'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});
```

## Relationships

```
users (1) ──► (many) exercises
users (1) ──► (many) templates
users (1) ──► (many) workouts

templates (1) ──► (many) templateExercises
exercises (1) ──► (many) templateExercises

workouts (1) ──► (many) workoutExercises
exercises (1) ──► (many) workoutExercises

workoutExercises (1) ──► (many) workoutSets
```

## Routing Structure (File-Based)

| File | Path | Description |
|------|------|-------------|
| `_root.tsx` | `/` | Root layout with auth state |
| `index.tsx` | `/` | Dashboard (requires auth) |
| `auth.signin.tsx` | `/auth/signin` | Initiates WorkOS OAuth |
| `auth.callback.tsx` | `/auth/callback` | Handles OAuth callback, creates session |
| `auth.signout.tsx` | `/auth/signout` | Clears session, redirects home |
| `exercises._index.tsx` | `/exercises` | List exercises (requires auth) |
| `exercises.new.tsx` | `/exercises/new` | Create exercise (requires auth) |
| `exercises.$id.tsx` | `/exercises/:id` | Exercise details (requires auth) |
| `templates._index.tsx` | `/templates` | List templates (requires auth) |
| `templates.new.tsx` | `/templates/new` | Create template (requires auth) |
| `templates.$id.tsx` | `/templates/:id` | Template details (requires auth) |
| `workouts.new.tsx` | `/workouts/new` | Start new workout (requires auth) |
| `workouts.$id.tsx` | `/workouts/:id` | Workout details (requires auth) |
| `history._index.tsx` | `/history` | All workout history (requires auth) |
| `history.$exerciseId.tsx` | `/history/:exerciseId` | History filtered by exercise (requires auth) |

## Infisical Environment Configuration

| Infisical Environment | GitHub Branch | Cloudflare Worker | D1 Database | ENVIRONMENT Value |
|----------------------|---------------|-------------------|-------------|-------------------|
| Development | local | workout-dev | workout-dev-db | dev |
| Staging | any non-main | workout-staging | workout-staging-db | staging |
| Production | main | workout-prod | workout-prod-db | prod |

### Required Infisical Secrets

```
# All Environments
CLOUDFLARE_ACCOUNT_ID
CLOUDFLARE_API_TOKEN

# Development
WORKOS_API_KEY (dev value)
WORKOS_CLIENT_ID (dev value)
POSTHOG_API_KEY (dev value)
POSTHOG_PROJECT_URL (dev value)

# Staging
WORKOS_API_KEY (staging value)
WORKOS_CLIENT_ID (staging value)
POSTHOG_API_KEY (staging value)
POSTHOG_PROJECT_URL (staging value)

# Production
WORKOS_API_KEY (prod value)
WORKOS_CLIENT_ID (prod value)
POSTHOG_API_KEY (prod value)
POSTHOG_PROJECT_URL (prod value)
```

## GitHub Actions CI/CD Workflow

### Single Workflow: `.github/workflows/deploy.yml`

**Triggers:**
- Push to `main` → Production deploy
- Push to any other branch → Staging deploy
- Pull requests → Lint + Type check + Unit tests

**Jobs:**
1. `lint` - ESLint
2. `typecheck` - TypeScript
3. `test` - Vitest
4. `deploy-staging` - Deploy to staging (on non-main push)
5. `deploy-production` - Deploy to production (on main push)

## D1 Database Setup Commands

```bash
# Create databases
wrangler d1 create workout-dev-db
wrangler d1 create workout-staging-db
wrangler d1 create workout-prod-db

# Apply schema
wrangler d1 execute workout-dev-db --file=./drizzle/schema.sql --remote
wrangler d1 execute workout-staging-db --file=./drizzle/schema.sql --remote
wrangler d1 execute workout-prod-db --file=./drizzle/schema.sql --remote

# Generate migrations
drizzle-kit generate
```

## Development Commands

```bash
# Local development (port 8787, remote D1 from Infisical)
bun run dev

# Type checking
bun run typecheck

# Linting
bun run lint

# Testing
bun run test          # Unit tests
bun run test:e2e      # Playwright E2E tests

# Build
bun run build

# Deploy to staging (non-main branches)
bun run deploy:staging

# Deploy to production (main branch)
bun run deploy:prod
```

## Wrangler Configuration

The project uses **three wrangler configuration files** to handle different environments. No secrets are hardcoded - all sensitive values come from Infisical at deploy time.

### wrangler.toml (Base Configuration - Used for Build)

```toml
name = "workout"
main = "@tanstack/react-start/server-entry"
compatibility_date = "2025-09-02"

[observability]
enabled = true

[vars]
ENVIRONMENT = "${ENVIRONMENT}"

[[d1_databases]]
binding = "DB"
database_name = "workout-${ENVIRONMENT}-db"
database_id = "${CLOUDFLARE_D1_DATABASE_ID}"
```

### wrangler.staging.toml (Staging Worker Deployment)

```toml
name = "workout-staging"
main = "@tanstack/react-start/server-entry"
compatibility_date = "2025-09-02"

[observability]
enabled = true

[vars]
ENVIRONMENT = "staging"

[[d1_databases]]
binding = "DB"
database_name = "workout-staging-db"
database_id = "${CLOUDFLARE_D1_DATABASE_ID}"

[[routes]]
pattern = "staging.fit.stevenduong.com/*"
zone_name = "fit.stevenduong.com"
```

### wrangler.prod.toml (Production Worker Deployment)

```toml
name = "workout-prod"
main = "@tanstack/react-start/server-entry"
compatibility_date = "2025-09-02"

[observability]
enabled = true

[vars]
ENVIRONMENT = "prod"

[[d1_databases]]
binding = "DB"
database_name = "workout-prod-db"
database_id = "${CLOUDFLARE_D1_DATABASE_ID}"

[[routes]]
pattern = "fit.stevenduong.com/*"
zone_name = "fit.stevenduong.com"
```

### Configuration Flow

1. **Infisical** provides `CLOUDFLARE_D1_DATABASE_ID` per environment
2. **CI/CD** exports the secret as an environment variable
3. **wrangler** substitutes `${CLOUDFLARE_D1_DATABASE_ID}` at deploy time
4. **No secrets in repo** - All wrangler config files are safe to commit

### Environment Mapping

| Context | Config File | Worker Name | D1 Database | URL |
|---------|-------------|-------------|-------------|-----|
| Local dev | `dev.sh` (script) | (local) | `workout-dev-db` | localhost:8787 |
| CI/CD staging | `wrangler.staging.toml` | `workout-staging` | `workout-staging-db` | staging.fit.stevenduong.com |
| CI/CD prod | `wrangler.prod.toml` | `workout-prod` | `workout-prod-db` | fit.stevenduong.com |

### Local Development

The `dev.sh` script handles local development:

```bash
bun run dev  # Runs dev.sh which fetches D1 ID from Infisical
```

The script:
1. Gets `CLOUDFLARE_D1_DATABASE_ID` from Infisical dev environment
2. Kills any process on port 8787
3. Runs `wrangler dev --local` with the D1 binding

## WorkOS Integration

### Setup

1. Create WorkOS account
2. Configure redirect URIs:
   - `http://localhost:8787/auth/callback`
   - `https://staging.fit.stevenduong.com/auth/callback`
   - `https://fit.stevenduong.com/auth/callback`
3. Get API Key and Client ID
4. Store in Infisical per environment

### Auth Flow (JWT-Based)

```
1. User clicks "Sign In"
2. Redirect to WorkOS hosted auth page (or SSO provider)
3. User completes auth with their identity provider
4. WorkOS redirects to /auth/callback with authorization code
5. Server exchanges code for user profile using WorkOS SDK
6. User is synced to local D1 database (getOrCreateUser)
7. JWT token generated with user claims (userId, email, workosId)
8. JWT stored in HTTP-only, Secure cookie
9. Redirect to dashboard
10. Subsequent requests: verify JWT from cookie, extract userId
11. All D1 queries filtered by session.userId (row-level security)
```

### JWT Configuration

| Setting | Value |
|---------|-------|
| Algorithm | HS256 |
| Secret | WorkOS API Key |
| Expiration | 7 days (604800 seconds) |
| Storage | HTTP-only, Secure, SameSite=Lax cookie |
| Library | `jose` |

### JWT Payload

```typescript
{
  sub: string;      // WorkOS user ID
  userId: string;   // Local D1 user ID
  email: string;    // User email
  iat: number;      // Issued at timestamp
  exp: number;      // Expiration timestamp
}
```

### Session Management

| Function | Purpose |
|----------|---------|
| `getSession(request)` | Extract and verify JWT from cookie, return session or null |
| `createSession(user, response)` | Generate JWT, set cookie on response |
| `destroySession(response)` | Clear session cookie, redirect to home |

### Row-Level Security

All database queries must filter by the authenticated user's ID:

```typescript
// Example: Get exercises for current user
const session = await getSession(request);
if (!session) throw new Response('Unauthorized', { status: 401 });

const userExercises = await db
  .select()
  .from(exercises)
  .where(eq(exercises.userId, session.userId));
```

### User Sync

Users are synced from WorkOS to D1 on first login:

```typescript
async function getOrCreateUser(profile: UserProfile) {
  // Try to find existing user by workos_id
  const existing = await db
    .select()
    .from(users)
    .where(eq(users.workosId, profile.id))
    .get();

  if (existing) return existing;

  // Create new user
  const newUser = await db.insert(users).values({
    workosId: profile.id,
    email: profile.email,
    name: profile.firstName + ' ' + profile.lastName,
  }).returning().get();

  return newUser;
}

## Posthog Integration

### Setup

1. Create Posthog project
2. Get API Key and Project URL
3. Store in Infisical per environment

### Events to Track

- `page_view` - Route changes
- `user_signed_in` - Auth completion
- `exercise_created` - New exercise
- `template_created` - New template
- `workout_started` - Workout session begins
- `workout_completed` - Workout session ends
- `set_logged` - Individual set completed

## Testing Strategy

### Unit Tests (Vitest)

- Database operations
- Utility functions
- Component logic
- Auth helpers

### E2E Tests (Playwright)

- Full auth flow
- Create exercise → create template → start workout → log sets
- View history and filter
- Sign out flow

## Security Rules

1. **No hardcoded secrets** - All via Infisical
2. **No direct SQL** - Use Drizzle ORM only
3. **Row-level security** - Users only access their own data
4. **Environment isolation** - Dev/Staging/Prod completely separate
5. **HTTPS only** - Enforced by Cloudflare

## Performance Targets

- TTFB: < 100ms
- Lighthouse Score: > 90
- 100% test coverage on critical paths
- Zero console errors in production
