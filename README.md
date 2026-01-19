# Fit Workout App

A personal workout tracking application built with React, TanStack Router, Cloudflare Workers, D1, and WorkOS authentication.

## Features

- **Exercise Management** - Create and organize your exercises
- **Workout Templates** - Build reusable workout templates
- **Workout Logging** - Track sets, reps, weight, and RPE
- **History & Analytics** - View workout history and progress over time
- **Secure Authentication** - Powered by WorkOS with social/SSO login

## Tech Stack

- **Frontend**: React 19, TanStack Router, Tailwind CSS
- **Backend**: Cloudflare Workers, D1 Database
- **Auth**: WorkOS (JWT-based sessions)
- **ORM**: Drizzle ORM
- **Deployment**: Cloudflare Workers, GitHub Actions
- **Secrets**: Infisical

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) runtime
- [Infisical CLI](https://infisical.com/docs/cli) for secrets
- Cloudflare account with D1 enabled
- WorkOS account

### Installation

```bash
bun install
```

### Development

```bash
bun run dev
```

This starts the local development server on `http://localhost:8787` with a remote D1 database connection.

### Environment Variables

All secrets are managed via Infisical. The `.env.example` file documents required variables.

### Building

```bash
bun run build
```

### Deployment

### Environments

| Environment | URL | Worker | D1 Database |
|-------------|-----|--------|-------------|
| Local Dev | http://localhost:8787 | workout-dev | workout-dev-db |
| Staging | https://staging.fit.stevenduong.com | workout-staging | workout-staging-db |
| Production | https://fit.stevenduong.com | workout-prod | workout-prod-db |

### CI/CD Pipeline

The project uses GitHub Actions for automated deployments:

- **Push to `develop`** → Deploys to staging
- **Push to `main`** → Deploys to production
- **Pull requests** → Runs lint, typecheck, and tests (does not deploy)
- **Lint/Typecheck/Tests** run in parallel with deployments

All jobs run in parallel - deployments are not blocked by test failures.

### Required Setup

#### 1. GitHub Actions Secrets

Add these to **Repository → Settings → Secrets and variables → Actions**:

| Secret | Description |
|--------|-------------|
| `INFISICAL_MACHINE_IDENTITY_ID` | Infisical machine identity client ID |
| `INFISICAL_MACHINE_IDENTITY_CLIENT_SECRET` | Infisical machine identity client secret |

#### 2. Infisical Secrets

Add these secrets to Infisical in both `staging` and `prod` environments:

| Secret | Description |
|--------|-------------|
| `CLOUDFLARE_API_TOKEN` | Cloudflare API token with Workers and D1 permissions |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account ID |
| `CLOUDFLARE_D1_DATABASE_ID` | D1 database ID for the environment |
| `WORKOS_API_KEY` | WorkOS API key |
| `WORKOS_CLIENT_ID` | WorkOS client ID |

#### 3. Cloudflare Setup

1. **Create API Token**: Cloudflare → My Profile → API Tokens
   - Permissions: `Workers & R2` (read/write), `D1` (read/write)
   - Token ID → `CLOUDFLARE_API_TOKEN`

2. **Get Account ID**: Cloudflare dashboard → Workers & Pages → (right side)

3. **Create D1 Databases**:
   - `workout-staging-db` → ID → Infisical `staging.CLOUDFLARE_D1_DATABASE_ID`
   - `workout-prod-db` → ID → Infisical `prod.CLOUDFLARE_D1_DATABASE_ID`

#### 4. WorkOS Setup

Add redirect URLs to your WorkOS OAuth application:
- Staging: `https://staging.fit.stevenduong.com/auth/callback`
- Production: `https://fit.stevenduong.com/auth/callback`

### Manual Deployment

```bash
# Deploy to staging
bun run deploy:staging

# Deploy to production
bun run deploy:prod
```

## Project Structure

```
workout-app/
├── src/
│   ├── routes/              # File-based routing
│   │   ├── __root.tsx       # Root layout with auth state
│   │   ├── index.tsx        # Dashboard
│   │   ├── auth.*.tsx       # Auth routes (signin, callback, signout)
│   │   ├── exercises/       # Exercise management routes
│   │   ├── templates/       # Template management routes
│   │   ├── workouts/        # Workout logging routes
│   │   └── history/         # History views
│   ├── components/          # Reusable UI components
│   ├── lib/
│   │   ├── auth.ts          # JWT utilities
│   │   ├── session.ts       # Session management
│   │   ├── db/              # Drizzle schema and connection
│   │   │   ├── index.ts     # DB connection
│   │   │   ├── schema.ts    # Table definitions
│   │   │   └── user.ts      # User sync helpers
│   │   └── posthog.ts       # Analytics (Phase 4)
│   └── entry-client.tsx
├── docs/                    # Documentation
├── drizzle.config.ts        # Drizzle configuration
├── wrangler.toml            # Base Cloudflare config
├── wrangler.staging.toml    # Staging worker config
├── wrangler.prod.toml       # Production worker config
├── .infisical.json          # Infisical configuration
└── package.json
```

## Authentication

Authentication is handled by WorkOS with JWT-based sessions:

1. User clicks "Sign In" → redirected to WorkOS
2. User authenticates with their identity provider
3. WorkOS redirects to `/auth/callback` with authorization code
4. Server exchanges code for user profile
5. User is synced to D1 database
6. JWT token issued via HTTP-only cookie
7. Subsequent requests verified via JWT

### Auth Routes

| Route | Purpose |
|-------|---------|
| `/auth/signin` | Initiates WorkOS OAuth flow |
| `/auth/callback` | Handles OAuth callback, creates session |
| `/auth/signout` | Clears session, redirects to home |

## Database Schema

- **users** - Synced from WorkOS (workos_id, name, email)
- **exercises** - User-created exercises
- **templates** - Workout templates
- **template_exercises** - Links exercises to templates
- **workouts** - Completed workout sessions
- **workout_exercises** - Exercises within a workout
- **workout_sets** - Individual sets with weight/reps/RPE

All data is row-level secured - users only access their own data.

## Documentation

- [PDR](docs/PDR.md) - Product requirements
- [SPECSHEET](docs/SPECSHEET.md) - Technical specifications
- [ROADMAP](docs/ROADMAP.md) - Implementation plan
- [SETUP](docs/SETUP.md) - Environment setup status
- [AGENTS](docs/AGENTS.md) - AI agent instructions

## License

MIT
