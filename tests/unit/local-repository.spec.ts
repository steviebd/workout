import { describe, expect, it, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { localDB } from '../../src/lib/db/local-db';
import {
  createExercise,
  getExercises,
  getExercise,
  updateExercise,
  deleteExercise,
  createTemplate,
  getTemplates,
  getTemplate,
  updateTemplate,
  deleteTemplate,
  createWorkout,
  getWorkouts,
  getWorkout,
  getActiveWorkout,
  updateWorkout,
  completeWorkout,
  addExerciseToWorkout,
  addSetToWorkoutExercise,
  updateSet,
  deleteSet,
  getPendingOperations,
  removeOperation,
  incrementRetry,
  getLastSyncTime,
  setLastSyncTime,
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
      expect(localId).toMatch(/^[0-9a-f-]{36}$/);

      const exercise = await getExercise(localId);
      expect(exercise).toBeDefined();
      expect(exercise?.name).toBe('Bench Press');
      expect(exercise?.muscleGroup).toBe('Chest');
      expect(exercise?.workosId).toBe('user-1');
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

    it('should return empty array when no exercises exist', async () => {
      const exercises = await getExercises('user-1');
      expect(exercises).toHaveLength(0);
    });
  });

  describe('getExercise', () => {
    it('should return single exercise by localId', async () => {
      const localId = await createExercise('user-1', {
        name: 'Deadlift',
        muscleGroup: 'Back',
      });

      const exercise = await getExercise(localId);
      expect(exercise).toBeDefined();
      expect(exercise?.name).toBe('Deadlift');
    });

    it('should return undefined for non-existent exercise', async () => {
      const exercise = await getExercise('non-existent-id');
      expect(exercise).toBeUndefined();
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
      expect(operations).toHaveLength(1);
      expect(operations[0].type).toBe('create');
      expect(operations[0].data).toEqual(expect.objectContaining({ name: 'Updated Name' }));
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

    it('should throw error for non-existent exercise', async () => {
      await expect(
        deleteExercise('non-existent-id')
      ).rejects.toThrow('Exercise not found');
    });
  });
});

describe('Local Repository - Template Operations', () => {
  beforeEach(async () => {
    await localDB.templates.clear();
    await localDB.offlineQueue.clear();
  });

  describe('createTemplate', () => {
    it('should create template in IndexedDB and return localId', async () => {
      const localId = await createTemplate('user-1', {
        name: 'Push Day',
        description: 'Chest and triceps workout',
        exercises: [
          { exerciseId: 'ex-1', order: 1, sets: 4, reps: 8, weight: 135, restSeconds: 90 },
        ],
      });

      expect(localId).toBeDefined();
      expect(localId).toMatch(/^[0-9a-f-]{36}$/);

      const template = await getTemplate(localId);
      expect(template).toBeDefined();
      expect(template?.name).toBe('Push Day');
      expect(template?.workosId).toBe('user-1');
      expect(template?.syncStatus).toBe('pending');
      expect(template?.needsSync).toBe(true);
      expect(template?.exercises).toHaveLength(1);
    });

    it('should queue a create operation', async () => {
      const localId = await createTemplate('user-1', {
        name: 'Pull Day',
        exercises: [],
      });

      const operations = await getPendingOperations();
      expect(operations).toHaveLength(1);
      expect(operations[0].type).toBe('create');
      expect(operations[0].entity).toBe('template');
      expect(operations[0].localId).toBe(localId);
    });
  });

  describe('getTemplates', () => {
    it('should return only templates for specified user', async () => {
      await createTemplate('user-1', { name: 'Template 1', exercises: [] });
      await createTemplate('user-1', { name: 'Template 2', exercises: [] });
      await createTemplate('user-2', { name: 'Template 3', exercises: [] });

      const user1Templates = await getTemplates('user-1');
      expect(user1Templates).toHaveLength(2);

      const user2Templates = await getTemplates('user-2');
      expect(user2Templates).toHaveLength(1);
    });
  });

  describe('getTemplate', () => {
    it('should return single template by localId', async () => {
      const localId = await createTemplate('user-1', {
        name: 'Leg Day',
        exercises: [],
      });

      const template = await getTemplate(localId);
      expect(template).toBeDefined();
      expect(template?.name).toBe('Leg Day');
    });

    it('should return undefined for non-existent template', async () => {
      const template = await getTemplate('non-existent-id');
      expect(template).toBeUndefined();
    });
  });

  describe('updateTemplate', () => {
    it('should update template and queue update operation', async () => {
      const localId = await createTemplate('user-1', {
        name: 'Original Name',
        exercises: [],
      });

      await updateTemplate(localId, { name: 'Updated Name' });

      const template = await getTemplate(localId);
      expect(template?.name).toBe('Updated Name');
      expect(template?.syncStatus).toBe('pending');

      const operations = await getPendingOperations();
      expect(operations).toHaveLength(1);
      expect(operations[0].type).toBe('create');
      expect(operations[0].data).toEqual(expect.objectContaining({ name: 'Updated Name' }));
    });

    it('should throw error for non-existent template', async () => {
      await expect(
        updateTemplate('non-existent-id', { name: 'Test' })
      ).rejects.toThrow('Template not found');
    });
  });

  describe('deleteTemplate', () => {
    it('should mark template for deletion and queue operation', async () => {
      const localId = await createTemplate('user-1', {
        name: 'To Delete',
        exercises: [],
      });

      await deleteTemplate(localId);

      const operations = await getPendingOperations();
      const deleteOp = operations.find(op => op.type === 'delete');
      expect(deleteOp).toBeDefined();
      expect(deleteOp?.localId).toBe(localId);
    });

    it('should throw error for non-existent template', async () => {
      await expect(
        deleteTemplate('non-existent-id')
      ).rejects.toThrow('Template not found');
    });
  });
});

describe('Local Repository - Workout Operations', () => {
  beforeEach(async () => {
    await localDB.workouts.clear();
    await localDB.workoutExercises.clear();
    await localDB.workoutSets.clear();
    await localDB.offlineQueue.clear();
  });

  describe('createWorkout', () => {
    it('should create workout in IndexedDB and return localId', async () => {
      const localId = await createWorkout('user-1', {
        name: 'Morning Workout',
        status: 'in_progress',
      });

      expect(localId).toBeDefined();
      expect(localId).toMatch(/^[0-9a-f-]{36}$/);

      const workout = await getWorkout(localId);
      expect(workout).toBeDefined();
      expect(workout?.name).toBe('Morning Workout');
      expect(workout?.workosId).toBe('user-1');
      expect(workout?.status).toBe('in_progress');
      expect(workout?.syncStatus).toBe('pending');
      expect(workout?.needsSync).toBe(true);
    });

    it('should queue a create operation', async () => {
      const localId = await createWorkout('user-1', {
        name: 'Quick Workout',
        status: 'in_progress',
      });

      const operations = await getPendingOperations();
      expect(operations).toHaveLength(1);
      expect(operations[0].type).toBe('create');
      expect(operations[0].entity).toBe('workout');
      expect(operations[0].localId).toBe(localId);
    });
  });

  describe('getWorkouts', () => {
    it('should return only workouts for specified user', async () => {
      await createWorkout('user-1', { name: 'Workout 1', status: 'in_progress' });
      await createWorkout('user-1', { name: 'Workout 2', status: 'in_progress' });
      await createWorkout('user-2', { name: 'Workout 3', status: 'in_progress' });

      const user1Workouts = await getWorkouts('user-1');
      expect(user1Workouts).toHaveLength(2);

      const user2Workouts = await getWorkouts('user-2');
      expect(user2Workouts).toHaveLength(1);
    });
  });

  describe('getWorkout', () => {
    it('should return single workout by localId', async () => {
      const localId = await createWorkout('user-1', {
        name: 'Evening Workout',
        status: 'in_progress',
      });

      const workout = await getWorkout(localId);
      expect(workout).toBeDefined();
      expect(workout?.name).toBe('Evening Workout');
    });

    it('should return undefined for non-existent workout', async () => {
      const workout = await getWorkout('non-existent-id');
      expect(workout).toBeUndefined();
    });
  });

  describe('getActiveWorkout', () => {
    it('should return in_progress workout for user', async () => {
      const activeId = await createWorkout('user-1', { name: 'Active Workout', status: 'in_progress' });
      await createWorkout('user-1', { name: 'Completed Workout', status: 'in_progress' });
      await completeWorkout(activeId);

      const activeWorkout = await getActiveWorkout('user-1');
      expect(activeWorkout).toBeDefined();
      expect(activeWorkout?.status).toBe('in_progress');
    });

    it('should return undefined when no active workout', async () => {
      const workoutId = await createWorkout('user-1', { name: 'Workout', status: 'in_progress' });
      await completeWorkout(workoutId);

      const activeWorkout = await getActiveWorkout('user-1');
      expect(activeWorkout).toBeUndefined();
    });
  });

  describe('updateWorkout', () => {
    it('should update workout and queue update operation', async () => {
      const localId = await createWorkout('user-1', {
        name: 'Original Name',
        status: 'in_progress',
      });

      await updateWorkout(localId, { name: 'Updated Name', notes: 'Great workout' });

      const workout = await getWorkout(localId);
      expect(workout?.name).toBe('Updated Name');
      expect(workout?.notes).toBe('Great workout');
      expect(workout?.syncStatus).toBe('pending');

      const operations = await getPendingOperations();
      expect(operations).toHaveLength(1);
      expect(operations[0].type).toBe('create');
      expect(operations[0].data).toEqual(expect.objectContaining({ name: 'Updated Name', notes: 'Great workout' }));
    });

    it('should throw error for non-existent workout', async () => {
      await expect(
        updateWorkout('non-existent-id', { name: 'Test' })
      ).rejects.toThrow('Workout not found');
    });
  });

  describe('completeWorkout', () => {
    it('should complete workout and queue update operation', async () => {
      const localId = await createWorkout('user-1', {
        name: 'Workout to Complete',
        status: 'in_progress',
      });

      await completeWorkout(localId);

      const workout = await getWorkout(localId);
      expect(workout?.status).toBe('completed');
      expect(workout?.completedAt).toBeDefined();
      expect(workout?.syncStatus).toBe('pending');

      const operations = await getPendingOperations();
      expect(operations).toHaveLength(1);
      expect(operations[0].type).toBe('create');
      expect(operations[0].data.status).toBe('completed');
      expect(operations[0].data.completedAt).toBeDefined();
    });

    it('should throw error for non-existent workout', async () => {
      await expect(
        completeWorkout('non-existent-id')
      ).rejects.toThrow('Workout not found');
    });
  });
});

describe('Local Repository - Workout Exercise Operations', () => {
  beforeEach(async () => {
    await localDB.workouts.clear();
    await localDB.workoutExercises.clear();
    await localDB.offlineQueue.clear();
  });

  describe('addExerciseToWorkout', () => {
    it('should add exercise to workout and return localId', async () => {
      const workoutId = await createWorkout('user-1', { name: 'Workout', status: 'in_progress' });

      const workoutExerciseId = await addExerciseToWorkout(workoutId, 'exercise-1', 1);

      expect(workoutExerciseId).toBeDefined();
      expect(workoutExerciseId).toMatch(/^[0-9a-f-]{36}$/);

      const workoutExercise = await localDB.workoutExercises.where('localId').equals(workoutExerciseId).first();
      expect(workoutExercise).toBeDefined();
      expect(workoutExercise?.workoutId).toBe(workoutId);
      expect(workoutExercise?.exerciseId).toBe('exercise-1');
      expect(workoutExercise?.order).toBe(1);
      expect(workoutExercise?.syncStatus).toBe('pending');
    });

    it('should queue a create operation', async () => {
      const workoutId = await createWorkout('user-1', { name: 'Workout', status: 'in_progress' });
      const workoutExerciseId = await addExerciseToWorkout(workoutId, 'exercise-1', 1);

      const operations = await getPendingOperations();
      const createOp = operations.find(op => op.type === 'create' && op.entity === 'workout_exercise');
      expect(createOp).toBeDefined();
      expect(createOp?.localId).toBe(workoutExerciseId);
    });

    it('should create workout exercise even with non-existent workoutId', async () => {
      const workoutExerciseId = await addExerciseToWorkout('non-existent-id', 'exercise-1', 1);

      expect(workoutExerciseId).toBeDefined();
      expect(workoutExerciseId).toMatch(/^[0-9a-f-]{36}$/);

      const workoutExercise = await localDB.workoutExercises.where('localId').equals(workoutExerciseId).first();
      expect(workoutExercise).toBeDefined();
      expect(workoutExercise?.workoutId).toBe('non-existent-id');
    });
  });
});

describe('Local Repository - Workout Set Operations', () => {
  beforeEach(async () => {
    await localDB.workoutExercises.clear();
    await localDB.workoutSets.clear();
    await localDB.offlineQueue.clear();
  });

  describe('addSetToWorkoutExercise', () => {
    it('should add set to workout exercise and return localId', async () => {
      const workoutExerciseId = await addSetToWorkoutExercise('workout-exercise-1', {
        order: 1,
        weight: 135,
        reps: 8,
        rpe: 7,
        completed: true,
        setNumber: 1,
      });

      expect(workoutExerciseId).toBeDefined();
      expect(workoutExerciseId).toMatch(/^[0-9a-f-]{36}$/);

      const workoutSet = await localDB.workoutSets.where('localId').equals(workoutExerciseId).first();
      expect(workoutSet).toBeDefined();
      expect(workoutSet?.weight).toBe(135);
      expect(workoutSet?.reps).toBe(8);
      expect(workoutSet?.rpe).toBe(7);
      expect(workoutSet?.completed).toBe(true);
      expect(workoutSet?.syncStatus).toBe('pending');
    });

    it('should queue a create operation', async () => {
      const workoutSetId = await addSetToWorkoutExercise('workout-exercise-1', {
        order: 1,
        weight: 100,
        reps: 5,
        completed: true,
        setNumber: 1,
      });

      const operations = await getPendingOperations();
      const createOp = operations.find(op => op.type === 'create' && op.entity === 'workout_set');
      expect(createOp).toBeDefined();
      expect(createOp?.localId).toBe(workoutSetId);
    });
  });

  describe('updateSet', () => {
    it('should update set and queue update operation', async () => {
      const setId = await addSetToWorkoutExercise('workout-exercise-1', {
        order: 1,
        weight: 100,
        reps: 5,
        completed: false,
        setNumber: 1,
      });

      await updateSet(setId, { weight: 110, completed: true });

      const workoutSet = await localDB.workoutSets.where('localId').equals(setId).first();
      expect(workoutSet?.weight).toBe(110);
      expect(workoutSet?.completed).toBe(true);
      expect(workoutSet?.syncStatus).toBe('pending');

      const operations = await getPendingOperations();
      expect(operations).toHaveLength(1);
      expect(operations[0].type).toBe('create');
      expect(operations[0].data).toEqual(expect.objectContaining({ weight: 110, completed: true }));
    });

    it('should throw error for non-existent set', async () => {
      await expect(
        updateSet('non-existent-id', { weight: 100 })
      ).rejects.toThrow('Set not found');
    });
  });

  describe('deleteSet', () => {
    it('should mark set for deletion and queue operation', async () => {
      const setId = await addSetToWorkoutExercise('workout-exercise-1', {
        order: 1,
        weight: 100,
        reps: 5,
        completed: true,
        setNumber: 1,
      });

      await deleteSet(setId);

      const operations = await getPendingOperations();
      const deleteOp = operations.find(op => op.type === 'delete');
      expect(deleteOp).toBeDefined();
      expect(deleteOp?.localId).toBe(setId);
    });

    it('should throw error for non-existent set', async () => {
      await expect(
        deleteSet('non-existent-id')
      ).rejects.toThrow('Set not found');
    });
  });
});

describe('Local Repository - Offline Queue Operations', () => {
  beforeEach(async () => {
    await localDB.exercises.clear();
    await localDB.offlineQueue.clear();
  });

  describe('getPendingOperations', () => {
    it('should return operations ordered by timestamp', async () => {
      await createExercise('user-1', { name: 'Exercise 1', muscleGroup: 'Chest' });
      await new Promise<void>(resolve => { setTimeout(resolve, 10); });
      await createExercise('user-1', { name: 'Exercise 2', muscleGroup: 'Back' });
      await new Promise<void>(resolve => { setTimeout(resolve, 10); });
      await createExercise('user-1', { name: 'Exercise 3', muscleGroup: 'Legs' });

      const ops = await getPendingOperations();
      expect(ops).toHaveLength(3);
      expect(ops[0].localId).not.toBe(ops[1].localId);
      expect(ops[1].localId).not.toBe(ops[2].localId);
    });
  });

  describe('removeOperation', () => {
    it('should remove operation from queue', async () => {
      await createExercise('user-1', { name: 'Exercise', muscleGroup: 'Chest' });
      const ops = await getPendingOperations();
      expect(ops).toHaveLength(1);

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      await removeOperation(ops[0].id!);

      const remainingOps = await getPendingOperations();
      expect(remainingOps).toHaveLength(0);
    });

    it('should remove specific operation when multiple exist', async () => {
      await createExercise('user-1', { name: 'Exercise 1', muscleGroup: 'Chest' });
      await new Promise<void>(resolve => { setTimeout(resolve, 10); });
      const id2 = await createExercise('user-1', { name: 'Exercise 2', muscleGroup: 'Back' });

      const ops = await getPendingOperations();
      expect(ops).toHaveLength(2);

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      await removeOperation(ops[0].id!);

      const remainingOps = await getPendingOperations();
      expect(remainingOps).toHaveLength(1);
      expect(remainingOps[0].localId).toBe(id2);
    });
  });

  describe('incrementRetry', () => {
    it('should increment retryCount', async () => {
      await createExercise('user-1', { name: 'Exercise', muscleGroup: 'Chest' });
      const ops = await getPendingOperations();
      expect(ops[0].retryCount).toBe(0);

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      await incrementRetry(ops[0].id!);

      const updatedOps = await getPendingOperations();
      expect(updatedOps[0].retryCount).toBe(1);
    });

    it('should increment multiple times', async () => {
      await createExercise('user-1', { name: 'Exercise', muscleGroup: 'Chest' });
      const ops = await getPendingOperations();

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      await incrementRetry(ops[0].id!);
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      await incrementRetry(ops[0].id!);
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      await incrementRetry(ops[0].id!);

      const updatedOps = await getPendingOperations();
      expect(updatedOps[0].retryCount).toBe(3);
    });

    it('should not fail for non-existent operation', async () => {
      await expect(incrementRetry(99999)).resolves.not.toThrow();
    });
  });
});

describe('Local Repository - Sync Metadata Operations', () => {
  beforeEach(async () => {
    await localDB.syncMetadata.clear();
  });

  describe('getLastSyncTime', () => {
    it('should return null when no sync time exists', async () => {
      const result = await getLastSyncTime('test-key');
      expect(result).toBeNull();
    });

    it('should return stored sync time', async () => {
      await setLastSyncTime('test-key', '2024-01-15T10:00:00.000Z');

      const result = await getLastSyncTime('test-key');
      expect(result).toBe('2024-01-15T10:00:00.000Z');
    });

    it('should return null for non-existent key', async () => {
      await setLastSyncTime('key1', '2024-01-15T10:00:00.000Z');

      const result = await getLastSyncTime('key2');
      expect(result).toBeNull();
    });
  });

  describe('setLastSyncTime', () => {
    it('should store sync time in metadata', async () => {
      await setLastSyncTime('exercises', '2024-01-15T10:00:00.000Z');

      const result = await getLastSyncTime('exercises');
      expect(result).toBe('2024-01-15T10:00:00.000Z');
    });

    it('should update existing sync time', async () => {
      await setLastSyncTime('workouts', '2024-01-15T10:00:00.000Z');
      await setLastSyncTime('workouts', '2024-01-16T10:00:00.000Z');

      const result = await getLastSyncTime('workouts');
      expect(result).toBe('2024-01-16T10:00:00.000Z');
    });
  });
});

describe('Local Repository - Complete Workflow', () => {
  beforeEach(async () => {
    await localDB.exercises.clear();
    await localDB.workouts.clear();
    await localDB.workoutExercises.clear();
    await localDB.workoutSets.clear();
    await localDB.offlineQueue.clear();
    await localDB.syncMetadata.clear();
  });

  it('should create workout with exercises and sets', async () => {
    const exerciseId = await createExercise('user-1', {
      name: 'Bench Press',
      muscleGroup: 'Chest',
    });

    const workoutId = await createWorkout('user-1', {
      name: 'Push Day',
      status: 'in_progress',
    });

    const workoutExerciseId = await addExerciseToWorkout(workoutId, exerciseId, 1);

    await addSetToWorkoutExercise(workoutExerciseId, {
      order: 1,
      weight: 135,
      reps: 8,
      completed: true,
      setNumber: 1,
    });

    const operations = await getPendingOperations();
    expect(operations.length).toBeGreaterThanOrEqual(4);

    const exercise = await getExercise(exerciseId);
    expect(exercise).toBeDefined();
    expect(exercise?.name).toBe('Bench Press');

    const workout = await getWorkout(workoutId);
    expect(workout).toBeDefined();
    expect(workout?.name).toBe('Push Day');
    expect(workout?.status).toBe('in_progress');
  });

  it('should handle update and delete operations correctly', async () => {
    const exerciseId = await createExercise('user-1', {
      name: 'Squat',
      muscleGroup: 'Legs',
    });

    let operations = await getPendingOperations();
    expect(operations.filter(op => op.type === 'create')).toHaveLength(1);

    await updateExercise(exerciseId, { name: 'Front Squat' });
    operations = await getPendingOperations();
    expect(operations).toHaveLength(1);
    expect(operations[0].type).toBe('create');
    expect(operations[0].data.name).toBe('Front Squat');

    await deleteExercise(exerciseId);
    operations = await getPendingOperations();
    expect(operations.filter(op => op.type === 'delete')).toHaveLength(1);

    const exercise = await getExercise(exerciseId);
    expect(exercise).toBeDefined();
    expect(exercise?.syncStatus).toBe('pending');
  });

  it('should complete workout with all data synced', async () => {
    await createExercise('user-1', {
      name: 'Deadlift',
      muscleGroup: 'Back',
    });

    const workoutId = await createWorkout('user-1', {
      name: 'Pull Day',
      status: 'in_progress',
    });

    await completeWorkout(workoutId);

    const workout = await getWorkout(workoutId);
    expect(workout?.status).toBe('completed');
    expect(workout?.completedAt).toBeDefined();

    const operations = await getPendingOperations();
    expect(operations).toHaveLength(2);

    const exerciseOp = operations.find(op => op.entity === 'exercise' && op.type === 'create');
    expect(exerciseOp).toBeDefined();

    const workoutOp = operations.find(op => op.entity === 'workout' && op.type === 'create');
    expect(workoutOp).toBeDefined();
    expect(workoutOp?.data.status).toBe('completed');
    expect(workoutOp?.data.completedAt).toBeDefined();
  });
});
