import { describe, expect, it, beforeEach, vi, afterEach } from 'vitest';
import 'fake-indexeddb/auto';
import { localDB } from '../../src/lib/db/local-db';
import { syncEngine } from '../../src/lib/sync/sync-engine';
import { createExercise, createTemplate, createWorkout } from '../../src/lib/db/local-repository';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('ID Mapping - localId to serverId', () => {
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

  describe('Exercise ID Mapping', () => {
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
      expect(exercise?.needsSync).toBe(false);
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

    it('should store serverUpdatedAt after successful sync', async () => {
      const serverUpdatedAt = new Date('2024-06-15T10:30:00Z');
      const localId = await createExercise('user-1', {
        name: 'Timestamp Test',
        muscleGroup: 'Legs',
      });

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            id: 'server-exercise-timestamp',
            updatedAt: serverUpdatedAt.toISOString(),
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
      expect(exercise?.serverUpdatedAt).toEqual(serverUpdatedAt);
    });

    it('should handle multiple exercises with different serverIds', async () => {
      const localId1 = await createExercise('user-1', {
        name: 'Exercise 1',
        muscleGroup: 'Chest',
      });
      const localId2 = await createExercise('user-1', {
        name: 'Exercise 2',
        muscleGroup: 'Back',
      });

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            id: 'server-exercise-1',
            updatedAt: new Date().toISOString(),
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            id: 'server-exercise-2',
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

      const exercise1 = await localDB.exercises.where('localId').equals(localId1).first();
      const exercise2 = await localDB.exercises.where('localId').equals(localId2).first();

      expect(exercise1?.serverId).toBe('server-exercise-1');
      expect(exercise2?.serverId).toBe('server-exercise-2');
      expect(exercise1?.localId).toBe(localId1);
      expect(exercise2?.localId).toBe(localId2);
    });
  });

  describe('Template ID Mapping', () => {
    it('should store serverId for template after successful create sync', async () => {
      const localId = await createTemplate('user-1', {
        name: 'Push Day Template',
        description: 'Chest, shoulders, and triceps',
        exercises: [],
      });

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            id: 'server-template-xyz789',
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

      const template = await localDB.templates.where('localId').equals(localId).first();
      expect(template?.serverId).toBe('server-template-xyz789');
      expect(template?.syncStatus).toBe('synced');
      expect(template?.localId).toBe(localId);
    });

    it('should preserve localId for template after serverId assignment', async () => {
      const localId = await createTemplate('user-1', {
        name: 'Pull Day Template',
        exercises: [],
      });

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            id: 'server-template-abc',
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

      const template = await localDB.templates.where('localId').equals(localId).first();
      expect(template?.localId).toBe(localId);
      expect(template?.serverId).toBe('server-template-abc');
    });
  });

  describe('Workout ID Mapping', () => {
    it('should store serverId for workout after successful create sync', async () => {
      const localId = await createWorkout('user-1', {
        name: 'Morning Workout',
        status: 'in_progress',
      });

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            id: 'server-workout-work123',
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

      const workout = await localDB.workouts.where('localId').equals(localId).first();
      expect(workout?.serverId).toBe('server-workout-work123');
      expect(workout?.syncStatus).toBe('synced');
      expect(workout?.localId).toBe(localId);
    });

    it('should preserve localId for workout after serverId assignment', async () => {
      const localId = await createWorkout('user-1', {
        name: 'Evening Gym Session',
        status: 'in_progress',
      });

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            id: 'server-workout-evening',
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

      const workout = await localDB.workouts.where('localId').equals(localId).first();
      expect(workout?.localId).toBe(localId);
      expect(workout?.serverId).toBe('server-workout-evening');
    });

    it('should handle completed workout sync', async () => {
      const localId = await createWorkout('user-1', {
        name: 'Completed Session',
        status: 'in_progress',
      });

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            id: 'server-workout-completed',
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

      const workout = await localDB.workouts.where('localId').equals(localId).first();
      expect(workout?.serverId).toBe('server-workout-completed');
      expect(workout?.localId).toBe(localId);
    });
  });

  describe('Mixed Entity Sync', () => {
    it('should map IDs correctly for multiple entity types in single sync', async () => {
      const exerciseLocalId = await createExercise('user-1', {
        name: 'Sync Test Exercise',
        muscleGroup: 'Chest',
      });
      const templateLocalId = await createTemplate('user-1', {
        name: 'Sync Test Template',
        description: 'Testing template',
        exercises: [],
      });
      const workoutLocalId = await createWorkout('user-1', {
        name: 'Sync Test Workout',
        status: 'in_progress',
      });

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            id: 'server-exercise-mixed',
            updatedAt: new Date().toISOString(),
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            id: 'server-template-mixed',
            updatedAt: new Date().toISOString(),
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            id: 'server-workout-mixed',
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

      const exercise = await localDB.exercises.where('localId').equals(exerciseLocalId).first();
      const template = await localDB.templates.where('localId').equals(templateLocalId).first();
      const workout = await localDB.workouts.where('localId').equals(workoutLocalId).first();

      expect(exercise?.serverId).toBe('server-exercise-mixed');
      expect(exercise?.localId).toBe(exerciseLocalId);
      expect(template?.serverId).toBe('server-template-mixed');
      expect(template?.localId).toBe(templateLocalId);
      expect(workout?.serverId).toBe('server-workout-mixed');
      expect(workout?.localId).toBe(workoutLocalId);
    });

    it('should handle sync with no pending operations', async () => {
      mockFetch.mockResolvedValueOnce({
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
      expect(result.pushed).toBe(0);
    });
  });

  describe('storeServerId Direct Method', () => {
    it('should update exercise with serverId directly', async () => {
      const localId = await createExercise('user-1', {
        name: 'Direct Store Test',
        muscleGroup: 'Core',
      });

      await syncEngine.storeServerId(
        'exercise',
        localId,
        'direct-server-id',
        new Date().toISOString()
      );

      const exercise = await localDB.exercises.where('localId').equals(localId).first();
      expect(exercise?.serverId).toBe('direct-server-id');
      expect(exercise?.syncStatus).toBe('synced');
      expect(exercise?.needsSync).toBe(false);
    });

    it('should update template with serverId directly', async () => {
      const localId = await createTemplate('user-1', {
        name: 'Direct Template Store',
        description: 'Testing direct store',
        exercises: [],
      });

      await syncEngine.storeServerId(
        'template',
        localId,
        'template-direct-id',
        new Date().toISOString()
      );

      const template = await localDB.templates.where('localId').equals(localId).first();
      expect(template?.serverId).toBe('template-direct-id');
      expect(template?.syncStatus).toBe('synced');
    });

    it('should update workout with serverId directly', async () => {
      const localId = await createWorkout('user-1', {
        name: 'Direct Workout Store',
        status: 'in_progress',
      });

      await syncEngine.storeServerId(
        'workout',
        localId,
        'workout-direct-id',
        new Date().toISOString()
      );

      const workout = await localDB.workouts.where('localId').equals(localId).first();
      expect(workout?.serverId).toBe('workout-direct-id');
      expect(workout?.syncStatus).toBe('synced');
    });

    it('should handle non-existent localId gracefully', async () => {
      await expect(
        syncEngine.storeServerId(
          'exercise',
          'non-existent-local-id',
          'some-server-id',
          new Date().toISOString()
        )
      ).resolves.not.toThrow();
    });
  });

  describe('Sync Status Verification', () => {
    it('should set needsSync to false after successful sync', async () => {
      const localId = await createExercise('user-1', {
        name: 'Needs Sync Test',
        muscleGroup: 'Shoulders',
      });

      expect((await localDB.exercises.where('localId').equals(localId).first())?.needsSync).toBe(true);

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            id: 'server-needs-sync',
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
      expect(exercise?.needsSync).toBe(false);
      expect(exercise?.syncStatus).toBe('synced');
    });

    it('should maintain pending status on sync failure', async () => {
      const localId = await createExercise('user-1', {
        name: 'Sync Failure Test',
        muscleGroup: 'Forearms',
      });

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      await syncEngine.sync('user-1');

      const exercise = await localDB.exercises.where('localId').equals(localId).first();
      expect(exercise?.syncStatus).toBe('pending');
      expect(exercise?.serverId).toBeUndefined();
    });
  });
});
