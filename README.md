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
