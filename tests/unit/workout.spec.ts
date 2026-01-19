import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createDb } from '../../src/lib/db/index';
import type { D1Database } from '@cloudflare/workers-types';
import type { Workout, WorkoutSet, UserPreference } from '../../src/lib/db/schema';

vi.mock('../../src/lib/db/index', () => ({
  createDb: vi.fn(),
}));

const mockDb = vi.fn() as unknown as D1Database;

const mockDrizzleDb = {
  insert: vi.fn(),
  update: vi.fn(),
  select: vi.fn(),
  delete: vi.fn(),
};

const mockWorkoutData: Workout = {
  id: 'workout-1',
  userId: 'user-1',
  templateId: 'template-1',
  name: 'Upper Body Workout',
  startedAt: '2024-01-01T10:00:00.000Z',
  completedAt: null,
  notes: 'Great workout',
  createdAt: '2024-01-01T10:00:00.000Z',
};

const mockWorkoutSetData: WorkoutSet = {
  id: 'workout-set-1',
  workoutExerciseId: 'workout-exercise-1',
  setNumber: 1,
  weight: 80,
  reps: 8,
  rpe: 7.5,
  isComplete: true,
  completedAt: '2024-01-01T10:05:00.000Z',
  createdAt: '2024-01-01T10:05:00.000Z',
};

const mockUserPreferenceData: UserPreference = {
  id: 'prefs-1',
  userId: 'user-1',
  weightUnit: 'kg',
  theme: 'light',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

describe('Workout CRUD Operations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
    vi.mocked(createDb).mockReturnValue(mockDrizzleDb as any);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('createWorkout', () => {
    it('creates workout with all fields', async () => {
      mockDrizzleDb.insert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockReturnValue({
            get: vi.fn().mockReturnValue(mockWorkoutData),
          }),
        }),
      });

      const { createWorkout } = await import('../../src/lib/db/workout');

      const result = await createWorkout(mockDb, {
        userId: 'user-1',
        name: 'Upper Body Workout',
        templateId: 'template-1',
        notes: 'Great workout',
      });

      expect(result.id).toBe('workout-1');
      expect(result.userId).toBe('user-1');
      expect(result.name).toBe('Upper Body Workout');
      expect(result.templateId).toBe('template-1');
      expect(result.notes).toBe('Great workout');
      expect(result.startedAt).toBeDefined();
    });

    it('creates workout without template', async () => {
      const workoutWithoutTemplate = { ...mockWorkoutData, templateId: null };

      mockDrizzleDb.insert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockReturnValue({
            get: vi.fn().mockReturnValue(workoutWithoutTemplate),
          }),
        }),
      });

      const { createWorkout } = await import('../../src/lib/db/workout');

      const result = await createWorkout(mockDb, {
        userId: 'user-1',
        name: 'Quick Workout',
      });

      expect(result.id).toBe('workout-1');
      expect(result.templateId).toBeNull();
    });
  });

  describe('getWorkoutById', () => {
    it('returns workout when owned by user', async () => {
      mockDrizzleDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            get: vi.fn().mockReturnValue(mockWorkoutData),
          }),
        }),
      });

      const { getWorkoutById } = await import('../../src/lib/db/workout');

      const result = await getWorkoutById(mockDb, 'workout-1', 'user-1');

      expect(result?.id).toBe('workout-1');
      expect(result?.name).toBe('Upper Body Workout');
    });

    it('returns null when not owned by user', async () => {
      mockDrizzleDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            get: vi.fn().mockReturnValue(null),
          }),
        }),
      });

      const { getWorkoutById } = await import('../../src/lib/db/workout');

      const result = await getWorkoutById(mockDb, 'workout-1', 'user-2');

      expect(result).toBeNull();
    });
  });

  describe('completeWorkout', () => {
    it('completes workout with timestamp', async () => {
      const completedWorkout = { ...mockWorkoutData, completedAt: '2024-01-01T11:00:00.000Z' };

      mockDrizzleDb.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockReturnValue({
              get: vi.fn().mockReturnValue(completedWorkout),
            }),
          }),
        }),
      });

      const { completeWorkout } = await import('../../src/lib/db/workout');

      const result = await completeWorkout(mockDb, 'workout-1', 'user-1');

      expect(result?.completedAt).toBe('2024-01-01T11:00:00.000Z');
    });
  });

  describe('deleteWorkout', () => {
    it('deletes workout successfully', async () => {
      mockDrizzleDb.delete.mockReturnValue({
        where: vi.fn().mockReturnValue({
          run: vi.fn().mockReturnValue({ success: true }),
        }),
      });

      const { deleteWorkout } = await import('../../src/lib/db/workout');

      const result = await deleteWorkout(mockDb, 'workout-1', 'user-1');

      expect(result).toBe(true);
    });
  });

  describe('createWorkoutSet', () => {
    it('creates workout set with all fields', async () => {
      const expectedSet = { ...mockWorkoutSetData, isComplete: false };

      mockDrizzleDb.insert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockReturnValue({
            get: vi.fn().mockReturnValue(expectedSet),
          }),
        }),
      });

      const { createWorkoutSet } = await import('../../src/lib/db/workout');

      const result = await createWorkoutSet(mockDb, 'workout-exercise-1', 1, 80, 8, 7.5);

      expect(result.id).toBe('workout-set-1');
      expect(result.workoutExerciseId).toBe('workout-exercise-1');
      expect(result.setNumber).toBe(1);
      expect(result.weight).toBe(80);
      expect(result.reps).toBe(8);
      expect(result.rpe).toBe(7.5);
      expect(result.isComplete).toBe(false);
    });
  });

  describe('completeWorkoutSet', () => {
    it('marks set as complete', async () => {
      const completedSet = { ...mockWorkoutSetData, isComplete: true, completedAt: '2024-01-01T10:05:00.000Z' };

      mockDrizzleDb.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockReturnValue({
              get: vi.fn().mockReturnValue(completedSet),
            }),
          }),
        }),
      });

      const { completeWorkoutSet } = await import('../../src/lib/db/workout');

      const result = await completeWorkoutSet(mockDb, 'workout-set-1');

      expect(result?.isComplete).toBe(true);
      expect(result?.completedAt).toBeDefined();
    });
  });
});

describe('User Preferences Operations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
    vi.mocked(createDb).mockReturnValue(mockDrizzleDb as any);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('getUserPreferences', () => {
    it('returns preferences when user has them', async () => {
      mockDrizzleDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            get: vi.fn().mockReturnValue(mockUserPreferenceData),
          }),
        }),
      });

      const { getUserPreferences } = await import('../../src/lib/db/preferences');

      const result = await getUserPreferences(mockDb, 'user-1');

      expect(result?.userId).toBe('user-1');
      expect(result?.weightUnit).toBe('kg');
      expect(result?.theme).toBe('light');
    });

    it('returns null when user has no preferences', async () => {
      mockDrizzleDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            get: vi.fn().mockReturnValue(null),
          }),
        }),
      });

      const { getUserPreferences } = await import('../../src/lib/db/preferences');

      const result = await getUserPreferences(mockDb, 'user-1');

      expect(result).toBeNull();
    });
  });

  describe('upsertUserPreferences', () => {
    it('creates new preferences when none exist', async () => {
      mockDrizzleDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            get: vi.fn().mockReturnValue(null),
          }),
        }),
      });

      mockDrizzleDb.insert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockReturnValue({
            get: vi.fn().mockReturnValue(mockUserPreferenceData),
          }),
        }),
      });

      const { upsertUserPreferences } = await import('../../src/lib/db/preferences');

      const result = await upsertUserPreferences(mockDb, 'user-1', {
        weightUnit: 'lbs',
        theme: 'dark',
      });

      expect(result.userId).toBe('user-1');
      expect(result.weightUnit).toBe('kg');
    });

    it('updates existing preferences', async () => {
      const updatedPrefs = { ...mockUserPreferenceData, weightUnit: 'lbs' };

      mockDrizzleDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            get: vi.fn().mockReturnValue(mockUserPreferenceData),
          }),
        }),
      });

      mockDrizzleDb.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockReturnValue({
              get: vi.fn().mockReturnValue(updatedPrefs),
            }),
          }),
        }),
      });

      const { upsertUserPreferences } = await import('../../src/lib/db/preferences');

      const result = await upsertUserPreferences(mockDb, 'user-1', {
        weightUnit: 'lbs',
      });

      expect(result.weightUnit).toBe('lbs');
    });
  });
});
