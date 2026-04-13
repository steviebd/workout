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

- **Push to `main`** → Deploys to production
- **Push to any other branch** → Deploys to staging
- **Pull requests** → Runs lint, typecheck, and tests (does not deploy)

All jobs run in parallel - deployments are not blocked by test failures.

| Branch | Deploys To |
|--------|------------|
| `main` | Production |
| Any other branch | Staging |

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
| `CLOUDFLARE_API_TOKEN` | Cloudflare API token with Workers, D1, and AI Gateway permissions |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account ID |
| `CLOUDFLARE_D1_DATABASE_ID` | D1 database ID for the environment |
| `AI_GATEWAY_NAME` | AI Gateway name (e.g., `workout-staging`, `workout-prod`) |
| `AI_MODEL_NAME` | Default model name (optional, defaults to CF Workers AI) |
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

#### 5. Cloudflare AI Gateway Setup

The app uses Cloudflare AI Gateway with BYOK (Bring Your Own Keys) for AI-powered nutrition chat.

**Create AI Gateways:**

1. Go to **Cloudflare Dashboard → AI → AI Gateway**
2. Create a gateway for each environment:
   - `workout-dev`
   - `workout-staging`
   - `workout-prod`
3. Note the gateway name for each environment

**Configure Provider Keys (BYOK):**

1. Select your gateway → **Provider Keys**
2. Add API keys for providers you want to use:
   - **xAI**: For Grok models (`xai/grok-4`)
   - **OpenAI**: For GPT models (`openai/gpt-4o`)
   - **Google**: For Gemini models (`google/gemini-2.5-pro`)
3. Keys are stored securely in Cloudflare (not in Infisical)

**Set Up Dynamic Routing:**

1. Go to **Dynamic Routes** in your gateway
2. Configure routes to route model names to providers:
   - Route `@cf/*` → Workers AI (no provider key needed)
   - Route `xai/*` → xAI
   - Route `openai/*` → OpenAI
   - Route `google/*` → Google

**Add Secrets to Infisical:**

| Secret | Description |
|--------|-------------|
| `CLOUDFLARE_ACCOUNT_ID` | Your Cloudflare account ID |
| `CLOUDFLARE_API_TOKEN` | Cloudflare API token with AI Gateway permissions |
| `AI_GATEWAY_NAME` | Gateway name per environment (e.g., `workout-prod`) |
| `AI_MODEL_NAME` | Default model (optional, defaults to `@cf/meta/llama-3.3-70b-instruct-fp8-fast`) |

**API Token Permissions:**

Create a Cloudflare API token with:
- `AI Gateway - Read`
- `AI Gateway - Edit`
- `Workers & R2` (if using Workers AI)

**Switching Models:**

To switch models, either:
1. Change `AI_MODEL_NAME` in Infisical
2. Configure dynamic routing rules in Cloudflare dashboard to intercept model names

#### 6. WHOOP Developer Dashboard Setup

To receive webhooks from WHOOP:

1. **Create a WHOOP Developer Account** at https://developer.whoop.com

2. **Configure your application:**
   - Add redirect URI: `https://fit.stevenduong.com/api/integrations/whoop/callback`
   - Add staging redirect URI: `https://staging.fit.stevenduong.com/api/integrations/whoop/callback`

3. **Create a Webhook:**
   - Navigate to Webhooks in the dashboard
   - Set URL to: `https://fit.stevenduong.com/api/webhooks/whoop`
   - Select **v2** as the model version
   - Copy the **Client Secret** (used for signature verification)

4. **Add secrets to Infisical:**
   | Secret | Value |
   |--------|-------|
   | `WHOOP_CLIENT_ID` | From WHOOP Developer Dashboard |
   | `WHOOP_CLIENT_SECRET` | From WHOOP Developer Dashboard (NOT a separate webhook secret) |
   | `WHOOP_API_URL` | `https://api.prod.whoop.com` |
   | `WHOOP_TOKEN_ENCRYPTION_KEY` | 32-byte key for encrypting tokens (generate: `openssl rand -base64 32`) |

5. **Remove old secret:**
   - Delete `WHOOP_WEBHOOK_SECRET` if it exists (no longer used - signature verification now uses `WHOOP_CLIENT_SECRET`)

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
