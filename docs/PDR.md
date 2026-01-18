# Product Design Document (PDR)

## Overview

**Project Name:** Fit Workout App

**Purpose:** A personal workout tracking application that enables users to create exercise templates, log workout sessions, and track their fitness progress over time.

**Target Users:** Individual users tracking personal workout history (expandable to teams/organizations in future)

**Tech Stack:**
- **Framework:** TanStack Start (React)
- **Styling:** Tailwind CSS
- **Database:** D1 (Cloudflare) with Drizzle ORM
- **Deployment:** Cloudflare Workers
- **Auth:** WorkOS (managed auth UI)
- **Secrets Management:** Infisical
- **CI/CD:** GitHub Actions
- **Analytics:** Posthog
- **Testing:** Vitest (unit) + Playwright (E2E)
- **Package Manager:** Bun

## Core Features

### MVP (Phase 1)

1. **User Authentication**
   - WorkOS-powered signup/signin/signout
   - Email and name only (no password management)
   - Persistent sessions via WorkOS

2. **Exercise Management**
   - Create custom exercises
   - Link exercises to templates
   - Use exercises individually or in templates

3. **Template System**
   - Create workout templates
   - Templates consist of ordered exercises
   - Each exercise has target sets and reps
   - Templates can be reused for workouts

4. **Workout Logging**
   - Start workout sessions (from template or free-form)
   - Log exercises with multiple sets
   - Track weight, reps, RPE per set
   - Log all attempts (failed and successful)
   - Mark workouts as complete

5. **History & Analytics**
   - View all past workouts
   - Filter by exercise
   - See all set attempts per exercise
   - Track progress over time

### Future (Phase 2+)

- Social/sharing features
- Team workouts
- Export data
- Advanced analytics
- Exercise suggestions based on history

## User Flow

```
1. User visits app → WorkOS auth → Dashboard
2. Dashboard → Create/View Templates OR Start Workout
3. Start Workout → Select Template(s) OR Free-form Exercises
4. Log Sets → Complete Workout
5. History → View Past Workouts → Filter by Exercise
```

## Data Model

### Users
Managed by WorkOS. We sync:
- `workos_id` - Unique identifier from WorkOS
- `name` - User's display name
- `email` - User's email address

### Exercises (Building Blocks)
Exercises are the primary entity. All exercises belong to a user.

### Templates (Aggregates)
Templates group exercises together in a specific order.

### Workouts (Sessions)
Completed workout sessions linked to templates or free-form.

### Sets (Log Entries)
All logged sets with weight, reps, RPE, and attempt tracking.

## URLs

| Environment | URL | Worker | D1 Database |
|-------------|-----|--------|-------------|
| Local Dev | http://localhost:8787 | workout-dev | workout-dev-db |
| Staging | https://staging.fit.stevenduong.com | workout-staging | workout-staging-db |
| Production | https://fit.stevenduong.com | workout-prod | workout-prod-db |

## Auth Redirect URLs

- Development: `http://localhost:8787/auth/callback`
- Staging: `https://staging.fit.stevenduong.com/auth/callback`
- Production: `https://fit.stevenduong.com/auth/callback`

## Success Metrics

- 100% test coverage on critical paths
- Zero hardcoded secrets
- Automated deployments on commit
- All data accessible via Drizzle ORM only
