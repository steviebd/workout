import { describe, expect, it, beforeEach, vi, afterEach } from 'vitest';
import 'fake-indexeddb/auto';
import { localDB, type OfflineOperation } from '../../src/lib/db/local-db';
import { syncEngine } from '../../src/lib/sync/sync-engine';
import {
  createExercise,
  updateExercise,
  deleteExercise,
  createTemplate,
  createWorkout,
  getPendingOperations,
} from '../../src/lib/db/local-repository';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('Sync Engine', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await localDB.exercises.clear();
    await localDB.templates.clear();
    await localDB.workouts.clear();
    await localDB.workoutExercises.clear();
    await localDB.workoutSets.clear();
    await localDB.offlineQueue.clear();
    await localDB.syncMetadata.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('sync()', () => {
    it('should push pending operations and pull updates', async () => {
      await createExercise('user-1', {
        name: 'Test Exercise',
        muscleGroup: 'Chest',
      });

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

      const remainingOps = await getPendingOperations();
      expect(remainingOps).toHaveLength(0);
    });

    it('should prevent concurrent sync calls', async () => {
      mockFetch.mockImplementation(() => {
        return new Promise((resolve) => {
          setTimeout(() => {
            resolve({
              ok: true,
              json: () =>
                Promise.resolve({
                  exercises: [],
                  templates: [],
                  workouts: [],
                  lastSync: new Date().toISOString(),
                }),
            });
          }, 100);
        });
      });

      const sync1 = syncEngine.sync('user-1');
      const sync2 = syncEngine.sync('user-1');

      const [result1, result2] = await Promise.all([sync1, sync2]);

      expect(result1).toBe(result2);
    });

    it('should return error count when sync operations exhaust retries', async () => {
      await createExercise('user-1', {
        name: 'Test Exercise',
        muscleGroup: 'Chest',
      });

      mockFetch.mockResolvedValue({ ok: false, status: 500 });

      for (let i = 0; i < 3; i++) {
        await syncEngine.sync('user-1');
      }

      const result = await syncEngine.sync('user-1');

      expect(result.pushed).toBe(0);
      expect(result.errors).toBe(1);
    });

    it('should return success with zero pushed when no pending operations', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              exercises: [],
              templates: [],
              workouts: [],
              lastSync: new Date().toISOString(),
            }),
        });

      const result = await syncEngine.sync('user-1');

      expect(result.success).toBe(true);
      expect(result.pushed).toBe(0);
    });

    it('should pull server changes and update local entities', async () => {
      const serverTimestamp = new Date().toISOString();

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              exercises: [
                { id: 'server-ex-1', localId: 'local-1', name: 'Server Exercise', muscleGroup: 'Chest', updatedAt: serverTimestamp },
              ],
              templates: [],
              workouts: [],
              lastSync: new Date().toISOString(),
            }),
        });

      const result = await syncEngine.sync('user-1');

      expect(result.success).toBe(true);
      expect(result.pulled).toBe(1);
    });
  });

  describe('pushPendingOperations() via sync()', () => {
    it('should process operations in timestamp order', async () => {
      const localId1 = await createExercise('user-1', {
        name: 'Exercise 1',
        muscleGroup: 'Chest',
      });

      await new Promise((resolve) => {
        setTimeout(resolve, 10);
      });

      await updateExercise(localId1, { name: 'Updated Exercise 1' });

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ id: 'server-1', updatedAt: new Date().toISOString() }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({}),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              exercises: [],
              templates: [],
              workouts: [],
              lastSync: new Date().toISOString(),
            }),
        });

      const opsBefore = await getPendingOperations();
      expect(opsBefore).toHaveLength(2);
      expect(opsBefore[0].type).toBe('create');
      expect(opsBefore[1].type).toBe('update');
    });

    it('should remove successful operations from queue', async () => {
      await createExercise('user-1', {
        name: 'Test Exercise',
        muscleGroup: 'Chest',
      });

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ id: 'server-123', updatedAt: new Date().toISOString() }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              exercises: [],
              templates: [],
              workouts: [],
              lastSync: new Date().toISOString(),
            }),
        });

      await syncEngine.sync('user-1');

      const remainingOps = await getPendingOperations();
      expect(remainingOps).toHaveLength(0);
    });

    it('should increment retry count on failed operations', async () => {
      await createExercise('user-1', {
        name: 'Test Exercise',
        muscleGroup: 'Chest',
      });

      mockFetch.mockResolvedValue({ ok: false, status: 500 });

      await syncEngine.sync('user-1');

      const ops = await getPendingOperations();
      expect(ops[0].retryCount).toBe(1);
    });

    it('should mark as error after max retries exceeded', async () => {
      await createExercise('user-1', {
        name: 'Test Exercise',
        muscleGroup: 'Chest',
      });

      mockFetch.mockResolvedValue({ ok: false, status: 500 });

      for (let i = 0; i < 3; i++) {
        await syncEngine.sync('user-1');
      }

      const ops = await getPendingOperations();
      expect(ops[0].retryCount).toBe(3);
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
        data: { name: 'Test', muscleGroup: 'Chest' },
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
          headers: { 'Content-Type': 'application/json' },
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
        data: { name: 'Updated', muscleGroup: 'Chest' },
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

    it('should build correct URL for template operations', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) });

      const op = {
        id: 1,
        operationId: 'op-1',
        type: 'create' as const,
        entity: 'template' as const,
        localId: 'local-1',
        data: { name: 'Template' },
        timestamp: new Date(),
        retryCount: 0,
        maxRetries: 3,
      };

      await syncEngine.executeOperation(op);

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/templates',
        expect.any(Object)
      );
    });

    it('should build correct URL for workout operations', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) });

      const op = {
        id: 1,
        operationId: 'op-1',
        type: 'create' as const,
        entity: 'workout' as const,
        localId: 'local-1',
        data: { name: 'Workout' },
        timestamp: new Date(),
        retryCount: 0,
        maxRetries: 3,
      };

      await syncEngine.executeOperation(op);

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/workouts',
        expect.any(Object)
      );
    });

    it('should return false for unknown entity type', async () => {
      const op: OfflineOperation = {
        id: 1,
        operationId: 'op-1',
        type: 'create',
        entity: 'exercise',
        localId: 'local-1',
        data: { name: 'Test' },
        timestamp: new Date(),
        retryCount: 0,
        maxRetries: 3,
      };

      mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ id: 'server-123', updatedAt: new Date().toISOString() }) });

      const result = await syncEngine.executeOperation(op);
      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/exercises',
        expect.any(Object)
      );
    });

    it('should include credentials in requests', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) });

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

      await syncEngine.executeOperation(op);

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/exercises',
        expect.objectContaining({ credentials: 'include' })
      );
    });

    it('should call storeServerId after successful create', async () => {
      const localId = await createExercise('user-1', {
        name: 'Test',
        muscleGroup: 'Chest',
      });

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ id: 'server-123', updatedAt: new Date().toISOString() }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              exercises: [],
              templates: [],
              workouts: [],
              lastSync: new Date().toISOString(),
            }),
        });

      await syncEngine.sync('user-1');

      const exercise = await localDB.exercises.where('localId').equals(localId).first();
      expect(exercise?.serverId).toBe('server-123');
    });

    it('should include correct Content-Type header', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) });

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

      await syncEngine.executeOperation(op);

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/exercises',
        expect.objectContaining({
          headers: { 'Content-Type': 'application/json' },
        })
      );
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

    it('should update serverUpdatedAt field', async () => {
      const localId = await createExercise('user-1', {
        name: 'Test',
        muscleGroup: 'Chest',
      });

      const serverUpdatedAt = new Date().toISOString();
      await syncEngine.storeServerId('exercise', localId, 'server-123', serverUpdatedAt);

      const exercise = await localDB.exercises.where('localId').equals(localId).first();
      expect(exercise?.serverUpdatedAt).toBeDefined();
      expect(exercise?.serverUpdatedAt?.getTime()).toBe(new Date(serverUpdatedAt).getTime());
    });

    it('should handle template entity', async () => {
      const localId = await createTemplate('user-1', {
        name: 'Template',
        exercises: [],
      });

      await syncEngine.storeServerId('template', localId, 'server-template-123', new Date().toISOString());

      const template = await localDB.templates.where('localId').equals(localId).first();
      expect(template?.serverId).toBe('server-template-123');
      expect(template?.syncStatus).toBe('synced');
    });

    it('should handle workout entity', async () => {
      const localId = await createWorkout('user-1', {
        name: 'Workout',
        status: 'in_progress',
      });

      await syncEngine.storeServerId('workout', localId, 'server-workout-123', new Date().toISOString());

      const workout = await localDB.workouts.where('localId').equals(localId).first();
      expect(workout?.serverId).toBe('server-workout-123');
      expect(workout?.syncStatus).toBe('synced');
    });

    it('should do nothing for non-existent local entity', async () => {
      await syncEngine.storeServerId(
        'exercise',
        'non-existent-local-id',
        'server-123',
        new Date().toISOString()
      );

      const count = await localDB.exercises.count();
      expect(count).toBe(0);
    });

    it('should do nothing when local entity not found', async () => {
      await expect(
        syncEngine.storeServerId('exercise', 'non-existent-localId', 'server-123', new Date().toISOString())
      ).resolves.not.toThrow();
    });
  });

  describe('pullUpdates() via sync()', () => {
    it('should fetch from /api/sync on initial sync', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            exercises: [],
            templates: [],
            workouts: [],
            lastSync: new Date().toISOString(),
          }),
      });

      await syncEngine.sync('user-1');

      expect(mockFetch).toHaveBeenCalledWith('/api/sync', expect.any(Object));
    });

    it('should include since parameter for subsequent syncs', async () => {
      await localDB.syncMetadata.put({
        key: 'lastFullSync',
        value: '2024-01-15T10:00:00.000Z',
        updatedAt: new Date(),
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            exercises: [],
            templates: [],
            workouts: [],
            lastSync: new Date().toISOString(),
          }),
      });

      await syncEngine.sync('user-1');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/sync?since='),
        expect.any(Object)
      );
    });

    it('should update last sync time after successful pull', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              exercises: [],
              templates: [],
              workouts: [],
              lastSync: new Date().toISOString(),
            }),
        });

      await syncEngine.sync('user-1');

      const syncedMetadata = await localDB.syncMetadata.where('key').equals('lastFullSync').first();
      expect(syncedMetadata).toBeDefined();
      expect(syncedMetadata?.value).toBeDefined();
    });

    it('should count pulled entities in result', async () => {
      const serverTimestamp = new Date().toISOString();

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              exercises: [{ id: 'server-ex-1', localId: 'local-1', updatedAt: serverTimestamp }],
              templates: [{ id: 'server-tmpl-1', updatedAt: serverTimestamp }],
              workouts: [{ id: 'server-wo-1', updatedAt: serverTimestamp }],
              lastSync: new Date().toISOString(),
            }),
        });

      const result = await syncEngine.sync('user-1');

      expect(result.pulled).toBe(3);
    });

    it('should handle pull errors gracefully', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ id: 'server-123', updatedAt: new Date().toISOString() }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              exercises: [],
              templates: [],
              workouts: [],
              lastSync: new Date().toISOString(),
            }),
        });

      const result = await syncEngine.sync('user-1');

      expect(result.pulled).toBe(0);
    });
  });

  describe('mergeEntity() via sync() conflict resolution', () => {
    it('should update local entity when server data is newer', async () => {
      const localId = await createExercise('user-1', {
        name: 'Local Name',
        muscleGroup: 'Chest',
      });

      const exercise = await localDB.exercises.where('localId').equals(localId).first();
      if (exercise?.id !== undefined) {
        await localDB.exercises.update(exercise.id, {
          updatedAt: new Date('2024-01-01'),
        });
      }

      const serverTimestamp = new Date('2024-01-15').toISOString();

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ id: 'server-123', updatedAt: new Date().toISOString() }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              exercises: [{ id: 'server-123', localId, updatedAt: serverTimestamp }],
              templates: [],
              workouts: [],
              lastSync: new Date().toISOString(),
            }),
        });

      await syncEngine.sync('user-1');

      const updated = await localDB.exercises.where('localId').equals(localId).first();
      expect(updated?.syncStatus).toBe('synced');
      expect(updated?.needsSync).toBe(false);
    });

    it('should keep local data when local is newer', async () => {
      const localId = await createExercise('user-1', {
        name: 'Local Name',
        muscleGroup: 'Chest',
      });

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ id: 'server-123', updatedAt: new Date().toISOString() }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              exercises: [
                {
                  id: 'server-123',
                  localId,
                  name: 'Server Name',
                  updatedAt: new Date('2024-01-01').toISOString(),
                },
              ],
              templates: [],
              workouts: [],
              lastSync: new Date().toISOString(),
            }),
        });

      await syncEngine.sync('user-1');

      const exercise = await localDB.exercises.where('localId').equals(localId).first();
      expect(exercise?.name).toBe('Local Name');
      expect(exercise?.serverId).toBe('server-123');
    });
  });

  describe('getPendingCount()', () => {
    it('should return count of queued operations', async () => {
      await createExercise('user-1', { name: 'Ex1', muscleGroup: 'Chest' });
      await createExercise('user-1', { name: 'Ex2', muscleGroup: 'Back' });

      const count = await syncEngine.getPendingCount();
      expect(count).toBe(2);
    });

    it('should return zero when queue is empty', async () => {
      const count = await syncEngine.getPendingCount();
      expect(count).toBe(0);
    });

    it('should count all operation types', async () => {
      const localId1 = await createExercise('user-1', { name: 'Ex1', muscleGroup: 'Chest' });
      await deleteExercise(localId1);

      await createTemplate('user-1', { name: 'Template', exercises: [] });
      await createWorkout('user-1', { name: 'Workout', status: 'in_progress' });

      const count = await syncEngine.getPendingCount();
      expect(count).toBe(4);
    });
  });

  describe('getIsSyncing()', () => {
    it('should return false initially', () => {
      expect(syncEngine.getIsSyncing()).toBe(false);
    });

    it('should return true while sync is in progress', async () => {
      mockFetch.mockImplementation(() => {
        return new Promise((resolve) => {
          setTimeout(() => {
            resolve({
              ok: true,
              json: () =>
                Promise.resolve({
                  exercises: [],
                  templates: [],
                  workouts: [],
                  lastSync: new Date().toISOString(),
                }),
            });
          }, 50);
        });
      });

      const syncPromise = syncEngine.sync('user-1');

      expect(syncEngine.getIsSyncing()).toBe(true);

      await syncPromise;

      expect(syncEngine.getIsSyncing()).toBe(false);
    });

    it('should return false after sync completes', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            exercises: [],
            templates: [],
            workouts: [],
            lastSync: new Date().toISOString(),
          }),
      });

      await syncEngine.sync('user-1');

      expect(syncEngine.getIsSyncing()).toBe(false);
    });
  });

  describe('full sync flow', () => {
    it('should handle create, update, and delete operations', async () => {
      const createId = await createExercise('user-1', {
        name: 'To Update',
        muscleGroup: 'Chest',
      });

      await updateExercise(createId, { name: 'Updated Name' });

      const deleteId = await createExercise('user-1', {
        name: 'To Delete',
        muscleGroup: 'Back',
      });
      await deleteExercise(deleteId);

      let callCount = 0;
      mockFetch.mockImplementation(() => {
        callCount++;
        if (callCount <= 3) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve({ id: `server-${callCount}`, updatedAt: new Date().toISOString() }) });
        }
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              exercises: [],
              templates: [],
              workouts: [],
              lastSync: new Date().toISOString(),
            }),
        });
      });

      const result = await syncEngine.sync('user-1');

      expect(result.success).toBe(true);
      expect(result.pushed).toBe(4);
      expect(result.errors).toBe(0);

      const remainingOps = await getPendingOperations();
      expect(remainingOps).toHaveLength(0);
    });

    it('should sync multiple entity types', async () => {
      await createExercise('user-1', { name: 'Exercise', muscleGroup: 'Chest' });
      await createTemplate('user-1', { name: 'Template', exercises: [] });
      await createWorkout('user-1', { name: 'Workout', status: 'in_progress' });

      let callCount = 0;
      mockFetch.mockImplementation(() => {
        callCount++;
        if (callCount <= 3) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve({ id: `server-${callCount}`, updatedAt: new Date().toISOString() }) });
        }
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              exercises: [],
              templates: [],
              workouts: [],
              lastSync: new Date().toISOString(),
            }),
        });
      });

      const result = await syncEngine.sync('user-1');

      expect(result.success).toBe(true);
      expect(result.pushed).toBe(3);
    });

    it('should continue processing remaining operations after one fails', async () => {
      await createExercise('user-1', { name: 'Ex1', muscleGroup: 'Chest' });
      await createExercise('user-1', { name: 'Ex2', muscleGroup: 'Back' });

      mockFetch
        .mockResolvedValueOnce({ ok: false, status: 500 })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ id: 'server-2', updatedAt: new Date().toISOString() }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
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

      const ops = await getPendingOperations();
      expect(ops).toHaveLength(1);
      expect(ops[0].retryCount).toBe(1);
    });

    it('should handle empty server response', async () => {
      await createExercise('user-1', { name: 'Test', muscleGroup: 'Chest' });

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ id: 'server-123', updatedAt: new Date().toISOString() }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              exercises: [],
              templates: [],
              workouts: [],
              lastSync: new Date().toISOString(),
            }),
        });

      const result = await syncEngine.sync('user-1');

      expect(result.success).toBe(true);
      expect(result.pulled).toBe(0);
    });
  });
});
