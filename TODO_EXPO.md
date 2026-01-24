# Expo Mobile App - Product Development Requirements & Plan

## Overview

This document outlines the plan to create an Android app using Expo while maximizing code reuse with the existing TanStack Start web application. Both apps will be developed in parallel.

---

## Table of Contents

1. [Goals & Non-Goals](#goals--non-goals)
2. [Architecture Decision](#architecture-decision)
3. [Code Reusability Analysis](#code-reusability-analysis)
4. [Monorepo Structure](#monorepo-structure)
5. [Implementation Phases](#implementation-phases)
6. [Technical Specifications](#technical-specifications)
7. [Migration Checklist](#migration-checklist)

---

## Goals & Non-Goals

### Goals

- ✅ Create an Android app using Expo/React Native
- ✅ Maximize code reuse between web and mobile (target: 60-70%)
- ✅ Maintain feature parity between platforms
- ✅ Share business logic, types, utilities, and data layer abstractions
- ✅ Enable parallel development of both platforms
- ✅ Use same backend/API for both platforms

### Non-Goals

- ❌ iOS support (initial release - can be added later)
- ❌ Sharing UI components directly (different paradigms)
- ❌ Electron desktop app
- ❌ Rewriting the web app

---

## Architecture Decision

### Chosen Approach: Turborepo Monorepo

```
workout/
├── apps/
│   ├── web/              # Existing TanStack Start app (moved)
│   └── mobile/           # New Expo app
├── packages/
│   ├── shared/           # Shared business logic
│   │   ├── types/        # TypeScript interfaces & types
│   │   ├── utils/        # Pure utility functions
│   │   ├── hooks/        # Platform-agnostic hooks
│   │   ├── api/          # API client
│   │   └── data/         # Static data (exercise library, etc.)
│   ├── db-core/          # Drizzle schema & types (no runtime)
│   └── config/           # Shared configs (ESLint, TypeScript)
├── turbo.json
├── package.json          # Root workspace config
└── README.md
```

### Why Turborepo?

- First-class monorepo support
- Caching for faster builds
- Works well with both Vite (web) and Metro (Expo)
- Bun compatible

---

## Code Reusability Analysis

### ✅ Fully Reusable (~30%)

| Current Location | New Location | Notes |
|------------------|--------------|-------|
| `src/lib/cn.ts` | `packages/shared/utils/cn.ts` | No changes needed |
| `src/lib/date.ts` | `packages/shared/utils/date.ts` | No changes needed |
| `src/lib/units.ts` | `packages/shared/utils/units.ts` | No changes needed |
| `src/lib/exercise-library.ts` | `packages/shared/data/exercise-library.ts` | No changes needed |
| `src/lib/db/schema.ts` | `packages/db-core/schema.ts` | Drizzle schema works with expo-sqlite |
| `src/data/*` | `packages/shared/data/` | Static data |
| Type definitions | `packages/shared/types/` | Extract interfaces |

### ⚠️ Reusable with Abstraction (~40%)

| Current Location | Changes Required |
|------------------|------------------|
| `src/hooks/useExercises.ts` | Remove `@/routes/__root` import, use abstract auth interface |
| `src/hooks/useTemplates.ts` | Same as above |
| `src/hooks/useWorkouts.ts` | Same as above |
| `src/hooks/useActiveWorkout.ts` | Same + abstract storage |
| `src/hooks/useOfflineSync.ts` | Replace `navigator.onLine` with abstract network interface |
| `src/lib/db/local-repository.ts` | Create storage interface, implement for Dexie (web) and expo-sqlite (mobile) |
| `src/lib/sync/sync-engine.ts` | Abstract fetch, may need minor adjustments |
| `src/lib/context/UnitContext.tsx` | Move to shared, no changes |
| `src/lib/context/DateFormatContext.tsx` | Move to shared, no changes |

### ❌ Platform-Specific (Must Rewrite) (~30%)

| Current Location | Mobile Replacement |
|------------------|-------------------|
| `src/routes/*` (file-based routing) | Expo Router / React Navigation |
| `src/routes/__root.tsx` | Expo layout with providers |
| `src/components/ui/*` (Radix) | React Native UI library (Tamagui, RN Paper, or custom) |
| `src/components/*.tsx` | React Native components |
| `src/lib/auth.ts` | Expo AuthSession + SecureStore |
| `src/lib/db/local-db.ts` (Dexie) | expo-sqlite + Drizzle |
| `src/styles.css` (Tailwind) | NativeWind or StyleSheet |
| `src/lib/posthog.ts` | posthog-react-native |
| `src/lib/service-worker.ts` | Not needed (native handles offline) |

---

## Monorepo Structure

### Detailed File Structure

```
workout/
├── apps/
│   ├── web/
│   │   ├── src/
│   │   │   ├── components/        # Web-specific components
│   │   │   ├── routes/            # TanStack Router routes
│   │   │   ├── lib/
│   │   │   │   ├── auth/          # Web auth (cookies, WorkOS redirect)
│   │   │   │   ├── db/
│   │   │   │   │   ├── local-db.ts        # Dexie implementation
│   │   │   │   │   └── web-repository.ts  # Implements IRepository
│   │   │   │   └── posthog.ts     # Web PostHog
│   │   │   ├── entry-client.tsx
│   │   │   ├── entry-server.tsx
│   │   │   └── router.tsx
│   │   ├── public/
│   │   ├── wrangler.toml
│   │   ├── vite.config.ts
│   │   └── package.json
│   │
│   └── mobile/
│       ├── app/                   # Expo Router file-based routes
│       │   ├── (tabs)/
│       │   │   ├── index.tsx      # Dashboard
│       │   │   ├── exercises.tsx
│       │   │   ├── templates.tsx
│       │   │   ├── workouts.tsx
│       │   │   └── settings.tsx
│       │   ├── workout/
│       │   │   └── [id].tsx
│       │   ├── auth/
│       │   │   ├── login.tsx
│       │   │   └── callback.tsx
│       │   └── _layout.tsx
│       ├── components/            # RN components
│       │   ├── ui/                # Base UI components
│       │   └── ...
│       ├── lib/
│       │   ├── auth/              # Expo AuthSession + SecureStore
│       │   ├── db/
│       │   │   ├── sqlite-db.ts   # expo-sqlite setup
│       │   │   └── mobile-repository.ts  # Implements IRepository
│       │   └── posthog.ts         # posthog-react-native
│       ├── app.json
│       ├── metro.config.js
│       ├── babel.config.js
│       └── package.json
│
├── packages/
│   ├── shared/
│   │   ├── src/
│   │   │   ├── types/
│   │   │   │   ├── user.ts
│   │   │   │   ├── exercise.ts
│   │   │   │   ├── template.ts
│   │   │   │   ├── workout.ts
│   │   │   │   └── index.ts
│   │   │   ├── utils/
│   │   │   │   ├── cn.ts
│   │   │   │   ├── date.ts
│   │   │   │   ├── units.ts
│   │   │   │   └── index.ts
│   │   │   ├── hooks/
│   │   │   │   ├── useExercises.ts
│   │   │   │   ├── useTemplates.ts
│   │   │   │   ├── useWorkouts.ts
│   │   │   │   ├── useActiveWorkout.ts
│   │   │   │   └── index.ts
│   │   │   ├── context/
│   │   │   │   ├── UnitContext.tsx
│   │   │   │   ├── DateFormatContext.tsx
│   │   │   │   ├── AuthContext.tsx      # Abstract auth context
│   │   │   │   └── index.ts
│   │   │   ├── interfaces/
│   │   │   │   ├── IRepository.ts       # Storage abstraction
│   │   │   │   ├── IAuthProvider.ts     # Auth abstraction
│   │   │   │   └── INetworkProvider.ts  # Network status abstraction
│   │   │   ├── data/
│   │   │   │   ├── exercise-library.ts
│   │   │   │   └── index.ts
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── db-core/
│   │   ├── src/
│   │   │   ├── schema.ts          # Drizzle schema (shared)
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── config/
│       ├── eslint/
│       │   └── base.js
│       ├── typescript/
│       │   └── base.json
│       └── package.json
│
├── turbo.json
├── package.json
├── bun.lock
└── README.md
```

---

## Implementation Phases

### Phase 1: Monorepo Setup (1-2 days)

- [ ] Initialize Turborepo at root
- [ ] Create `apps/` and `packages/` directories
- [ ] Move existing web app to `apps/web/`
- [ ] Update all import paths in web app
- [ ] Configure workspace dependencies
- [ ] Verify web app still builds and runs
- [ ] Update CI/CD for monorepo structure

### Phase 2: Extract Shared Packages (2-3 days)

- [ ] Create `packages/shared/` structure
- [ ] Extract and move types/interfaces
  - [ ] `LocalExercise`, `LocalTemplate`, `LocalWorkout`, etc.
  - [ ] `User`, `SessionPayload`
  - [ ] API response types
- [ ] Extract and move utilities
  - [ ] `cn.ts`, `date.ts`, `units.ts`
  - [ ] `exercise-library.ts`
- [ ] Create `packages/db-core/` with Drizzle schema
- [ ] Update web app to import from packages
- [ ] Verify web app still works

### Phase 3: Create Abstraction Interfaces (1-2 days)

- [ ] Define `IRepository` interface
  ```typescript
  interface IRepository {
    exercises: {
      getAll(userId: string): Promise<Exercise[]>;
      create(userId: string, data: CreateExerciseInput): Promise<Exercise>;
      update(localId: string, data: UpdateExerciseInput): Promise<Exercise>;
      delete(localId: string): Promise<void>;
    };
    templates: { /* similar */ };
    workouts: { /* similar */ };
    // ...
  }
  ```
- [ ] Define `IAuthProvider` interface
  ```typescript
  interface IAuthProvider {
    user: User | null;
    loading: boolean;
    signIn(): Promise<void>;
    signOut(): Promise<void>;
  }
  ```
- [ ] Define `INetworkProvider` interface
  ```typescript
  interface INetworkProvider {
    isOnline: boolean;
    subscribe(callback: (online: boolean) => void): () => void;
  }
  ```
- [ ] Implement web versions of interfaces
- [ ] Refactor hooks to use interfaces
- [ ] Move refactored hooks to `packages/shared/hooks/`

### Phase 4: Initialize Expo App (1 day)

- [ ] Create Expo app in `apps/mobile/`
  ```bash
  cd apps && npx create-expo-app mobile --template blank-typescript
  ```
- [ ] Install Expo Router
- [ ] Configure Metro for monorepo
- [ ] Add NativeWind for styling
- [ ] Configure babel and tsconfig
- [ ] Verify app runs on Android emulator

### Phase 5: Mobile Storage Layer (2-3 days)

- [ ] Install expo-sqlite and drizzle-orm
- [ ] Create `sqlite-db.ts` using shared schema
- [ ] Implement `MobileRepository` (implements `IRepository`)
- [ ] Create migration strategy
- [ ] Test CRUD operations

### Phase 6: Mobile Auth (2-3 days)

- [ ] Install expo-auth-session and expo-secure-store
- [ ] Configure WorkOS for mobile OAuth
  - Add redirect URI: `exp://localhost:8081/auth/callback` (dev)
  - Add redirect URI: `com.yourapp://auth/callback` (prod)
- [ ] Implement `MobileAuthProvider` (implements `IAuthProvider`)
- [ ] Create login screen
- [ ] Handle auth callback
- [ ] Store tokens in SecureStore

### Phase 7: Mobile UI Components (3-5 days)

Choose a UI library and implement core components:

- [ ] Choose UI approach:
  - Option A: NativeWind + custom components
  - Option B: Tamagui (cross-platform potential)
  - Option C: React Native Paper
- [ ] Implement base components:
  - [ ] Button
  - [ ] Card
  - [ ] Input
  - [ ] Select/Picker
  - [ ] Dialog/Modal
  - [ ] Tabs
  - [ ] Bottom Navigation
- [ ] Implement composite components:
  - [ ] Header
  - [ ] ExerciseCard
  - [ ] WorkoutCard
  - [ ] SetInput
  - [ ] ExerciseSelect

### Phase 8: Mobile Screens (5-7 days)

Implement screens using Expo Router:

- [ ] **Auth Flow**
  - [ ] Login screen
  - [ ] Auth callback handler
- [ ] **Dashboard** (`app/(tabs)/index.tsx`)
  - [ ] Recent workouts
  - [ ] Quick actions
  - [ ] Stats summary
- [ ] **Exercises** (`app/(tabs)/exercises.tsx`)
  - [ ] Exercise list
  - [ ] Create exercise modal
  - [ ] Edit/delete exercise
- [ ] **Templates** (`app/(tabs)/templates.tsx`)
  - [ ] Template list
  - [ ] Create template flow
  - [ ] Edit template
- [ ] **Active Workout** (`app/workout/[id].tsx`)
  - [ ] Exercise list with sets
  - [ ] Set logging (weight, reps, RPE)
  - [ ] Rest timer
  - [ ] Complete workout
- [ ] **History/Progress** (`app/(tabs)/workouts.tsx`)
  - [ ] Workout history list
  - [ ] Workout details
  - [ ] Progress charts
- [ ] **Settings** (`app/(tabs)/settings.tsx`)
  - [ ] Unit preferences
  - [ ] Date format
  - [ ] Account management
  - [ ] Sign out

### Phase 9: Offline Sync (2-3 days)

- [ ] Implement `MobileNetworkProvider` using `@react-native-community/netinfo`
- [ ] Adapt sync engine for mobile
- [ ] Handle background sync (if needed)
- [ ] Test offline scenarios

### Phase 10: Analytics & Polish (1-2 days)

- [ ] Install posthog-react-native
- [ ] Add analytics events
- [ ] Error handling and crash reporting
- [ ] Loading states and skeletons
- [ ] Haptic feedback
- [ ] App icons and splash screen

### Phase 11: Testing & Release (2-3 days)

- [ ] Unit tests for shared packages
- [ ] Integration tests for mobile
- [ ] E2E tests with Detox (optional)
- [ ] Build APK for testing
- [ ] Configure EAS Build
- [ ] Submit to Google Play Store

---

## Technical Specifications

### Mobile Tech Stack

| Category | Technology |
|----------|------------|
| Framework | Expo SDK 52+ |
| Navigation | Expo Router v4 |
| State Management | TanStack Query (same as web) |
| Forms | TanStack Form (same as web) |
| Styling | NativeWind v4 |
| Storage | expo-sqlite + Drizzle ORM |
| Auth | Expo AuthSession + SecureStore |
| Analytics | posthog-react-native |
| Icons | lucide-react-native |
| Network Status | @react-native-community/netinfo |

### Package Dependencies

#### `packages/shared/package.json`
```json
{
  "name": "@workout/shared",
  "dependencies": {
    "@tanstack/react-query": "^5.x",
    "react": "^19.x",
    "zod": "^4.x"
  }
}
```

#### `apps/mobile/package.json` (key dependencies)
```json
{
  "dependencies": {
    "@workout/shared": "workspace:*",
    "@workout/db-core": "workspace:*",
    "expo": "~52.x",
    "expo-router": "~4.x",
    "expo-sqlite": "~15.x",
    "expo-auth-session": "~6.x",
    "expo-secure-store": "~14.x",
    "drizzle-orm": "^1.x",
    "nativewind": "^4.x",
    "@tanstack/react-query": "^5.x",
    "posthog-react-native": "^3.x"
  }
}
```

### WorkOS Configuration

Add these redirect URIs in WorkOS dashboard:

| Environment | Redirect URI |
|-------------|--------------|
| Development | `exp://localhost:8081/auth/callback` |
| Development (Tunnel) | `exp://[tunnel-url]/auth/callback` |
| Production | `com.stevenduong.fitworkout://auth/callback` |

---

## Migration Checklist

### Pre-Migration
- [ ] Backup current repository
- [ ] Document all environment variables
- [ ] List all WorkOS redirect URIs
- [ ] Export current database schema

### During Migration
- [ ] Web app continues to work at each phase
- [ ] CI/CD updated for monorepo
- [ ] Environment variables configured for mobile
- [ ] Infisical updated with mobile-specific secrets

### Post-Migration
- [ ] Both apps build successfully
- [ ] Web app deployed to staging
- [ ] Mobile app runs on emulator
- [ ] Sync works between platforms
- [ ] Analytics tracking both platforms

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Breaking web app during migration | Phase-by-phase approach, verify web works after each phase |
| Drizzle schema incompatibility | Test schema with expo-sqlite early (Phase 5) |
| WorkOS mobile OAuth issues | Test auth flow in Phase 6 before building full app |
| Performance issues with shared code | Profile early, optimize if needed |
| Metro bundler conflicts | Configure metro.config.js properly in Phase 4 |

---

## Timeline Estimate

| Phase | Duration | Cumulative |
|-------|----------|------------|
| Phase 1: Monorepo Setup | 1-2 days | 1-2 days |
| Phase 2: Extract Shared | 2-3 days | 3-5 days |
| Phase 3: Abstractions | 1-2 days | 4-7 days |
| Phase 4: Init Expo | 1 day | 5-8 days |
| Phase 5: Storage | 2-3 days | 7-11 days |
| Phase 6: Auth | 2-3 days | 9-14 days |
| Phase 7: UI Components | 3-5 days | 12-19 days |
| Phase 8: Screens | 5-7 days | 17-26 days |
| Phase 9: Offline Sync | 2-3 days | 19-29 days |
| Phase 10: Polish | 1-2 days | 20-31 days |
| Phase 11: Testing/Release | 2-3 days | 22-34 days |

**Total Estimate: 4-7 weeks**

---

## Success Criteria

1. ✅ Android app installable via APK/Play Store
2. ✅ Feature parity with web app (core features)
3. ✅ Offline-first functionality works
4. ✅ Sync between web and mobile
5. ✅ ~60% code shared between platforms
6. ✅ Web app unaffected by changes
7. ✅ Both apps deployable from same CI/CD

---

## Open Questions

1. **UI Library**: NativeWind vs Tamagui vs React Native Paper?
2. **Build Service**: EAS Build vs self-hosted?
3. **Play Store**: New developer account or existing?
4. **Beta Testing**: TestFlight equivalent for Android (Internal testing track)?
5. **Push Notifications**: Needed for MVP?

---

## References

- [Expo Documentation](https://docs.expo.dev/)
- [Expo Router](https://docs.expo.dev/router/introduction/)
- [NativeWind](https://www.nativewind.dev/)
- [Drizzle with expo-sqlite](https://orm.drizzle.team/docs/get-started-sqlite#expo-sqlite)
- [Turborepo](https://turbo.build/repo/docs)
- [WorkOS React Native](https://workos.com/docs/user-management/react-native)
- [TanStack Query React Native](https://tanstack.com/query/latest/docs/framework/react/react-native)
