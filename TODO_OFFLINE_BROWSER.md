# Offline-First Workout App Implementation

## Executive Summary

This document outlines the implementation plan for enabling full offline-first functionality in the Fit Workout application. Users will be able to:
- View and create workouts, exercises, and templates without internet connectivity
- Automatically sync data when connectivity is restored
- Resolve conflicts using a last-write-wins strategy
- Install the app as a PWA on mobile devices

**Target Environment**: TanStack Start + React + Cloudflare Workers + D1 + WorkOS Auth

**Target User Experience**: Mobile users with unreliable internet connections (gyms, outdoor workouts, travel)

---

## ⚠️ Critical Architecture Notes (Read First)

Before implementing, understand these key design decisions:

### Single Source of Truth
- **Dexie (IndexedDB) is the ONLY offline data store** for domain data (exercises, templates, workouts)
- **TanStack Query is used for UI state only** — no query persistence to IndexedDB
- **Service Worker caches app shell only** — NOT `/api/*` responses (security risk + redundant with Dexie)

### Why This Matters
The original plan had 3 overlapping caches which would cause stale/inconsistent data:
1. ~~TanStack Query persistence~~ → Removed
2. ~~SW runtimeCaching for `/api/*`~~ → Removed  
3. Dexie for domain data → **This is the single source of truth**

### ID Mapping (Critical)
- All local entities have `localId` (UUID) and optional `serverId` (D1 ID)
- On create, server returns `serverId` which must be stored locally
- Child entities (workout_exercises, workout_sets) must update their parent references after sync

---

## Table of Contents

1. [Current State Analysis](#current-state-analysis)
2. [Architecture Overview](#architecture-overview)
3. [Phase 1: Infrastructure Setup](#phase-1-infrastructure-setup)
4. [Phase 2: Local Database Layer](#phase-2-local-database-layer)
5. [Phase 3: Data Synchronization](#phase-3-data-synchronization)
6. [Phase 4: Authentication Integration](#phase-4-authentication-integration)
7. [Phase 5: UI Updates](#phase-5-ui-updates)
8. [Phase 6: Testing & Polish](#phase-6-testing--polish)
9. [Technical Specifications](#technical-specifications)
10. [File Changes Reference](#file-changes-reference)
11. [API Changes](#api-changes)
12. [Security Considerations](#security-considerations)
13. [Performance Guidelines](#performance-guidelines)
14. [Testing Strategy](#testing-strategy)

---

## Current State Analysis

### Existing Infrastructure

| Component | Status | Notes |
|-----------|--------|-------|
| TanStack Start + React | Active | Client-side data fetching via useEffect + fetch |
| D1 Database | Active | Backend database via Drizzle ORM |
| WorkOS Auth | Active | JWT in HttpOnly cookie |
| LocalStorage Active Workout | Partial | useActiveWorkout hook persists active workout |
| Service Worker | None | No offline caching or request interception |
| IndexedDB | None | No local database for comprehensive data |
| TanStack Query | None | Direct fetch pattern used throughout |

### Current Data Flow

```
User Action → useEffect → fetch('/api/*') → Cloudflare Worker → D1 → Response → useState → UI
```

### Identified Issues for Offline Use

1. **All data fetching relies on network** - No local cache of exercises, templates, workouts
2. **No service worker** - Cannot intercept requests when offline
3. **No mutation queue** - User changes are lost if offline
4. **No conflict resolution** - No strategy for concurrent edits
5. **No PWA support** - Cannot install as app on mobile
6. **Auth dependency** - All API routes require authenticated session

### Existing Code Assets

- **`src/hooks/useActiveWorkout.ts`**: LocalStorage persistence for active workout
- **`src/lib/db/schema.ts`**: D1 schema (reference for local DB schema)
- **`src/routes/__root.tsx`**: Auth context provider
- **`src/lib/session.ts`**: JWT session management

---

## Architecture Overview

### System Architecture Diagram

```
┌───────────────────────────────────────────────────────────────────────────────┐
│                         PWA Client (Mobile Browser)                            │
│                                                                                │
│  ┌─────────────────────┐     ┌────────────────────────────────────────────┐   │
│  │ React App           │     │ IndexedDB (Dexie.js)                       │   │
│  │                     │     │ ═══════════════════════════════════════    │   │
│  │ - TanStack Router   │────▶│ SINGLE SOURCE OF TRUTH FOR OFFLINE DATA   │   │
│  │ - TanStack Query    │     │                                            │   │
│  │   (UI state only)   │     │ - exercises table                          │   │
│  │ - UI Components     │     │ - templates table                          │   │
│  │                     │     │ - workouts / workout_exercises / sets      │   │
│  └──────────┬──────────┘     │ - offline_queue (pending operations)       │   │
│             │                │ - sync_metadata (last sync times)          │   │
│             │                └────────────────────────────────────────────┘   │
│             │                                                                  │
│  ┌──────────▼──────────┐     ┌────────────────────────────────────────────┐   │
│  │ Sync Engine         │     │ Service Worker                             │   │
│  │                     │     │                                            │   │
│  │ - Push pending ops  │     │ - App shell caching (HTML/JS/CSS)          │   │
│  │ - Pull server data  │     │ - Navigation fallback                      │   │
│  │ - ID mapping        │     │ - NO /api/* caching (Dexie handles this)   │   │
│  │ - Conflict resolve  │     │                                            │   │
│  └──────────┬──────────┘     └────────────────────────────────────────────┘   │
│             │                                                                  │
└─────────────┼──────────────────────────────────────────────────────────────────┘
              │
      ┌───────▼───────┐
      │   Internet    │ (when available)
      └───────┬───────┘
              │
      ┌───────▼───────────────────────────────────────┐
      │ Cloudflare Worker + D1 (Server)               │
      │ - /api/exercises, /api/templates, /api/sync   │
      │ - WorkOS authentication                        │
      └───────────────────────────────────────────────┘
```

### Data Flow After Implementation

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ User Action                                                                  │
│      │                                                                        │
│      ▼                                                                        │
┌─────────────────────────────────────────────────────────────────────────────┐
│ TanStack Query                                                               │
│      │                                                                        │
│      ├─► Check IndexedDB cache first                                         │
│      │                                                                        │
│      ├─► If online: Fetch from API, update cache                             │
│      │                                                                        │
│      └─► If offline: Return cached data, queue mutation                      │
│                                                                              │
│ Service Worker                                                               │
│      │                                                                        │
│      ├─► Intercept API requests                                              │
│      ├─► Cache GET requests (NetworkFirst strategy)                          │
│      └─► Queue POST/PUT/DELETE when offline                                  │
│                                                                              │
│ Sync Engine                                                                  │
│      │                                                                        │
│      ├─► Listen for online event                                             │
│      ├─► Process offline queue                                               │
│      ├─► Pull latest server data                                             │
│      └─► Resolve conflicts (Last-Write-Wins)                                 │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Local DB | Dexie.js | Single source of truth for offline data, excellent TS support |
| Query Library | TanStack Query | UI state management only (NO cache persistence) |
| SW Caching | App Shell Only | Static assets + navigation fallback; NO `/api/*` caching |
| Sync Strategy | Push-Then-Pull | Queue mutations first, then fetch updates |
| Conflict Resolution | Last-Write-Wins + Server Check | Server validates `baseUpdatedAt` to detect conflicts |
| Auth Offline | Read-Only with Queued Writes | Writes queued until auth confirmed online |
| PWA Plugin | vite-plugin-pwa | Automated Workbox setup for app shell

---

## Phase 1: Infrastructure Setup

### 1.1 Install Dependencies

```bash
# PWA support
bun add -D vite-plugin-pwa

# IndexedDB wrapper with TypeScript
bun add dexie

# TanStack Query for data fetching (UI state only, NO persistence)
bun add @tanstack/react-query

# UUID generation
bun add uuid
bun add -D @types/uuid
```

> **Note**: We intentionally do NOT install `@tanstack/query-persist-client` or `@tanstack/query-sync-storage-persister`. Dexie is the single source of truth for offline data.

### 1.2 Configure Vite for PWA

**File**: `vite.config.ts`

```typescript
import { defineConfig } from 'vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    tanstackStart(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'robots.txt'],
      workbox: {
        // Cache static assets for app shell
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        
        // IMPORTANT: Do NOT cache /api/* responses in SW
        // - Dexie handles all domain data offline
        // - Caching authenticated API responses risks user data leakage
        // - Would create inconsistency with Dexie
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],  // Don't serve fallback for API routes
        
        runtimeCaching: [
          // Only cache external static resources (fonts, CDN assets)
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
            },
          },
        ],
      },
      manifest: {
        name: 'Fit Workout',
        short_name: 'Fit Workout',
        description: 'Personal workout tracking application',
        theme_color: '#3b82f6',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait-primary',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: '/icons/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable',
          },
          {
            src: '/icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
        categories: ['health', 'fitness', 'productivity'],
        shortcuts: [
          {
            name: 'Start Workout',
            short_name: 'Workout',
            description: 'Start a new workout session',
            url: '/workouts/new',
            icons: [{ src: '/icons/workout-192.png', sizes: '192x192' }],
          },
          {
            name: 'View History',
            short_name: 'History',
            description: 'View workout history',
            url: '/workouts',
            icons: [{ src: '/icons/history-192.png', sizes: '192x192' }],
          },
        ],
      },
    }),
  ],
});
```

### 1.3 Create Service Worker

**File**: `public/sw.js`

> **IMPORTANT**: This service worker caches the APP SHELL only (HTML, JS, CSS, icons). It does NOT cache `/api/*` responses. All domain data is stored in Dexie (IndexedDB) for offline access.

```javascript
const CACHE_NAME = 'fit-workout-v1';
const STATIC_CACHE_NAME = 'fit-workout-static-v1';

const STATIC_ASSETS = [
  '/',
  '/manifest.json',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME && name !== STATIC_CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests (handled by sync queue in app)
  if (request.method !== 'GET') {
    return;
  }

  // DO NOT cache API requests - Dexie handles offline data
  // This prevents user data leakage and inconsistency with local DB
  if (url.pathname.startsWith('/api/')) {
    return; // Let the request pass through to network (or fail if offline)
  }

  // Static assets - CacheFirst
  if (url.pathname.match(/\.(js|css|png|svg|woff2|ico|woff|ttf)$/)) {
    event.respondWith(cacheFirstStrategy(request, STATIC_CACHE_NAME));
    return;
  }

  // HTML pages / navigation - NetworkFirst with app shell fallback
  if (request.mode === 'navigate') {
    event.respondWith(navigationStrategy(request));
    return;
  }

  // Default - network only
  event.respondWith(fetch(request));
});

// CacheFirst strategy for static assets
async function cacheFirstStrategy(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);

  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    return new Response('Offline - Asset not cached', {
      status: 503,
      statusText: 'Service Unavailable',
    });
  }
}

// Navigation strategy - NetworkFirst with offline fallback to app shell
async function navigationStrategy(request) {
  try {
    const response = await fetch(request);
    // Cache successful navigation responses
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    // Offline - serve cached page or app shell
    const cache = await caches.open(CACHE_NAME);
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Fallback to root (app shell) for client-side routing
    const appShell = await cache.match('/');
    if (appShell) {
      return appShell;
    }

    return new Response('Offline', {
      status: 503,
      statusText: 'Service Unavailable',
    });
  }
}

// Background Sync event
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-queue') {
    event.waitUntil(syncOfflineQueue());
  }
});

// Sync offline queue to server
async function syncOfflineQueue() {
  // This will be implemented when we add the sync engine
  // For now, we just notify the main app
  const clients = await self.clients.matchAll();
  clients.forEach((client) => {
    client.postMessage({
      type: 'SYNC_REQUEST',
      timestamp: Date.now(),
    });
  });
}

// Push notification event (for future use)
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    event.waitUntil(
      self.registration.showNotification(data.title, {
        body: data.body,
        icon: '/icons/icon-192x192.png',
        badge: '/icons/badge-72x72.png',
      })
    );
  }
});
```

### 1.4 Register Service Worker

**File**: `src/lib/service-worker.ts`

```typescript
export async function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      });

      console.log('Service Worker registered:', registration.scope);

      // Handle updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New content available
              console.log('New service worker available');
              // Optionally show refresh UI to user
            }
          });
        }
      });

      // Handle messages from service worker
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data.type === 'SYNC_REQUEST') {
          window.dispatchEvent(new CustomEvent('sw-sync-request'));
        }
      });

      return registration;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      return null;
    }
  }
  return null;
}

export async function unregisterServiceWorker() {
  const registration = await navigator.serviceWorker.ready;
  return registration.unregister();
}
```

**Update**: `src/routes/__root.tsx` - Register SW on mount

```typescript
import { registerServiceWorker } from '~/lib/service-worker';

// In component useEffect:
useEffect(() => {
  void registerServiceWorker();
}, []);
```

---

## Phase 2: Local Database Layer

### 2.1 Dexie.js Schema Definition

**File**: `src/lib/db/local-db.ts`

```typescript
import Dexie, { Table, DBSchema } from 'dexie';

export interface LocalExercise {
  id?: number;
  localId: string;           // UUID for offline-created items
  serverId?: string;         // D1 ID - filled after sync
  userId: string;
  name: string;
  muscleGroup: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;           // Local update time
  serverUpdatedAt?: Date;    // Last known server updatedAt (for conflict detection)
  syncStatus: 'synced' | 'pending' | 'failed';
  needsSync: boolean;
}

export interface LocalTemplate {
  id?: number;
  localId: string;
  serverId?: string;         // D1 ID - filled after sync
  userId: string;
  name: string;
  description?: string;
  exercises: TemplateExerciseData[];
  createdAt: Date;
  updatedAt: Date;
  serverUpdatedAt?: Date;    // For conflict detection
  syncStatus: 'synced' | 'pending' | 'failed';
  needsSync: boolean;
}

export interface TemplateExerciseData {
  exerciseId: string; // Local or server ID
  order: number;
  sets: number;
  reps: number;
  weight?: number;
  restSeconds?: number;
}

export interface LocalWorkout {
  id?: number;
  localId: string;
  serverId?: string;         // D1 ID - filled after sync
  userId: string;
  templateId?: string;       // Can be localId or serverId of template
  name: string;
  startedAt: Date;
  completedAt?: Date;
  status: 'in_progress' | 'completed' | 'cancelled';
  notes?: string;
  serverUpdatedAt?: Date;    // For conflict detection
  syncStatus: 'synced' | 'pending' | 'failed';
  needsSync: boolean;
}

export interface LocalWorkoutExercise {
  id?: number;
  localId: string;
  workoutId: string; // Local ID
  exerciseId: string; // Local ID
  order: number;
  notes?: string;
  serverId?: string;
  syncStatus: 'synced' | 'pending' | 'failed';
  needsSync: boolean;
}

export interface LocalWorkoutSet {
  id?: number;
  localId: string;
  workoutExerciseId: string; // Local ID
  order: number;
  weight: number;
  reps: number;
  rpe?: number;
  completed: boolean;
  setNumber: number;
  serverId?: string;
  syncStatus: 'synced' | 'pending' | 'failed';
  needsSync: boolean;
}

export interface OfflineOperation {
  id?: number;
  operationId: string;
  type: 'create' | 'update' | 'delete';
  entity: 'exercise' | 'template' | 'workout' | 'workout_exercise' | 'workout_set';
  localId: string;
  data: Record<string, unknown>;
  timestamp: Date;
  retryCount: number;
  maxRetries: number;
}

export interface SyncMetadata {
  id?: number;
  key: string;
  value: string;
  updatedAt: Date;
}

interface FitWorkoutDB extends DBSchema {
  exercises: Table<LocalExercise, number>;
  templates: Table<LocalTemplate, number>;
  workouts: Table<LocalWorkout, number>;
  workoutExercises: Table<LocalWorkoutExercise, number>;
  workoutSets: Table<LocalWorkoutSet, number>;
  offlineQueue: Table<OfflineOperation, number>;
  syncMetadata: Table<SyncMetadata, number>;
}

class FitWorkoutDatabase extends Dexie {
  exercises!: Table<LocalExercise, number>;
  templates!: Table<LocalTemplate, number>;
  workouts!: Table<LocalWorkout, number>;
  workoutExercises!: Table<LocalWorkoutExercise, number>;
  workoutSets!: Table<LocalWorkoutSet, number>;
  offlineQueue!: Table<OfflineOperation, number>;
  syncMetadata!: Table<SyncMetadata, number>;

  constructor() {
    super('FitWorkoutDB');
    this.version(1).stores({
      exercises: '++id, &localId, userId, name, muscleGroup, serverId, syncStatus',
      templates: '++id, &localId, userId, name, serverId, syncStatus',
      workouts: '++id, &localId, userId, startedAt, status, serverId, syncStatus',
      workoutExercises: '++id, &localId, workoutId, exerciseId, serverId, syncStatus',
      workoutSets: '++id, &localId, workoutExerciseId, serverId, syncStatus',
      offlineQueue: '++id, operationId, type, entity, timestamp, retryCount',
      syncMetadata: '&key, updatedAt',
    });
  }
}

export const localDB = new FitWorkoutDatabase();
```

### 2.2 Local Repository Functions

**File**: `src/lib/db/local-repository.ts`

```typescript
import { v4 as uuidv4 } from 'uuid';
import {
  localDB,
  LocalExercise,
  LocalTemplate,
  LocalWorkout,
  LocalWorkoutExercise,
  LocalWorkoutSet,
  OfflineOperation,
} from './local-db';

// Exercise operations
export async function createExercise(
  userId: string,
  data: { name: string; muscleGroup: string; description?: string }
): Promise<LocalExercise> {
  const exercise: LocalExercise = {
    localId: uuidv4(),
    userId,
    name: data.name,
    muscleGroup: data.muscleGroup,
    description: data.description,
    createdAt: new Date(),
    updatedAt: new Date(),
    syncStatus: 'pending',
    needsSync: true,
  };

  const id = await localDB.exercises.add(exercise);
  await queueOperation('create', 'exercise', exercise.localId, data);

  return { ...exercise, id: id as number };
}

export async function updateExercise(
  localId: string,
  data: Partial<Omit<LocalExercise, 'localId' | 'createdAt' | 'userId'>>
): Promise<void> {
  const exercise = await localDB.exercises.get({ localId });
  if (!exercise) throw new Error('Exercise not found');

  const updated = {
    ...exercise,
    ...data,
    updatedAt: new Date(),
    needsSync: true,
    syncStatus: 'pending' as const,
  };

  await localDB.exercises.update(exercise.id!, updated);
  await queueOperation('update', 'exercise', localId, data);
}

export async function getExercises(userId: string): Promise<LocalExercise[]> {
  return localDB.exercises.where('userId').equals(userId).toArray();
}

export async function deleteExercise(localId: string): Promise<void> {
  const exercise = await localDB.exercises.get({ localId });
  if (!exercise) return;

  await localDB.exercises.delete(exercise.id!);
  await queueOperation('delete', 'exercise', localId, { id: localId });
}

// Template operations
export async function createTemplate(
  userId: string,
  data: { name: string; description?: string; exercises: LocalTemplate['exercises'] }
): Promise<LocalTemplate> {
  const template: LocalTemplate = {
    localId: uuidv4(),
    userId,
    name: data.name,
    description: data.description,
    exercises: data.exercises,
    createdAt: new Date(),
    updatedAt: new Date(),
    syncStatus: 'pending',
    needsSync: true,
  };

  const id = await localDB.templates.add(template);
  await queueOperation('create', 'template', template.localId, data);

  return { ...template, id: id as number };
}

export async function updateTemplate(
  localId: string,
  data: Partial<Omit<LocalTemplate, 'localId' | 'createdAt' | 'userId'>>
): Promise<void> {
  const template = await localDB.templates.get({ localId });
  if (!template) throw new Error('Template not found');

  const updated = {
    ...template,
    ...data,
    updatedAt: new Date(),
    needsSync: true,
    syncStatus: 'pending' as const,
  };

  await localDB.templates.update(template.id!, updated);
  await queueOperation('update', 'template', localId, data);
}

export async function getTemplates(userId: string): Promise<LocalTemplate[]> {
  return localDB.templates.where('userId').equals(userId).toArray();
}

// Workout operations
export async function createWorkout(
  userId: string,
  data: { templateId?: string; name?: string }
): Promise<LocalWorkout> {
  const workout: LocalWorkout = {
    localId: uuidv4(),
    userId,
    templateId: data.templateId,
    name: data.name || 'Quick Workout',
    startedAt: new Date(),
    status: 'in_progress',
    syncStatus: 'pending',
    needsSync: true,
  };

  const id = await localDB.workouts.add(workout);
  await queueOperation('create', 'workout', workout.localId, data);

  return { ...workout, id: id as number };
}

export async function updateWorkout(
  localId: string,
  data: Partial<Omit<LocalWorkout, 'localId' | 'createdAt' | 'userId' | 'startedAt'>>
): Promise<void> {
  const workout = await localDB.workouts.get({ localId });
  if (!workout) throw new Error('Workout not found');

  const updated = {
    ...workout,
    ...data,
    updatedAt: new Date(),
    needsSync: true,
    syncStatus: 'pending' as const,
  };

  await localDB.workouts.update(workout.id!, updated);
  await queueOperation('update', 'workout', localId, data);
}

export async function completeWorkout(localId: string): Promise<void> {
  await updateWorkout(localId, {
    status: 'completed',
    completedAt: new Date(),
  });
}

export async function getWorkouts(userId: string): Promise<LocalWorkout[]> {
  return localDB.workouts.where('userId').equals(userId).toArray();
}

export async function getActiveWorkout(userId: string): Promise<LocalWorkout | null> {
  return localDB.workouts
    .where('userId')
    .equals(userId)
    .and((w) => w.status === 'in_progress')
    .first();
}

// Workout Exercise operations
export async function addExerciseToWorkout(
  workoutLocalId: string,
  exerciseLocalId: string,
  order: number,
  notes?: string
): Promise<LocalWorkoutExercise> {
  const workoutExercise: LocalWorkoutExercise = {
    localId: uuidv4(),
    workoutId: workoutLocalId,
    exerciseId: exerciseLocalId,
    order,
    notes,
    syncStatus: 'pending',
    needsSync: true,
  };

  const id = await localDB.workoutExercises.add(workoutExercise);
  await queueOperation('create', 'workout_exercise', workoutExercise.localId, {
    workoutId: workoutLocalId,
    exerciseId: exerciseLocalId,
    order,
    notes,
  });

  return { ...workoutExercise, id: id as number };
}

// Workout Set operations
export async function addSetToWorkoutExercise(
  workoutExerciseLocalId: string,
  data: { weight: number; reps: number; rpe?: number; setNumber: number }
): Promise<LocalWorkoutSet> {
  const set: LocalWorkoutSet = {
    localId: uuidv4(),
    workoutExerciseId: workoutExerciseLocalId,
    order: data.setNumber,
    weight: data.weight,
    reps: data.reps,
    rpe: data.rpe,
    completed: true,
    setNumber: data.setNumber,
    syncStatus: 'pending',
    needsSync: true,
  };

  const id = await localDB.workoutSets.add(set);
  await queueOperation('create', 'workout_set', set.localId, {
    workoutExerciseId: workoutExerciseLocalId,
    ...data,
  });

  return { ...set, id: id as number };
}

export async function updateSet(
  localId: string,
  data: Partial<Omit<LocalWorkoutSet, 'localId' | 'workoutExerciseId' | 'setNumber'>>
): Promise<void> {
  const set = await localDB.workoutSets.get({ localId });
  if (!set) throw new Error('Set not found');

  const updated = {
    ...set,
    ...data,
    needsSync: true,
    syncStatus: 'pending' as const,
  };

  await localDB.workoutSets.update(set.id!, updated);
  await queueOperation('update', 'workout_set', localId, data);
}

// Offline Queue operations
async function queueOperation(
  type: OfflineOperation['type'],
  entity: OfflineOperation['entity'],
  localId: string,
  data: Record<string, unknown>
): Promise<void> {
  const operation: OfflineOperation = {
    operationId: uuidv4(),
    type,
    entity,
    localId,
    data,
    timestamp: new Date(),
    retryCount: 0,
    maxRetries: 3,
  };

  await localDB.offlineQueue.add(operation);
}

export async function getPendingOperations(): Promise<OfflineOperation[]> {
  return localDB.offlineQueue
    .where('retryCount')
    .below(3)
    .sortBy('timestamp');
}

export async function removeOperation(id: number): Promise<void> {
  await localDB.offlineQueue.delete(id);
}

export async function incrementRetry(operationId: number): Promise<void> {
  const op = await localDB.offlineQueue.get(id);
  if (op) {
    await localDB.offlineQueue.update(id, { retryCount: op.retryCount + 1 });
  }
}

// Sync Metadata
export async function getLastSyncTime(key: string): Promise<Date | null> {
  const meta = await localDB.syncMetadata.get(key);
  return meta ? new Date(meta.value) : null;
}

export async function setLastSyncTime(key: string): Promise<void> {
  await localDB.syncMetadata.put({
    key,
    value: new Date().toISOString(),
    updatedAt: new Date(),
  });
}
```

---

## Phase 3: Data Synchronization

### 3.1 Sync Engine

**File**: `src/lib/sync/sync-engine.ts`

```typescript
import { localDB } from '../db/local-db';
import {
  getPendingOperations,
  removeOperation,
  incrementRetry,
  getLastSyncTime,
  setLastSyncTime,
} from '../db/local-repository';

interface SyncResult {
  success: boolean;
  operationId: string;
  error?: string;
  serverResponse?: unknown;
}

class SyncEngine {
  private isSyncing = false;
  private syncInProgress: Promise<void> | null = null;

  async sync(): Promise<void> {
    if (this.isSyncing) {
      return this.syncInProgress;
    }

    this.isSyncing = true;
    this.syncInProgress = this.performSync();
    
    try {
      await this.syncInProgress;
    } finally {
      this.isSyncing = false;
      this.syncInProgress = null;
    }
  }

  private async performSync(): Promise<void> {
    if (!navigator.onLine) {
      console.log('Offline - skipping sync');
      return;
    }

    console.log('Starting sync...');

    try {
      // Step 1: Push pending operations
      await this.pushPendingOperations();

      // Step 2: Pull updates from server
      await this.pullUpdates();

      console.log('Sync completed successfully');
    } catch (error) {
      console.error('Sync failed:', error);
    }
  }

  private async pushPendingOperations(): Promise<void> {
    const operations = await getPendingOperations();
    
    for (const op of operations) {
      try {
        const result = await this.executeOperation(op);
        
        if (result.success) {
          await removeOperation(op.id!);
          await this.markAsSynced(op.entity, op.localId);
        } else {
          await incrementRetry(op.id!);
        }
      } catch (error) {
        console.error(`Failed to sync operation ${op.operationId}:`, error);
        await incrementRetry(op.id!);
      }
    }
  }

  private async executeOperation(op: {
    type: 'create' | 'update' | 'delete';
    entity: string;
    localId: string;
    data: Record<string, unknown>;
  }): Promise<SyncResult> {
    const endpoint = this.getEndpoint(op.entity);
    let url = endpoint;
    let method = 'POST';

    if (op.type === 'update') {
      url = `${endpoint}/${op.localId}`;
      method = 'PUT';
    } else if (op.type === 'delete') {
      url = `${endpoint}/${op.localId}`;
      method = 'DELETE';
    }

    try {
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: op.type !== 'delete' ? JSON.stringify(op.data) : undefined,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Unknown error' }));
        return {
          success: false,
          operationId: op.operationId,
          error: error.message || `HTTP ${response.status}`,
        };
      }

      const serverData = await response.json();

      // CRITICAL: Store serverId from response for ID mapping
      if (op.type === 'create' && serverData.id) {
        await this.storeServerId(op.entity, op.localId, serverData.id, serverData.updatedAt);
      }

      return {
        success: true,
        operationId: op.operationId,
        serverResponse: serverData,
      };
    } catch (error) {
      return {
        success: false,
        operationId: op.operationId,
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  }

  private getEndpoint(entity: string): string {
    const endpoints: Record<string, string> = {
      exercise: '/api/exercises',
      template: '/api/templates',
      workout: '/api/workouts',
      workout_exercise: '/api/workouts/exercises',
      workout_set: '/api/workouts/sets',
    };
    return endpoints[entity] || '/api/unknown';
  }

  // CRITICAL: Store server ID after successful create
  private async storeServerId(
    entity: string, 
    localId: string, 
    serverId: string,
    serverUpdatedAt: string
  ): Promise<void> {
    const tableName = this.getTableName(entity);
    if (!tableName) return;

    const table = localDB[tableName as keyof typeof localDB] as {
      where: (key: string) => { equals: (value: string) => { first: () => Promise<{ id?: number } | null> } };
      update: (id: number, data: Record<string, unknown>) => Promise<void>;
    };

    const item = await table.where('localId').equals(localId).first();
    if (item?.id) {
      await table.update(item.id, { 
        serverId, 
        serverUpdatedAt: new Date(serverUpdatedAt),
        syncStatus: 'synced', 
        needsSync: false 
      });
    }
  }

  private async markAsSynced(entity: string, localId: string): Promise<void> {
    const tableName = this.getTableName(entity);
    if (!tableName) return;

    const table = localDB[tableName as keyof typeof localDB] as {
      where: (key: string) => { equals: (value: string) => { first: () => Promise<{ id?: number } | null> } };
      update: (id: number, data: { syncStatus: string; needsSync: boolean }) => Promise<void>;
    };

    const item = await table.where('localId').equals(localId).first();
    if (item?.id) {
      await table.update(item.id, { syncStatus: 'synced', needsSync: false });
    }
  }

  private getTableName(entity: string): string | null {
    const tableNames: Record<string, string> = {
      exercise: 'exercises',
      template: 'templates',
      workout: 'workouts',
      workout_exercise: 'workoutExercises',
      workout_set: 'workoutSets',
    };
    return tableNames[entity] || null;
  }

  private async pullUpdates(): Promise<void> {
    const lastSync = await getLastSyncTime('fullSync');
    const since = lastSync ? `?since=${lastSync.toISOString()}` : '';

    try {
      const response = await fetch(`/api/sync${since}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch sync data');
      }

      const data = await response.json();
      await this.applyServerChanges(data);
      await setLastSyncTime('fullSync');
    } catch (error) {
      console.error('Failed to pull updates:', error);
    }
  }

  private async applyServerChanges(data: {
    exercises?: unknown[];
    templates?: unknown[];
    workouts?: unknown[];
  }): Promise<void> {
    // Apply server changes to local DB
    // This is a simplified version - full implementation needed
    if (data.exercises) {
      for (const exercise of data.exercises) {
        // Merge with local data, resolving conflicts with Last-Write-Wins
        await this.mergeEntity('exercises', exercise);
      }
    }

    if (data.templates) {
      for (const template of data.templates) {
        await this.mergeEntity('templates', template);
      }
    }

    if (data.workouts) {
      for (const workout of data.workouts) {
        await this.mergeEntity('workouts', workout);
      }
    }
  }

  private async mergeEntity(
    tableName: string,
    serverData: { localId?: string; updatedAt: string }
  ): Promise<void> {
    const table = localDB[tableName as keyof typeof localDB] as {
      where: (key: string) => { equals: (value: string) => { first: () => Promise<unknown> } };
      put: (data: unknown) => Promise<number>;
    };

    const localItem = serverData.localId
      ? await table.where('localId').equals(serverData.localId).first()
      : null;

    if (!localItem) {
      // Server has new data we don't have - add it
      await table.put({ ...serverData, syncStatus: 'synced', needsSync: false });
    } else {
      // Both have data - Last-Write-Wins
      const localUpdated = new Date((localItem as { updatedAt: Date }).updatedAt).getTime();
      const serverUpdated = new Date(serverData.updatedAt).getTime();

      if (serverUpdated > localUpdated) {
        // Server is newer - update local
        await table.put({ ...serverData, syncStatus: 'synced', needsSync: false });
      }
      // If local is newer, keep local (it will be synced)
    }
  }
}

export const syncEngine = new SyncEngine();
```

### 3.2 Sync Hook

**File**: `src/hooks/useOfflineSync.ts`

```typescript
import { useEffect, useCallback, useState } from 'react';
import { syncEngine } from '../lib/sync/sync-engine';

export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  const performSync = useCallback(async () => {
    if (!navigator.onLine) {
      setSyncError('No internet connection');
      return;
    }

    setIsSyncing(true);
    setSyncError(null);

    try {
      await syncEngine.sync();
      setLastSyncTime(new Date());
    } catch (error) {
      setSyncError(error instanceof Error ? error.message : 'Sync failed');
    } finally {
      setIsSyncing(false);
    }
  }, []);

  useEffect(() => {
    // Listen for online/offline events
    const handleOnline = () => {
      setIsOnline(true);
      // Auto-sync when coming back online
      void performSync();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Listen for sync requests from service worker
    const handleSyncRequest = () => {
      void performSync();
    };
    window.addEventListener('sw-sync-request', handleSyncRequest);

    // Initial sync
    void performSync();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('sw-sync-request', handleSyncRequest);
    };
  }, [performSync]);

  return {
    isOnline,
    isSyncing,
    pendingCount,
    lastSyncTime,
    syncError,
    sync: performSync,
  };
}
```

### 3.3 TanStack Query Setup (UI State Only)

> **IMPORTANT**: TanStack Query is used for UI state management only. We do NOT persist the query cache. Dexie is the single source of truth for offline data.

**File**: `src/lib/query-client.ts`

```typescript
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Stale time: data is fresh for 30 seconds
      staleTime: 30 * 1000,
      // Cache time: keep in memory for 5 minutes
      gcTime: 5 * 60 * 1000,
      // Retry failed requests 2 times
      retry: 2,
      // Refetch on window focus when online
      refetchOnWindowFocus: true,
    },
    mutations: {
      // Retry failed mutations once
      retry: 1,
    },
  },
});
```

**File**: `src/hooks/useExercises.ts` - Example hook that reads from Dexie first

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getExercises, createExercise } from '~/lib/db/local-repository';
import { useAuth } from '~/routes/__root';

export function useExercises() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['exercises', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      // 1. Read from Dexie (instant, works offline)
      const localExercises = await getExercises(user.id);
      
      // 2. If online, fetch from server in background and update Dexie
      if (navigator.onLine) {
        // This happens in background, doesn't block UI
        fetchAndSyncExercises(user.id).catch(console.error);
      }
      
      return localExercises;
    },
    enabled: !!user?.id,
  });
}

async function fetchAndSyncExercises(userId: string) {
  const response = await fetch('/api/exercises', { credentials: 'include' });
  if (!response.ok) return;
  
  const serverExercises = await response.json();
  // Sync engine handles merging server data into Dexie
  // (implementation in sync-engine.ts)
}

export function useCreateExercise() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (data: { name: string; muscleGroup: string; description?: string }) => {
      if (!user?.id) throw new Error('Not authenticated');
      
      // Write to Dexie immediately (works offline)
      // This also queues the operation for sync
      return createExercise(user.id, data);
    },
    onSuccess: () => {
      // Invalidate to refetch from Dexie
      queryClient.invalidateQueries({ queryKey: ['exercises'] });
    },
  });
}
```

---

## Phase 4: Authentication Integration

### 4.1 Offline Auth Strategy

**Key Decisions**:
- Users can view cached data when offline
- Writes are queued locally and synced when online + authenticated
- Auth state cached in IndexedDB (7-day expiry)
- On sync failure with 401, show "sign in to sync" UI

**File**: `src/lib/auth/offline-auth.ts`

```typescript
import { localDB } from '../db/local-db';

interface CachedUser {
  id: string;
  email: string;
  name: string;
  workosId: string;
  cachedAt: Date;
}

export async function cacheUser(user: CachedUser): Promise<void> {
  // Store user in IndexedDB for offline access
  await localDB.syncMetadata.put({
    key: 'cachedUser',
    value: JSON.stringify({ ...user, cachedAt: new Date() }),
    updatedAt: new Date(),
  });
}

export async function getCachedUser(): Promise<CachedUser | null> {
  const meta = await localDB.syncMetadata.get('cachedUser');
  if (!meta) return null;

  try {
    const user = JSON.parse(meta.value);
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      workosId: user.workosId,
      cachedAt: new Date(user.cachedAt),
    };
  } catch {
    return null;
  }
}

export async function clearCachedUser(): Promise<void> {
  await localDB.syncMetadata.delete('cachedUser');
}

export async function isAuthCacheValid(): Promise<boolean> {
  const user = await getCachedUser();
  if (!user) return false;

  // Cache valid for 7 days
  const sevenDays = 7 * 24 * 60 * 60 * 1000;
  const now = Date.now();
  const cachedAt = user.cachedAt.getTime();

  return now - cachedAt < sevenDays;
}
```

### 4.2 Update Auth Context

**File**: `src/routes/__root.tsx` - Update auth provider

```typescript
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User } from '~/lib/db/schema';
import { cacheUser, getCachedUser, clearCachedUser, isAuthCacheValid } from '~/lib/auth/offline-auth';
import { useOfflineSync } from '~/hooks/useOfflineSync';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  setUser: (user: User | null) => void;
  signOut: () => Promise<void>;
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  setUser: () => {},
  signOut: async () => {},
  isOnline: true,
  isSyncing: false,
  pendingCount: 0,
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { isOnline, isSyncing, pendingCount } = useOfflineSync();

  useEffect(() => {
    async function initAuth() {
      try {
        // Check if we have valid cached auth
        const cachedValid = await isAuthCacheValid();
        const cachedUser = cachedValid ? await getCachedUser() : null;

        if (cachedUser) {
          setUserState(cachedUser as User);
          setLoading(false);
          return;
        }

        // Fetch current auth state
        const response = await fetch('/api/auth/me', { credentials: 'include' });
        if (response.ok) {
          const userData = await response.json();
          setUserState(userData);
          await cacheUser(userData);
        } else {
          setUserState(null);
        }
      } catch {
        // Offline - try cached user
        const cachedUser = await getCachedUser();
        if (cachedUser) {
          setUserState(cachedUser as User);
        } else {
          setUserState(null);
        }
      } finally {
        setLoading(false);
      }
    }

    void initAuth();
  }, []);

  const setUser = async (newUser: User | null) => {
    setUserState(newUser);
    if (newUser) {
      await cacheUser(newUser);
    } else {
      await clearCachedUser();
    }
  };

  const signOut = async () => {
    try {
      await fetch('/api/auth/signout', { method: 'POST', credentials: 'include' });
    } finally {
      await clearCachedUser();
      setUserState(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        setUser,
        signOut,
        isOnline,
        isSyncing,
        pendingCount,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
```

---

## Phase 5: UI Updates

### 5.1 Offline Status Indicator

**File**: `src/components/OfflineIndicator.tsx`

```typescript
import { useAuth } from '~/routes/__root';

export function OfflineIndicator() {
  const { isOnline, isSyncing, pendingCount } = useAuth();

  if (isOnline && pendingCount === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-amber-500 text-white px-4 py-2 text-sm flex items-center justify-center gap-2 z-50">
      {!isOnline && (
        <>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414" />
          </svg>
          <span>You&apos;re offline</span>
        </>
      )}
      {isOnline && pendingCount > 0 && (
        <>
          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span>Syncing {pendingCount} changes...</span>
        </>
      )}
    </div>
  );
}
```

### 5.2 Storage Usage Component

**File**: `src/components/StorageUsage.tsx`

```typescript
import { useEffect, useState } from 'react';

export function StorageUsage() {
  const [usage, setUsage] = useState<{ used: number; quota: number } | null>(null);

  useEffect(() => {
    async function checkStorage() {
      if (navigator.storage && navigator.storage.estimate) {
        const estimate = await navigator.storage.estimate();
        setUsage({
          used: estimate.usage || 0,
          quota: estimate.quota || 0,
        });
      }
    }

    void checkStorage();
  }, []);

  if (!usage) return null;

  const percent = Math.round((usage.used / usage.quota) * 100);
  const usedMB = Math.round(usage.used / (1024 * 1024));
  const quotaMB = Math.round(usage.quota / (1024 * 1024));

  return (
    <div className="mt-4 p-4 bg-gray-100 rounded-lg">
      <div className="flex justify-between text-sm text-gray-600 mb-2">
        <span>Storage used</span>
        <span>{usedMB} MB of {quotaMB} MB</span>
      </div>
      <div className="w-full bg-gray-300 rounded-full h-2">
        <div
          className={`h-2 rounded-full ${percent > 90 ? 'bg-red-500' : percent > 70 ? 'bg-amber-500' : 'bg-green-500'}`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
```

---

## Phase 6: Testing & Polish

### 6.1 Testing Checklist

- [ ] Service worker registers correctly
- [ ] API requests are cached when offline
- [ ] Offline mutations are queued
- [ ] Queue processes on reconnect
- [ ] Conflict resolution works correctly
- [ ] Auth persists across offline sessions
- [ ] PWA installs correctly on mobile
- [ ] App works in airplane mode
- [ ] Large workouts sync correctly
- [ ] Storage limits are respected

### 6.2 Manual Testing Steps

1. **Offline Mode Test**
   - Open Chrome DevTools → Application → Service Workers → "Offline" checkbox
   - Navigate through app - should work with cached data
   - Try creating a new exercise - should queue for sync
   - Refresh page - data persists

2. **Sync Test**
   - Disable offline mode
   - Watch for automatic sync
   - Verify queued items appear on server
   - Check browser console for sync logs

3. **PWA Test**
   - Run `bun run build`
   - Deploy to preview
   - Open on mobile
   - Use "Add to Home Screen"
   - Test app icon and splash screen

---

## Technical Specifications

### Cache Configuration

| Resource Type | Strategy | Max Entries | Max Age |
|--------------|----------|-------------|---------|
| API GET | NetworkFirst | 100 | 7 days |
| Static JS/CSS | CacheFirst | 50 | 1 year |
| Images | CacheFirst | 100 | 30 days |
| HTML Pages | NetworkFirst | 20 | 1 day |

### Storage Quotas

| Storage | Typical Quota | Notes |
|---------|---------------|-------|
| IndexedDB | 50% of disk | Varies by device |
| Cache API | 50% of disk | Varies by device |
| Service Worker | 5MB | Code + static assets |

### Sync Behavior

| Scenario | Behavior |
|----------|----------|
| User goes offline | Continue working with local data |
| User creates data offline | Queued for sync, visible locally |
| User closes app offline | Data persists in IndexedDB |
| User returns online | Automatic sync within 5 seconds |
| Sync fails 3x | Marked as failed, show error to user |
| Conflict on sync | Last-write-wins (based on updatedAt) |

---

## File Changes Reference

### New Files

| File | Purpose |
|------|---------|
| `vite.config.ts` | PWA configuration (modify) |
| `public/sw.js` | Service worker |
| `src/lib/service-worker.ts` | SW registration utilities |
| `src/lib/db/local-db.ts` | Dexie.js schema |
| `src/lib/db/local-repository.ts` | Local DB operations |
| `src/lib/sync/sync-engine.ts` | Sync logic |
| `src/hooks/useOfflineSync.ts` | Sync hook |
| `src/lib/auth/offline-auth.ts` | Offline auth utilities |
| `src/components/OfflineIndicator.tsx` | Offline status UI |
| `src/components/StorageUsage.tsx` | Storage display |
| `public/icons/*` | PWA icons (192, 512 PNG) |

### Modified Files

| File | Changes |
|------|---------|
| `src/routes/__root.tsx` | AuthProvider with offline support, SW registration |
| `package.json` | Add new dependencies |
| `src/lib/db/schema.ts` | Reference for local DB schema |
| `src/routes/*` | Replace useEffect+fetch with React Query |

### Files Using React Query Pattern (to create)

| File | Pattern |
|------|---------|
| `src/routes/exercises._index.tsx` | useQuery + useMutation |
| `src/routes/exercises.new.tsx` | useMutation |
| `src/routes/templates._index.tsx` | useQuery + useMutation |
| `src/routes/templates.new.tsx` | useMutation |
| `src/routes/workouts._index.tsx` | useQuery + useMutation |
| `src/routes/workouts.$id.tsx` | useQuery + useMutation |
| `src/routes/index.tsx` | useQuery (parallel) |

---

## API Changes

### New Endpoint: Sync API

**GET** `/api/sync?since=ISO8601`

Response:
```json
{
  "exercises": [
    {
      "id": "server-id",
      "localId": "local-id",
      "userId": "user-id",
      "name": "Bench Press",
      "muscleGroup": "Chest",
      "updatedAt": "2024-01-15T10:30:00Z"
    }
  ],
  "templates": [...],
  "workouts": [...]
}
```

### Modified Endpoints

All POST/PUT/DELETE endpoints should accept `localId` field and return it in response:

**POST** `/api/exercises`
```json
// Request
{
  "name": "Bench Press",
  "muscleGroup": "Chest",
  "localId": "uuid-from-local-db"
}

// Response
{
  "id": "server-id",
  "localId": "uuid-from-local-db"
}
```

---

## Security Considerations

1. **Local Data Protection**
   - IndexedDB not accessible from other origins
   - Sensitive data (user info) stored with expiration
   - Clear cached data on sign out

2. **Sync Security**
   - All sync requests include credentials (cookies)
   - Server validates user ownership of data
   - Rate limiting on sync endpoints

3. **Offline Auth**
   - Auth cache expires after 7 days
   - Write operations require re-authentication if session expired
   - Force online for sensitive operations

4. **Data Integrity**
   - Server is source of truth
   - Client can only modify own data
   - Last-write-wins may lose data (acceptable trade-off)

---

## Performance Guidelines

### Bundle Size Impact

| Package | Size (gzip) |
|---------|-------------|
| dexie | ~30KB |
| @tanstack/react-query | ~14KB |
| @tanstack/query-persist-client | ~2KB |
| vite-plugin-pwa | ~5KB (runtime) |

### Sync Optimization

- Batch sync operations (max 50 per request)
- Exponential backoff for failed operations
- Debounced sync (wait 2 seconds after last change)
- Background sync only when charging + wifi (ideal)

### Storage Cleanup

- Delete completed workouts older than 90 days
- Delete workout sets for deleted workouts
- Limit offline queue to 1000 operations
- Auto-cleanup on storage pressure

---

## Testing Strategy

### Unit Tests

```typescript
// tests/sync/conflict-resolution.test.ts
describe('Last-Write-Wins Conflict Resolution', () => {
  it('should prefer newer data', () => {
    const local = { updatedAt: new Date('2024-01-15') };
    const server = { updatedAt: new Date('2024-01-10') };
    
    const result = resolveConflict(local, server);
    expect(result).toEqual(local);
  });
});

// tests/db/local-repository.test.ts
describe('Local Repository', () => {
  it('should create exercise with localId', async () => {
    const exercise = await createExercise('user-id', {
      name: 'Squat',
      muscleGroup: 'Legs',
    });
    
    expect(exercise.localId).toBeDefined();
    expect(exercise.syncStatus).toBe('pending');
  });
});
```

### E2E Tests (Playwright)

```typescript
// tests/offline.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Offline Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.context().setOffline(false);
  });

  test('should work offline with cached data', async ({ page }) => {
    // Navigate to app
    await page.goto('/');
    
    // Go offline
    await page.context().setOffline(true);
    
    // Verify exercises are visible
    await expect(page.locator('text=Bench Press')).toBeVisible();
    
    // Create new exercise (should be queued)
    await page.click('text=Add Exercise');
    await page.fill('name=Deadlift');
    await page.click('text=Save');
    
    // Verify queued indicator
    await expect(page.locator('text=1 change pending')).toBeVisible();
  });

  test('should sync when back online', async ({ page }) => {
    // Create offline data
    await page.context().setOffline(true);
    await page.goto('/exercises/new');
    await page.fill('name=Offline Exercise');
    await page.click('text=Save');
    
    // Go online and sync
    await page.context().setOffline(false);
    await page.waitForTimeout(5000); // Wait for auto-sync
    
    // Verify on server
    const response = await page.request.get('/api/exercises');
    const exercises = await response.json();
    expect(exercises).toContainEqual(
      expect.objectContaining({ name: 'Offline Exercise' })
    );
  });
});
```

### Chrome DevTools Testing

1. **Service Worker**: Application → Service Workers
2. **IndexedDB**: Application → IndexedDB
3. **Cache**: Application → Cache Storage
4. **Offline**: Network → Offline checkbox
5. **Clear Storage**: Application → Clear storage

---

## Implementation Timeline

### Phase 1: Infrastructure (1-2 days)
- [ ] Install dependencies
- [ ] Configure vite-plugin-pwa
- [ ] Create service worker
- [ ] Register service worker

### Phase 2: Local Database (1-2 days)
- [ ] Define Dexie.js schema
- [ ] Implement local repository functions
- [ ] Test CRUD operations

### Phase 3: Sync Engine (2 days)
- [ ] Implement sync engine
- [ ] Implement offline queue
- [ ] Implement conflict resolution
- [ ] Add sync hook

### Phase 4: Auth Integration (0.5 day)
- [ ] Update auth context
- [ ] Cache user data
- [ ] Handle offline auth

### Phase 5: UI Updates (0.5 day)
- [ ] Add offline indicator
- [ ] Add storage usage display

### Phase 6: Testing (1-2 days)
- [ ] Unit tests
- [ ] E2E tests
- [ ] Manual testing
- [ ] Bug fixes

**Total Estimate: 6-9 days**

---

## Rollout Strategy

### Phase 1: Beta
- Enable offline feature for 10% of users
- Monitor sync success rates
- Collect bug reports

### Phase 2: Gradual Rollout
- Increase to 50% of users
- Monitor performance impact
- Enable PWA install prompt

### Phase 3: Full Release
- 100% rollout
- Add offline mode documentation
- Monitor storage usage

---

## Monitoring & Metrics

### Key Metrics to Track

| Metric | Target | Warning |
|--------|--------|---------|
| Sync success rate | >95% | <90% |
| Avg sync time | <2s | >5s |
| Storage per user | <10MB | >50MB |
| Offline session length | - | >24h |
| Conflict rate | <5% | >10% |

### Analytics Events

```typescript
// Track sync events
trackEvent('sync_started');
trackEvent('sync_completed', { duration: 2000 });
trackEvent('sync_failed', { error: 'network' });
trackEvent('conflict_resolved', { type: 'workout' });

// Track offline usage
trackEvent('offline_session_started');
trackEvent('offline_data_created', { type: 'workout' });
trackEvent('offline_session_ended', { duration: 1800 });
```

---

## Future Enhancements (Out of Scope)

1. **Push Notifications**
   - Workout reminders
   - Sync completion alerts
   - PR achievements

2. **Background Sync**
   - Periodic background sync
   - Sync on battery charging
   - Sync on WiFi connect

3. **Advanced Conflict Resolution**
   - Operational transformation
   - 3-way merge
   - Manual conflict UI

4. **Compression**
   - Compress stored data
   - Minimize storage usage

5. **Selective Sync**
   - Sync only recent data
   - Archive old workouts
   - User-configurable sync scope

---

## Quick Implementation Checklist

Use this checklist to track progress:

### Phase 1: Infrastructure
- [ ] `bun add -D vite-plugin-pwa`
- [ ] `bun add dexie @tanstack/react-query uuid`
- [ ] `bun add -D @types/uuid`
- [ ] Update `vite.config.ts` with PWA config (NO API caching)
- [ ] Create `public/sw.js` (app shell only)
- [ ] Create `src/lib/service-worker.ts`
- [ ] Register SW in `__root.tsx`

### Phase 2: Local Database
- [ ] Create `src/lib/db/local-db.ts` (Dexie schema)
- [ ] Create `src/lib/db/local-repository.ts` (CRUD operations)
- [ ] Verify all entities have `localId`, `serverId`, `serverUpdatedAt`

### Phase 3: Sync Engine
- [ ] Create `src/lib/sync/sync-engine.ts`
- [ ] Implement `storeServerId()` for ID mapping after creates
- [ ] Implement push-then-pull sync flow
- [ ] Create `src/hooks/useOfflineSync.ts`

### Phase 3.5: TanStack Query
- [ ] Create `src/lib/query-client.ts` (NO persistence)
- [ ] Create hooks that read from Dexie first (e.g., `useExercises.ts`)
- [ ] Wrap app in `QueryClientProvider`

### Phase 4: Auth Integration
- [ ] Create `src/lib/auth/offline-auth.ts`
- [ ] Update auth context to cache user in Dexie
- [ ] Handle 401 on sync with "sign in to sync" UI

### Phase 5: UI
- [ ] Create `OfflineIndicator` component
- [ ] Create `StorageUsage` component
- [ ] Add indicators to layout

### Phase 6: Testing
- [ ] Test offline data access (airplane mode)
- [ ] Test mutation queuing while offline
- [ ] Test sync on reconnect
- [ ] Test ID mapping for newly created entities
- [ ] E2E test with Playwright `setOffline(true/false)`

---

## Conclusion

This implementation plan provides a comprehensive roadmap for adding offline-first functionality to the Fit Workout application. The architecture prioritizes:

1. **Single Source of Truth**: Dexie (IndexedDB) stores all domain data for offline access
2. **No Redundant Caches**: TanStack Query for UI state only, SW for app shell only
3. **Reliable Sync**: Push-then-pull with ID mapping and conflict detection
4. **Security**: No API response caching in SW (prevents data leakage)
5. **User Experience**: Seamless offline operation with automatic sync

The implementation can be completed in 6-9 days and should significantly improve the experience for mobile users with unreliable internet connections.
