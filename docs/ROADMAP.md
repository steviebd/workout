# Implementation Roadmap

## Phase 1: Foundation ✓ COMPLETE

### 1.1 Project Setup ✓
- [x] Verify all Infisical secrets configured
- [x] Create D1 databases (dev, staging, prod)
- [x] Push initial schema to all environments
- [x] Configure GitHub Actions workflow
- [x] Test `bun run dev` with remote D1

**Deliverable:** ✓ Working dev environment with database connection

### 1.2 Authentication (WorkOS + JWT) - COMPLETE
- [x] Add @workos-inc/node SDK dependency
- [x] Add jose library for JWT
- [x] Create JWT utilities (src/lib/auth.ts)
- [x] Create session management (src/lib/session.ts)
- [x] Create user sync from WorkOS (src/lib/db/user.ts)
- [x] Create `/auth/signin` route
- [x] Create `/auth/callback` route
- [x] Create `/auth/signout` route
- [x] Update root layout with auth state
- [x] Create placeholder routes for exercises, templates, workouts, history

**Deliverable:** ✓ Working authentication system with JWT-based sessions

### 1.3 Basic Routing & Layout - COMPLETE
- [x] Set up root layout with auth state
- [x] Create dashboard (`/`)
- [x] Create navigation header with auth-aware links
- [x] Add Tailwind styling foundation
- [x] Add client-side route protection
- [x] Create placeholder protected routes

**Deliverable:** ✓ App shell with navigation, auth state, and protected routes

### 1.4 E2E TEST
- [x] Install Playwright and configure for project
- [x] Create `.env.test` with test credentials from Infisical
- [x] Create `tests/e2e/auth.spec.ts` with login/logout flow test

**Deliverable:** ✓ E2E test for now with playwright

**Test Flow:**
1. Visit `/` (home) as unauthenticated user - verify "Sign In" link visible
2. Navigate to protected route (e.g., `/exercises`) - verify redirect to `/auth/signin`
3. Click "Sign In" - verify redirect to WorkOS AuthKit
4. Enter test credentials (email/password) on WorkOS login form
5. After successful login - verify redirected back and user name displayed
6. Verify protected routes are accessible (e.g., `/exercises`, `/templates`, `/workouts/new`, `/history`)
7. Click "Sign Out" - verify logged out state
8. Navigate to protected route (e.g., `/workouts/new`) - verify redirect to WorkOS login
9. Verify login form is displayed (email/password fields)

**Configuration:**
- `BASE_URL`: http://localhost:8787 (dev server)
- `TEST_USERNAME`: from Infisical (`example@email.com`)
- `TEST_PASSWORD`: from Infisical (`test123`)
- `PLAYWRIGHT_TEST_USERNAME`: env var for test email input selector
- `PLAYWRIGHT_TEST_PASSWORD`: env var for test password input selector

**Deliverable:** ✓ Playwright E2E test covering full auth flow (login, protected routes access, logout, re-authentication)

---

## Phase 2: Core Features (Week 2)

### 2.1 Exercise Management
- [ ] Create Exercise model
- [ ] Build `/exercises` list view
- [ ] Build `/exercises/new` create form
- [ ] Build `/exercises/:id` detail view
- [ ] Write unit tests for CRUD operations
- [ ] Add Playwright E2E tests

**Deliverable:** Users can create and manage exercises

### 2.2 Template System
- [ ] Create Template model
- [ ] Create TemplateExercise linking model
- [ ] Build `/templates` list view
- [ ] Build `/templates/new` create form
- [ ] Add exercise selector component
- [ ] Write unit tests
- [ ] Add E2E tests

**Deliverable:** Users can create workout templates

### 2.3 Workout Logging
- [ ] Create Workout model
- [ ] Create WorkoutExercise and WorkoutSet models
- [ ] Build `/workouts/new` start form
- [ ] Build workout session interface
- [ ] Implement set logging with weight/reps/RPE
- [ ] Support multiple attempts per set
- [ ] Write unit tests
- [ ] Add E2E tests

**Deliverable:** Users can start and complete workouts

---

## Phase 3: History & Analytics (Week 3)

### 3.1 Workout History
- [ ] Build `/history` list view
- [ ] Display all past workouts
- [ ] Show workout details (exercises, sets, totals)
- [ ] Add filtering by date range
- [ ] Write unit tests
- [ ] Add E2E tests

**Deliverable:** Users can view all past workouts

### 3.2 Exercise History
- [ ] Build `/history/:exerciseId` filtered view
- [ ] Show all logged sets for an exercise
- [ ] Display progress over time
- [ ] Calculate max weight, total volume
- [ ] Write unit tests
- [ ] Add E2E tests

**Deliverable:** Users can filter history by exercise and see progress

### 3.3 Dashboard Updates
- [ ] Show recent workouts on dashboard
- [ ] Display quick stats (workouts this week, etc.)
- [ ] Add "Start Workout" quick action
- [ ] Write unit tests

**Deliverable:** Informative dashboard with quick actions

---

## Phase 4: Polish & Deploy (Week 4)

### 4.1 Posthog Integration
- [ ] Set up Posthog client
- [ ] Track page views
- [ ] Track key events:
  - `user_signed_in`
  - `exercise_created`
  - `template_created`
  - `workout_started`
  - `workout_completed`
  - `set_logged`
- [ ] Create dashboards

**Deliverable:** Analytics tracking implemented

### 4.2 UI/UX Improvements
- [ ] Add loading states
- [ ] Add error boundaries
- [ ] Improve form validation
- [ ] Add empty states
- [ ] Polish Tailwind styling
- [ ] Add mobile responsive design
- [ ] Add toast notifications

**Deliverable:** Polished, production-ready UI

### 4.3 Staging Deployment
- [ ] Configure staging worker
- [ ] Deploy to staging.fit.stevenduong.com
- [ ] Test all features in staging
- [ ] Fix any issues
- [ ] Get sign-off on staging

**Deliverable:** Working staging environment

### 4.4 Production Deployment
- [ ] Configure production worker
- [ ] Deploy to fit.stevenduong.com
- [ ] Configure custom domain
- [ ] Enable HTTPS
- [ ] Set up monitoring
- [ ] Final testing

**Deliverable:** Production application live

---

## Phase 5: Testing & Quality (Ongoing)

### 5.1 Test Coverage
- [ ] Achieve 80% unit test coverage
- [ ] Achieve 100% critical path E2E coverage
- [ ] Add integration tests for database operations
- [ ] Add auth flow E2E tests

**Target:** All tests passing, high coverage

### 5.2 Performance
- [ ] Optimize database queries
- [ ] Add database indexes
- [ ] Implement lazy loading for routes
- [ ] Optimize bundle size
- [ ] Achieve Lighthouse score > 90

**Target:** Fast, performant application

### 5.3 Documentation
- [ ] Complete README.md
- [ ] Complete inline code documentation
- [ ] Create API documentation (if needed)
- [ ] Document deployment procedures

**Deliverable:** Complete documentation

---

## Future Enhancements (Post-MVP)

### Features
- [ ] Social sharing of workouts
- [ ] Team workouts
- [ ] Export workout data (CSV/PDF)
- [ ] Exercise suggestions based on history
- [ ] Graph progress over time
- [ ] Achievements/badges
- [ ] Rest timer
- [ ] Notes on sets/exercises

### Technical
- [ ] Database backups
- [ ] Rate limiting
- [ ] Caching layer
- [ ] API rate monitoring
- [ ] Sentry error tracking
- [ ] Automated dependency updates (Dependabot)

---

## Milestone Checklist

### Sprint 1 End - COMPLETE
- [x] Dev environment working
- [x] Auth dependencies installed
- [x] Auth system implemented
- [x] Database schema finalized

### Sprint 2 End
- [ ] Exercises CRUD complete
- [ ] Templates CRUD complete
- [ ] Workout logging complete

### Sprint 3 End
- [ ] History views complete
- [ ] Dashboard complete
- [ ] All unit tests passing

### Sprint 4 End
- [ ] Posthog integrated
- [ ] UI polished
- [ ] Staging deployed
- [ ] Production deployed
- [ ] E2E tests passing

---

## Dependency Order

```
Phase 1 (Foundation)
    │
    ▼
Phase 2 (Core Features)
    │
    ├── Exercise Management ──────┐
    │                            │
    ▼                            ▼
Template System ◄──── Workout Logging
    │                            │
    └──────────┬─────────────────┘
               │
               ▼
Phase 3 (History & Analytics)
               │
               ▼
Phase 4 (Polish & Deploy)
```

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| WorkOS API issues | Test with sandbox first |
| D1 migration failures | Test migrations locally first |
| CI/CD failures | Test GitHub Actions on feature branch |
| Performance issues | Monitor with Posthog, optimize queries |
| Data isolation issues | Strict user ID checks on all queries |
