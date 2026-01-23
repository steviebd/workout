# Test & E2E Fix Plan for Offline-First Feature

## Executive Summary

The current test suite for the offline-first feature has **significant coverage gaps**. The unit tests validate type structures and inline logic rather than testing the actual implementations. This document provides a detailed plan to fix and improve test coverage.

**Audit Date**: January 2026  
**Related Feature**: [TODO_OFFLINE_BROWSER.md](./TODO_OFFLINE_BROWSER.md)

---

## Current State

### Unit Test Files

| File | Status | Problem |
|------|--------|---------|
| `tests/unit/offline-queue.spec.ts` | ❌ Needs Rewrite | Tests inline type structures, not actual Dexie operations |
| `tests/unit/sync-engine.spec.ts` | ❌ Needs Rewrite | Tests reimplemented logic, not actual `SyncEngine` class |
| `tests/unit/local-repository.spec.ts` | ❌ Needs Rewrite | Tests data shapes, not actual repository functions |

### E2E Test Files

| File | Status | Problem |
|------|--------|---------|
| `tests/e2e/offline.spec.ts` | ⚠️ Needs Improvement | Tests UI only, doesn't verify IndexedDB persistence |
| `tests/e2e/service-worker.spec.ts` | ✅ Adequate | Good coverage for SW and PWA manifest |

### Implementation Files to Test

| File | Path | Current Test Coverage |
|------|------|----------------------|
| Local Database Schema | `src/lib/db/local-db.ts` | ❌ None |
| Local Repository | `src/lib/db/local-repository.ts` | ❌ None |
| Sync Engine | `src/lib/sync/sync-engine.ts` | ❌ None |

---

## Phase 1: Setup Test Infrastructure

### 1.1 Install fake-indexeddb

The `fake-indexeddb` package provides an in-memory IndexedDB implementation for Node.js testing.

```bash
bun add -D fake-indexeddb
```

### 1.2 Create Test Setup File

**File**: `tests/unit/setup-indexeddb.ts`

```typescript
import 'fake-indexeddb/auto';
import { beforeEach } from 'vitest';
import { localDB } from '../../src/lib/db/local-db';

// Reset the database before each test
beforeEach(async () => {
  await localDB.exercises.clear();
  await localDB.templates.clear();
  await localDB.workouts.clear();
  await localDB.workoutExercises.clear();
  await localDB.workoutSets.clear();
  await localDB.offlineQueue.clear();
  await localDB.syncMetadata.clear();
});
```

### 1.3 Update Vitest Config

**File**: `vitest.config.ts`

Add the setup file to the test configuration:

```typescript
export default defineConfig({
  test: {
    setupFiles: ['./tests/unit/setup-indexeddb.ts'],
    // ... other config
  },
});
```

---

## Phase 2: Rewrite Unit Tests

### 2.1 Rewrite `local-repository.spec.ts`

**File**: `tests/unit/local-repository.spec.ts`

This file should test the actual functions exported from `src/lib/db/local-repository.ts`.

#### Functions to Test

| Function | Test Cases |
|----------|------------|
| `createExercise(userId, data)` | Creates exercise in IndexedDB, queues operation, returns localId |
| `updateExercise(localId, data)` | Updates exercise, sets syncStatus to pending, queues operation |
| `getExercises(userId)` | Returns all exercises for user |
| `getExercise(localId)` | Returns single exercise by localId |
| `deleteExercise(localId)` | Marks for deletion, queues delete operation |
| `createTemplate(userId, data)` | Creates template with exercises array |
| `updateTemplate(localId, data)` | Updates template fields |
| `getTemplates(userId)` | Returns all templates for user |
| `deleteTemplate(localId)` | Marks template for deletion |
| `createWorkout(userId, data)` | Creates workout with in_progress status |
| `updateWorkout(localId, data)` | Updates workout fields |
| `completeWorkout(localId)` | Sets completedAt and status to completed |
| `getWorkouts(userId)` | Returns all workouts for user |
| `getActiveWorkout(userId)` | Returns in_progress workout or undefined |
| `addExerciseToWorkout(workoutLocalId, exerciseLocalId, order)` | Creates workout_exercise entry |
| `addSetToWorkoutExercise(workoutExerciseLocalId, data)` | Creates workout_set entry |
| `updateSet(localId, data)` | Updates set fields |
| `deleteSet(localId)` | Marks set for deletion |
| `getPendingOperations()` | Returns all queued operations ordered by timestamp |
| `removeOperation(id)` | Removes operation from queue |
| `incrementRetry(id)` | Increments retryCount on operation |
| `getLastSyncTime(key)` | Returns sync metadata value |
| `setLastSyncTime(key, value)` | Stores sync metadata |

#### Example Test Implementation

```typescript
import { describe, expect, it, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { localDB } from '../../src/lib/db/local-db';
import {
  createExercise,
  getExercises,
  getExercise,
  updateExercise,
  deleteExercise,
  getPendingOperations,
} from '../../src/lib/db/local-repository';

describe('Local Repository - Exercise Operations', () => {
  beforeEach(async () => {
    await localDB.exercises.clear();
    await localDB.offlineQueue.clear();
  });

  describe('createExercise', () => {
    it('should create exercise in IndexedDB and return localId', async () => {
      const localId = await createExercise('user-1', {
        name: 'Bench Press',
        muscleGroup: 'Chest',
        description: 'Classic chest exercise',
      });

      expect(localId).toBeDefined();
      expect(localId).toMatch(/^[0-9a-f-]{36}$/); // UUID format

      const exercise = await getExercise(localId);
      expect(exercise).toBeDefined();
      expect(exercise?.name).toBe('Bench Press');
      expect(exercise?.muscleGroup).toBe('Chest');
      expect(exercise?.userId).toBe('user-1');
      expect(exercise?.syncStatus).toBe('pending');
      expect(exercise?.needsSync).toBe(true);
    });

    it('should queue a create operation', async () => {
      const localId = await createExercise('user-1', {
        name: 'Squat',
        muscleGroup: 'Legs',
      });

      const operations = await getPendingOperations();
      expect(operations).toHaveLength(1);
      expect(operations[0].type).toBe('create');
      expect(operations[0].entity).toBe('exercise');
      expect(operations[0].localId).toBe(localId);
      expect(operations[0].retryCount).toBe(0);
      expect(operations[0].maxRetries).toBe(3);
    });
  });

  describe('getExercises', () => {
    it('should return only exercises for specified user', async () => {
      await createExercise('user-1', { name: 'Exercise 1', muscleGroup: 'Chest' });
      await createExercise('user-1', { name: 'Exercise 2', muscleGroup: 'Back' });
      await createExercise('user-2', { name: 'Exercise 3', muscleGroup: 'Legs' });

      const user1Exercises = await getExercises('user-1');
      expect(user1Exercises).toHaveLength(2);

      const user2Exercises = await getExercises('user-2');
      expect(user2Exercises).toHaveLength(1);
    });
  });

  describe('updateExercise', () => {
    it('should update exercise and queue update operation', async () => {
      const localId = await createExercise('user-1', {
        name: 'Original Name',
        muscleGroup: 'Chest',
      });

      await updateExercise(localId, { name: 'Updated Name' });

      const exercise = await getExercise(localId);
      expect(exercise?.name).toBe('Updated Name');
      expect(exercise?.syncStatus).toBe('pending');

      const operations = await getPendingOperations();
      expect(operations).toHaveLength(2); // create + update
      expect(operations[1].type).toBe('update');
    });

    it('should throw error for non-existent exercise', async () => {
      await expect(
        updateExercise('non-existent-id', { name: 'Test' })
      ).rejects.toThrow('Exercise not found');
    });
  });

  describe('deleteExercise', () => {
    it('should mark exercise for deletion and queue operation', async () => {
      const localId = await createExercise('user-1', {
        name: 'To Delete',
        muscleGroup: 'Chest',
      });

      await deleteExercise(localId);

      const operations = await getPendingOperations();
      const deleteOp = operations.find(op => op.type === 'delete');
      expect(deleteOp).toBeDefined();
      expect(deleteOp?.localId).toBe(localId);
    });
  });
});
```

---

### 2.2 Rewrite `sync-engine.spec.ts`

**File**: `tests/unit/sync-engine.spec.ts`

This file should test the actual `SyncEngine` class from `src/lib/sync/sync-engine.ts`.

#### Methods to Test

| Method | Test Cases |
|--------|------------|
| `sync(userId)` | Runs full sync, prevents concurrent syncs |
| `pushPendingOperations()` | Processes queue, removes successful ops, increments retry on failure |
| `executeOperation(op)` | Makes correct API call, handles response |
| `storeServerId()` | Updates local entity with serverId after create |
| `pullUpdates()` | Fetches from /api/sync, applies changes |
| `mergeEntity()` | Last-write-wins conflict resolution |
| `getPendingCount()` | Returns count of queued operations |
| `getIsSyncing()` | Returns true while sync in progress |

#### Example Test Implementation

```typescript
import { describe, expect, it, beforeEach, vi, afterEach } from 'vitest';
import 'fake-indexeddb/auto';
import { localDB } from '../../src/lib/db/local-db';
import { syncEngine } from '../../src/lib/sync/sync-engine';
import { createExercise, getPendingOperations } from '../../src/lib/db/local-repository';

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('Sync Engine', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await localDB.exercises.clear();
    await localDB.templates.clear();
    await localDB.workouts.clear();
    await localDB.offlineQueue.clear();
    await localDB.syncMetadata.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('sync()', () => {
    it('should push pending operations and pull updates', async () => {
      // Setup: Create an exercise (queues a create operation)
      await createExercise('user-1', {
        name: 'Test Exercise',
        muscleGroup: 'Chest',
      });

      // Mock successful API responses
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ id: 'server-id-123', updatedAt: new Date().toISOString() }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            exercises: [],
            templates: [],
            workouts: [],
            lastSync: new Date().toISOString(),
          }),
        });

      const result = await syncEngine.sync('user-1');

      expect(result.success).toBe(true);
      expect(result.pushed).toBe(1);
      expect(result.errors).toBe(0);

      // Verify operation was removed from queue
      const remainingOps = await getPendingOperations();
      expect(remainingOps).toHaveLength(0);
    });

    it('should prevent concurrent sync calls', async () => {
      mockFetch.mockImplementation(() =>
        new Promise(resolve =>
          setTimeout(() => resolve({
            ok: true,
            json: () => Promise.resolve({
              exercises: [],
              templates: [],
              workouts: [],
              lastSync: new Date().toISOString(),
            }),
          }), 100)
        )
      );

      const sync1 = syncEngine.sync('user-1');
      const sync2 = syncEngine.sync('user-1');

      const [result1, result2] = await Promise.all([sync1, sync2]);

      // Both should return the same result (same promise)
      expect(result1).toBe(result2);
    });
  });

  describe('executeOperation()', () => {
    it('should POST for create operations', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: 'server-123', updatedAt: new Date().toISOString() }),
      });

      const op = {
        id: 1,
        operationId: 'op-1',
        type: 'create' as const,
        entity: 'exercise' as const,
        localId: 'local-1',
        data: { name: 'Test' },
        timestamp: new Date(),
        retryCount: 0,
        maxRetries: 3,
      };

      const result = await syncEngine.executeOperation(op);

      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/exercises',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(op.data),
        })
      );
    });

    it('should PUT for update operations', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) });

      const op = {
        id: 1,
        operationId: 'op-1',
        type: 'update' as const,
        entity: 'exercise' as const,
        localId: 'local-1',
        data: { name: 'Updated' },
        timestamp: new Date(),
        retryCount: 0,
        maxRetries: 3,
      };

      await syncEngine.executeOperation(op);

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/exercises',
        expect.objectContaining({ method: 'PUT' })
      );
    });

    it('should DELETE for delete operations', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) });

      const op = {
        id: 1,
        operationId: 'op-1',
        type: 'delete' as const,
        entity: 'exercise' as const,
        localId: 'local-1',
        data: { localId: 'local-1' },
        timestamp: new Date(),
        retryCount: 0,
        maxRetries: 3,
      };

      await syncEngine.executeOperation(op);

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/exercises',
        expect.objectContaining({ method: 'DELETE' })
      );
    });

    it('should return false on API error', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });

      const op = {
        id: 1,
        operationId: 'op-1',
        type: 'create' as const,
        entity: 'exercise' as const,
        localId: 'local-1',
        data: { name: 'Test' },
        timestamp: new Date(),
        retryCount: 0,
        maxRetries: 3,
      };

      const result = await syncEngine.executeOperation(op);
      expect(result).toBe(false);
    });

    it('should return false on network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const op = {
        id: 1,
        operationId: 'op-1',
        type: 'create' as const,
        entity: 'exercise' as const,
        localId: 'local-1',
        data: { name: 'Test' },
        timestamp: new Date(),
        retryCount: 0,
        maxRetries: 3,
      };

      const result = await syncEngine.executeOperation(op);
      expect(result).toBe(false);
    });
  });

  describe('storeServerId()', () => {
    it('should update local entity with serverId after successful create', async () => {
      const localId = await createExercise('user-1', {
        name: 'Test',
        muscleGroup: 'Chest',
      });

      await syncEngine.storeServerId(
        'exercise',
        localId,
        'server-id-123',
        new Date().toISOString()
      );

      const exercise = await localDB.exercises.where('localId').equals(localId).first();
      expect(exercise?.serverId).toBe('server-id-123');
      expect(exercise?.syncStatus).toBe('synced');
      expect(exercise?.needsSync).toBe(false);
    });
  });

  describe('getPendingCount()', () => {
    it('should return count of queued operations', async () => {
      await createExercise('user-1', { name: 'Ex1', muscleGroup: 'Chest' });
      await createExercise('user-1', { name: 'Ex2', muscleGroup: 'Back' });

      const count = await syncEngine.getPendingCount();
      expect(count).toBe(2);
    });
  });
});
```

---

### 2.3 Rewrite `offline-queue.spec.ts`

**File**: `tests/unit/offline-queue.spec.ts`

This file should test the offline queue behavior with actual Dexie operations.

#### Test Cases

| Category | Test Cases |
|----------|------------|
| Queue Operations | Add operation, retrieve by timestamp order, remove operation |
| Retry Logic | Increment retry count, filter by max retries, mark as failed |
| Operation Types | Create/Update/Delete for each entity type |
| Timestamps | Operations ordered by timestamp |

#### Example Test Implementation

```typescript
import { describe, expect, it, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { localDB, type OfflineOperation } from '../../src/lib/db/local-db';
import {
  getPendingOperations,
  removeOperation,
  incrementRetry,
  queueOperationOp,
} from '../../src/lib/db/local-repository';

describe('Offline Queue Operations', () => {
  beforeEach(async () => {
    await localDB.offlineQueue.clear();
  });

  describe('queueOperation', () => {
    it('should add operation to queue with correct fields', async () => {
      await queueOperationOp('create', 'exercise', 'local-1', { name: 'Test' });

      const ops = await getPendingOperations();
      expect(ops).toHaveLength(1);
      expect(ops[0].type).toBe('create');
      expect(ops[0].entity).toBe('exercise');
      expect(ops[0].localId).toBe('local-1');
      expect(ops[0].retryCount).toBe(0);
      expect(ops[0].maxRetries).toBe(3);
      expect(ops[0].operationId).toMatch(/^[0-9a-f-]{36}$/);
    });

    it('should support all entity types', async () => {
      await queueOperationOp('create', 'exercise', 'local-1', {});
      await queueOperationOp('create', 'template', 'local-2', {});
      await queueOperationOp('create', 'workout', 'local-3', {});
      await queueOperationOp('create', 'workout_exercise', 'local-4', {});
      await queueOperationOp('create', 'workout_set', 'local-5', {});

      const ops = await getPendingOperations();
      expect(ops).toHaveLength(5);
      expect(ops.map(op => op.entity)).toEqual([
        'exercise', 'template', 'workout', 'workout_exercise', 'workout_set'
      ]);
    });
  });

  describe('getPendingOperations', () => {
    it('should return operations ordered by timestamp', async () => {
      // Add operations with slight delays to ensure different timestamps
      await queueOperationOp('create', 'exercise', 'local-1', {});
      await new Promise(resolve => setTimeout(resolve, 10));
      await queueOperationOp('create', 'exercise', 'local-2', {});
      await new Promise(resolve => setTimeout(resolve, 10));
      await queueOperationOp('create', 'exercise', 'local-3', {});

      const ops = await getPendingOperations();
      expect(ops[0].localId).toBe('local-1');
      expect(ops[1].localId).toBe('local-2');
      expect(ops[2].localId).toBe('local-3');
    });
  });

  describe('removeOperation', () => {
    it('should remove operation from queue', async () => {
      await queueOperationOp('create', 'exercise', 'local-1', {});
      const ops = await getPendingOperations();
      expect(ops).toHaveLength(1);

      await removeOperation(ops[0].id!);

      const remainingOps = await getPendingOperations();
      expect(remainingOps).toHaveLength(0);
    });
  });

  describe('incrementRetry', () => {
    it('should increment retryCount', async () => {
      await queueOperationOp('create', 'exercise', 'local-1', {});
      const ops = await getPendingOperations();
      expect(ops[0].retryCount).toBe(0);

      await incrementRetry(ops[0].id!);

      const updatedOps = await getPendingOperations();
      expect(updatedOps[0].retryCount).toBe(1);
    });

    it('should increment multiple times', async () => {
      await queueOperationOp('create', 'exercise', 'local-1', {});
      const ops = await getPendingOperations();

      await incrementRetry(ops[0].id!);
      await incrementRetry(ops[0].id!);
      await incrementRetry(ops[0].id!);

      const updatedOps = await getPendingOperations();
      expect(updatedOps[0].retryCount).toBe(3);
    });
  });

  describe('retry filtering', () => {
    it('should be able to filter out exhausted retries', async () => {
      await queueOperationOp('create', 'exercise', 'local-1', {});
      await queueOperationOp('create', 'exercise', 'local-2', {});
      
      const ops = await getPendingOperations();
      
      // Exhaust retries on first operation
      await incrementRetry(ops[0].id!);
      await incrementRetry(ops[0].id!);
      await incrementRetry(ops[0].id!);

      const allOps = await getPendingOperations();
      const pendingOps = allOps.filter(op => op.retryCount < op.maxRetries);

      expect(allOps).toHaveLength(2);
      expect(pendingOps).toHaveLength(1);
      expect(pendingOps[0].localId).toBe('local-2');
    });
  });
});
```

---

## Phase 3: Improve E2E Tests

### 3.1 Add IndexedDB Verification to `offline.spec.ts`

**File**: `tests/e2e/offline.spec.ts`

Add tests that verify data actually persists in IndexedDB.

#### Additional Test Cases

```typescript
test.describe('Offline Data Persistence', () => {
  test('should persist exercise in IndexedDB when created offline', async ({ page }) => {
    await page.goto(`${BASE_URL}/exercises`, { waitUntil: 'networkidle' });

    // Go offline
    await page.context().setOffline(true);

    // Create exercise
    await page.goto(`${BASE_URL}/exercises/new`, { waitUntil: 'domcontentloaded' });
    const exerciseName = `Offline Persist Test ${Date.now()}`;
    await page.locator('input#name').fill(exerciseName);
    await page.locator('select#muscleGroup').selectOption('Chest');
    await page.locator('button[type="submit"]').click();

    // Verify data in IndexedDB
    const indexedDBData = await page.evaluate(async () => {
      return new Promise((resolve) => {
        const request = indexedDB.open('FitWorkoutDB');
        request.onsuccess = () => {
          const db = request.result;
          const tx = db.transaction('exercises', 'readonly');
          const store = tx.objectStore('exercises');
          const getAllRequest = store.getAll();
          getAllRequest.onsuccess = () => {
            resolve(getAllRequest.result);
          };
        };
      });
    });

    expect(indexedDBData).toContainEqual(
      expect.objectContaining({
        name: exerciseName,
        syncStatus: 'pending',
        needsSync: true,
      })
    );

    await page.context().setOffline(false);
  });

  test('should have pending operations in queue after offline creation', async ({ page }) => {
    await page.goto(`${BASE_URL}/exercises`, { waitUntil: 'networkidle' });
    await page.context().setOffline(true);

    // Create exercise offline
    await page.goto(`${BASE_URL}/exercises/new`, { waitUntil: 'domcontentloaded' });
    await page.locator('input#name').fill(`Queue Test ${Date.now()}`);
    await page.locator('select#muscleGroup').selectOption('Back');
    await page.locator('button[type="submit"]').click();

    // Check offline queue
    const queueData = await page.evaluate(async () => {
      return new Promise((resolve) => {
        const request = indexedDB.open('FitWorkoutDB');
        request.onsuccess = () => {
          const db = request.result;
          const tx = db.transaction('offlineQueue', 'readonly');
          const store = tx.objectStore('offlineQueue');
          const getAllRequest = store.getAll();
          getAllRequest.onsuccess = () => {
            resolve(getAllRequest.result);
          };
        };
      });
    });

    expect(queueData.length).toBeGreaterThan(0);
    expect(queueData[0]).toMatchObject({
      type: 'create',
      entity: 'exercise',
    });

    await page.context().setOffline(false);
  });
});
```

### 3.2 Add Sync Verification Tests

```typescript
test.describe('Sync Engine E2E', () => {
  test('should sync pending operations when coming back online', async ({ page }) => {
    await page.goto(`${BASE_URL}/exercises`, { waitUntil: 'networkidle' });

    // Create exercise while online (to ensure API works)
    const exerciseName = `Sync Verify Test ${Date.now()}`;
    await page.goto(`${BASE_URL}/exercises/new`, { waitUntil: 'networkidle' });
    await page.locator('input#name').fill(exerciseName);
    await page.locator('select#muscleGroup').selectOption('Legs');
    await page.locator('button[type="submit"]').click();
    await page.waitForURL(/\/exercises\/[a-zA-Z0-9-]+/, { timeout: 10000 });

    // Wait for sync to complete
    await page.waitForTimeout(3000);

    // Verify synced status in IndexedDB
    const syncStatus = await page.evaluate(async (name) => {
      return new Promise((resolve) => {
        const request = indexedDB.open('FitWorkoutDB');
        request.onsuccess = () => {
          const db = request.result;
          const tx = db.transaction('exercises', 'readonly');
          const store = tx.objectStore('exercises');
          const getAllRequest = store.getAll();
          getAllRequest.onsuccess = () => {
            const exercise = getAllRequest.result.find((e: any) => e.name === name);
            resolve(exercise?.syncStatus);
          };
        };
      });
    }, exerciseName);

    expect(syncStatus).toBe('synced');
  });

  test('should clear offline queue after successful sync', async ({ page }) => {
    await page.goto(`${BASE_URL}/exercises`, { waitUntil: 'networkidle' });

    // Check initial queue is empty (or get count)
    const initialQueueCount = await page.evaluate(async () => {
      return new Promise((resolve) => {
        const request = indexedDB.open('FitWorkoutDB');
        request.onsuccess = () => {
          const db = request.result;
          const tx = db.transaction('offlineQueue', 'readonly');
          const store = tx.objectStore('offlineQueue');
          const countRequest = store.count();
          countRequest.onsuccess = () => {
            resolve(countRequest.result);
          };
        };
      });
    });

    // Create exercise
    await page.goto(`${BASE_URL}/exercises/new`, { waitUntil: 'networkidle' });
    await page.locator('input#name').fill(`Queue Clear Test ${Date.now()}`);
    await page.locator('select#muscleGroup').selectOption('Core');
    await page.locator('button[type="submit"]').click();
    await page.waitForURL(/\/exercises\/[a-zA-Z0-9-]+/, { timeout: 10000 });

    // Wait for sync
    await page.waitForTimeout(5000);

    // Check queue is cleared
    const finalQueueCount = await page.evaluate(async () => {
      return new Promise((resolve) => {
        const request = indexedDB.open('FitWorkoutDB');
        request.onsuccess = () => {
          const db = request.result;
          const tx = db.transaction('offlineQueue', 'readonly');
          const store = tx.objectStore('offlineQueue');
          const countRequest = store.count();
          countRequest.onsuccess = () => {
            resolve(countRequest.result);
          };
        };
      });
    });

    expect(finalQueueCount).toBeLessThanOrEqual(initialQueueCount);
  });
});
```

---

## Phase 4: Additional Test Coverage

### 4.1 Conflict Resolution Tests

**File**: `tests/unit/conflict-resolution.spec.ts` (new file)

```typescript
import { describe, expect, it, beforeEach, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { localDB } from '../../src/lib/db/local-db';
import { syncEngine } from '../../src/lib/sync/sync-engine';
import { createExercise } from '../../src/lib/db/local-repository';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('Conflict Resolution - Last Write Wins', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await localDB.exercises.clear();
    await localDB.offlineQueue.clear();
    await localDB.syncMetadata.clear();
  });

  it('should prefer server data when server is newer', async () => {
    // Create local exercise with old timestamp
    const localId = await createExercise('user-1', {
      name: 'Local Name',
      muscleGroup: 'Chest',
    });

    // Update local record to have old updatedAt
    const exercise = await localDB.exercises.where('localId').equals(localId).first();
    await localDB.exercises.update(exercise!.id!, {
      updatedAt: new Date('2024-01-01'),
    });

    // Mock server response with newer timestamp
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        exercises: [{
          id: 'server-123',
          localId: localId,
          name: 'Server Name',
          updatedAt: new Date('2024-01-15').toISOString(),
        }],
        templates: [],
        workouts: [],
        lastSync: new Date().toISOString(),
      }),
    });

    // Trigger pull (after push completes)
    await syncEngine.sync('user-1');

    const updatedExercise = await localDB.exercises.where('localId').equals(localId).first();
    expect(updatedExercise?.syncStatus).toBe('synced');
  });

  it('should keep local data when local is newer', async () => {
    // Create local exercise with recent timestamp
    const localId = await createExercise('user-1', {
      name: 'Local Name',
      muscleGroup: 'Chest',
    });

    // Mock server response with older timestamp
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ id: 'server-123', updatedAt: new Date().toISOString() }) })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          exercises: [{
            id: 'server-123',
            localId: localId,
            name: 'Server Name',
            updatedAt: new Date('2024-01-01').toISOString(),
          }],
          templates: [],
          workouts: [],
          lastSync: new Date().toISOString(),
        }),
      });

    await syncEngine.sync('user-1');

    const exercise = await localDB.exercises.where('localId').equals(localId).first();
    expect(exercise?.name).toBe('Local Name'); // Local name preserved
  });
});
```

### 4.2 ID Mapping Tests

**File**: `tests/unit/id-mapping.spec.ts` (new file)

```typescript
import { describe, expect, it, beforeEach, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { localDB } from '../../src/lib/db/local-db';
import { syncEngine } from '../../src/lib/sync/sync-engine';
import { createExercise, createWorkout, addExerciseToWorkout } from '../../src/lib/db/local-repository';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('ID Mapping - localId to serverId', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await localDB.exercises.clear();
    await localDB.workouts.clear();
    await localDB.workoutExercises.clear();
    await localDB.offlineQueue.clear();
  });

  it('should store serverId after successful create sync', async () => {
    const localId = await createExercise('user-1', {
      name: 'Test Exercise',
      muscleGroup: 'Chest',
    });

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          id: 'server-exercise-abc123',
          updatedAt: new Date().toISOString(),
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          exercises: [],
          templates: [],
          workouts: [],
          lastSync: new Date().toISOString(),
        }),
      });

    await syncEngine.sync('user-1');

    const exercise = await localDB.exercises.where('localId').equals(localId).first();
    expect(exercise?.serverId).toBe('server-exercise-abc123');
    expect(exercise?.syncStatus).toBe('synced');
  });

  it('should preserve localId even after getting serverId', async () => {
    const localId = await createExercise('user-1', {
      name: 'Preserve LocalId Test',
      muscleGroup: 'Back',
    });

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          id: 'server-id-xyz',
          updatedAt: new Date().toISOString(),
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          exercises: [],
          templates: [],
          workouts: [],
          lastSync: new Date().toISOString(),
        }),
      });

    await syncEngine.sync('user-1');

    const exercise = await localDB.exercises.where('localId').equals(localId).first();
    expect(exercise?.localId).toBe(localId);
    expect(exercise?.serverId).toBe('server-id-xyz');
  });
});
```

---

## Phase 5: Test Commands

Add these scripts to `package.json`:

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:offline": "vitest run --grep 'offline|sync|queue|repository'",
    "test:e2e": "infisical run --env dev -- bun x playwright test",
    "test:e2e:offline": "infisical run --env dev -- bun x playwright test --grep 'offline|service-worker'"
  }
}
```

---

## Checklist

### Phase 1: Infrastructure
- [ ] Install `fake-indexeddb`
- [ ] Create `tests/unit/setup-indexeddb.ts`
- [ ] Update `vitest.config.ts` with setup file

### Phase 2: Unit Tests
- [ ] Rewrite `tests/unit/local-repository.spec.ts`
- [ ] Rewrite `tests/unit/sync-engine.spec.ts`
- [ ] Rewrite `tests/unit/offline-queue.spec.ts`

### Phase 3: E2E Tests
- [ ] Add IndexedDB verification to `tests/e2e/offline.spec.ts`
- [ ] Add sync verification tests
- [ ] Remove `.catch(() => {})` fallbacks for more reliable assertions

### Phase 4: Additional Coverage
- [ ] Create `tests/unit/conflict-resolution.spec.ts`
- [ ] Create `tests/unit/id-mapping.spec.ts`

### Phase 5: Verification
- [ ] Run `bun run test` - all unit tests pass
- [ ] Run `bun run test:e2e:offline` - all E2E tests pass
- [ ] Verify no regressions in existing tests

---

## Success Criteria

1. **Unit tests** actually import and test real implementations
2. **E2E tests** verify IndexedDB state, not just UI
3. **All tests pass** with `bun run test` and `bun run test:e2e`
4. **Coverage** for all public functions in:
   - `src/lib/db/local-repository.ts`
   - `src/lib/sync/sync-engine.ts`
5. **Conflict resolution** and **ID mapping** have dedicated test suites
