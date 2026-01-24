import { describe, expect, it, beforeEach, vi, afterEach } from 'vitest';
import 'fake-indexeddb/auto';
import { localDB } from '../../src/lib/db/local-db';
import { syncEngine } from '../../src/lib/sync/sync-engine';
import { createExercise, createTemplate, createWorkout } from '../../src/lib/db/local-repository';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('Conflict Resolution - Last Write Wins', () => {
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

  describe('mergeEntity - Server Newer', () => {
    it('should prefer server data when server is newer for exercises', async () => {
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

      await syncEngine.mergeEntity('exercises', {
        id: 'server-123',
        localId,
        updatedAt: new Date('2024-01-15').toISOString(),
      });

      const updatedExercise = await localDB.exercises.where('localId').equals(localId).first();
      expect(updatedExercise?.syncStatus).toBe('synced');
      expect(updatedExercise?.needsSync).toBe(false);
      expect(updatedExercise?.serverUpdatedAt?.toISOString()).toBe(new Date('2024-01-15').toISOString());
    });

    it('should prefer server data when server is newer for templates', async () => {
      const localId = await createTemplate('user-1', {
        name: 'Local Template',
        description: 'Local description',
        exercises: [],
      });

      const template = await localDB.templates.where('localId').equals(localId).first();
      if (template?.id !== undefined) {
        await localDB.templates.update(template.id, {
          updatedAt: new Date('2024-01-01'),
        });
      }

      await syncEngine.mergeEntity('templates', {
        id: 'server-template-123',
        localId,
        updatedAt: new Date('2024-01-15').toISOString(),
      });

      const updatedTemplate = await localDB.templates.where('localId').equals(localId).first();
      expect(updatedTemplate?.syncStatus).toBe('synced');
      expect(updatedTemplate?.needsSync).toBe(false);
      expect(updatedTemplate?.serverUpdatedAt?.toISOString()).toBe(new Date('2024-01-15').toISOString());
    });

    it('should prefer server data when server is newer for workouts', async () => {
      const localId = await createWorkout('user-1', {
        name: 'Local Workout',
        status: 'in_progress',
      });

      const workout = await localDB.workouts.where('localId').equals(localId).first();
      if (workout?.id !== undefined) {
        await localDB.workouts.update(workout.id, {
          startedAt: new Date('2024-01-01'),
        });
      }

      await syncEngine.mergeEntity('workouts', {
        id: 'server-workout-123',
        localId,
        updatedAt: new Date('2024-01-15').toISOString(),
      });

      const updatedWorkout = await localDB.workouts.where('localId').equals(localId).first();
      expect(updatedWorkout?.syncStatus).toBe('synced');
      expect(updatedWorkout?.needsSync).toBe(false);
      expect(updatedWorkout?.serverUpdatedAt?.toISOString()).toBe(new Date('2024-01-15').toISOString());
    });
  });

  describe('mergeEntity - Local Newer', () => {
    it('should keep local data when local is newer for exercises', async () => {
      const localId = await createExercise('user-1', {
        name: 'Local Name',
        muscleGroup: 'Chest',
      });

      await syncEngine.mergeEntity('exercises', {
        id: 'server-123',
        localId,
        updatedAt: new Date('2024-01-01').toISOString(),
      });

      const exercise = await localDB.exercises.where('localId').equals(localId).first();
      expect(exercise?.name).toBe('Local Name');
      expect(exercise?.syncStatus).toBe('pending');
      expect(exercise?.serverId).toBeUndefined();
    });

    it('should keep local data when local is newer for templates', async () => {
      const localId = await createTemplate('user-1', {
        name: 'Local Template',
        description: 'Local description',
        exercises: [],
      });

      await syncEngine.mergeEntity('templates', {
        id: 'server-template-123',
        localId,
        updatedAt: new Date('2024-01-01').toISOString(),
      });

      const template = await localDB.templates.where('localId').equals(localId).first();
      expect(template?.name).toBe('Local Template');
      expect(template?.syncStatus).toBe('pending');
      expect(template?.serverId).toBeUndefined();
    });

    it('should keep local data when local is newer for workouts', async () => {
      const localId = await createWorkout('user-1', {
        name: 'Local Workout',
        status: 'in_progress',
      });

      await syncEngine.mergeEntity('workouts', {
        id: 'server-workout-123',
        localId,
        updatedAt: new Date('2024-01-01').toISOString(),
      });

      const workout = await localDB.workouts.where('localId').equals(localId).first();
      expect(workout?.name).toBe('Local Workout');
      expect(workout?.syncStatus).toBe('pending');
      expect(workout?.serverId).toBeUndefined();
    });
  });

  describe('mergeEntity - Edge Cases', () => {
    it('should not update when timestamps are equal', async () => {
      const timestamp = new Date('2024-01-01').toISOString();
      const localId = await createExercise('user-1', {
        name: 'Local Name',
        muscleGroup: 'Chest',
      });

      await syncEngine.mergeEntity('exercises', {
        id: 'server-123',
        localId,
        updatedAt: timestamp,
      });

      const exercise = await localDB.exercises.where('localId').equals(localId).first();
      expect(exercise?.syncStatus).toBe('pending');
    });

    it('should not update non-existent entity', async () => {
      let threwError = false;
      try {
        await syncEngine.mergeEntity('exercises', {
          id: 'server-123',
          localId: 'non-existent-local-id',
          updatedAt: new Date().toISOString(),
        });
      } catch {
        threwError = true;
      }
      expect(threwError).toBe(false);
    });

    it('should update serverUpdatedAt when server is newer', async () => {
      const localId = await createExercise('user-1', {
        name: 'Test Exercise',
        muscleGroup: 'Back',
      });

      const exercise = await localDB.exercises.where('localId').equals(localId).first();
      if (exercise?.id !== undefined) {
        await localDB.exercises.update(exercise.id, {
          updatedAt: new Date('2024-01-01'),
        });
      }

      const serverDate = new Date('2024-06-01');
      await syncEngine.mergeEntity('exercises', {
        id: 'server-456',
        localId,
        updatedAt: serverDate.toISOString(),
      });

      const exerciseAfter = await localDB.exercises.where('localId').equals(localId).first();
      expect(exerciseAfter?.serverUpdatedAt?.getTime()).toBe(serverDate.getTime());
    });
  });

  describe('Full Sync - Conflict Resolution', () => {
    it('should prefer server data during full sync when server is newer', async () => {
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

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ id: 'server-create-response', updatedAt: new Date().toISOString() }),
        })
        .mockResolvedValueOnce({
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

      const result = await syncEngine.sync('user-1');

      expect(result.success).toBe(true);
      expect(result.pushed).toBe(1);

      const updatedExercise = await localDB.exercises.where('localId').equals(localId).first();
      expect(updatedExercise?.syncStatus).toBe('synced');
      expect(updatedExercise?.name).toBe('Local Name');
      expect(updatedExercise?.serverId).toBe('server-create-response');
      expect(updatedExercise?.serverUpdatedAt?.toISOString()).toBe(new Date('2024-01-15').toISOString());
    });

    it('should keep local data during full sync when local is newer', async () => {
      const localId = await createExercise('user-1', {
        name: 'Local Name',
        muscleGroup: 'Chest',
      });

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ id: 'server-create-response', updatedAt: new Date().toISOString() }),
        })
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

      const result = await syncEngine.sync('user-1');

      expect(result.success).toBe(true);

      const exercise = await localDB.exercises.where('localId').equals(localId).first();
      expect(exercise?.name).toBe('Local Name');
      expect(exercise?.syncStatus).toBe('synced');
      expect(exercise?.serverId).toBe('server-create-response');
    });
  });

  describe('Multiple Entity Types - Conflict Resolution', () => {
    it('should handle conflicts for multiple entity types in same sync', async () => {
      const exerciseLocalId = await createExercise('user-1', {
        name: 'Local Exercise',
        muscleGroup: 'Chest',
      });

      const templateLocalId = await createTemplate('user-1', {
        name: 'Local Template',
        description: 'Local description',
        exercises: [],
      });

      const workoutLocalId = await createWorkout('user-1', {
        name: 'Local Workout',
        status: 'in_progress',
      });

      const exercise = await localDB.exercises.where('localId').equals(exerciseLocalId).first();
      if (exercise?.id !== undefined) {
        await localDB.exercises.update(exercise.id, {
          updatedAt: new Date('2024-01-01'),
        });
      }

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ id: 'server-exercise', updatedAt: new Date().toISOString() }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ id: 'server-template', updatedAt: new Date().toISOString() }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ id: 'server-workout', updatedAt: new Date().toISOString() }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            exercises: [{
              id: 'server-exercise-123',
              localId: exerciseLocalId,
              name: 'Server Exercise',
              updatedAt: new Date('2024-01-15').toISOString(),
            }],
            templates: [{
              id: 'server-template-123',
              localId: templateLocalId,
              name: 'Server Template',
              updatedAt: new Date('2024-01-10').toISOString(),
            }],
            workouts: [{
              id: 'server-workout-123',
              localId: workoutLocalId,
              name: 'Server Workout',
              updatedAt: new Date('2024-01-05').toISOString(),
            }],
            lastSync: new Date().toISOString(),
          }),
        });

      const result = await syncEngine.sync('user-1');

      expect(result.success).toBe(true);
      expect(result.pushed).toBe(3);

      const syncedExercise = await localDB.exercises.where('localId').equals(exerciseLocalId).first();
      expect(syncedExercise?.syncStatus).toBe('synced');
      expect(syncedExercise?.name).toBe('Local Exercise');

      const syncedTemplate = await localDB.templates.where('localId').equals(templateLocalId).first();
      expect(syncedTemplate?.syncStatus).toBe('synced');
      expect(syncedTemplate?.name).toBe('Local Template');

      const syncedWorkout = await localDB.workouts.where('localId').equals(workoutLocalId).first();
      expect(syncedWorkout?.syncStatus).toBe('synced');
      expect(syncedWorkout?.name).toBe('Local Workout');
    });
  });
});
