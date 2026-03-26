import { describe, expect, it } from 'vitest';
import { createWorkoutSchema, updateWorkoutSchema, updateWorkoutSetSchema, createWorkoutSetSchema, reorderWorkoutExercisesSchema, createWorkoutExerciseSchema } from '../../src/lib/validators/workout.schema';

describe('Workout Validators', () => {
  describe('createWorkoutSchema', () => {
    it('should validate a valid workout', () => {
      const valid = { name: 'Morning Workout' };
      const result = createWorkoutSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should validate with optional fields', () => {
      const valid = {
        name: 'Morning Workout',
        templateId: 'template-123',
        notes: 'Great workout',
        exerciseIds: ['ex-1', 'ex-2'],
        localId: 'local-456',
      };
      const result = createWorkoutSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should reject empty name', () => {
      const invalid = { name: '' };
      const result = createWorkoutSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('updateWorkoutSchema', () => {
    it('should validate empty object', () => {
      const valid = {};
      const result = updateWorkoutSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should validate with 1RM values', () => {
      const valid = { squat1rm: 100, bench1rm: 80 };
      const result = updateWorkoutSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should validate with completedAt', () => {
      const valid = { completedAt: '2024-01-15T10:00:00Z' };
      const result = updateWorkoutSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should validate nullable completedAt', () => {
      const valid = { completedAt: null };
      const result = updateWorkoutSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });
  });

  describe('updateWorkoutSetSchema', () => {
    it('should validate with weight and reps', () => {
      const valid = { weight: 100, reps: 10 };
      const result = updateWorkoutSetSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should validate with isComplete', () => {
      const valid = { isComplete: true };
      const result = updateWorkoutSetSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should reject negative weight', () => {
      const invalid = { weight: -10 };
      const result = updateWorkoutSetSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should reject negative reps', () => {
      const invalid = { reps: -5 };
      const result = updateWorkoutSetSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('createWorkoutSetSchema', () => {
    it('should validate with required fields', () => {
      const valid = { workoutExerciseId: 'we-123', setNumber: 1 };
      const result = createWorkoutSetSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should validate with all fields', () => {
      const valid = {
        workoutExerciseId: 'we-123',
        setNumber: 1,
        weight: 100,
        reps: 10,
        rpe: 8,
        localId: 'local-456',
      };
      const result = createWorkoutSetSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should reject missing workoutExerciseId', () => {
      const invalid = { setNumber: 1 };
      const result = createWorkoutSetSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should reject setNumber < 1', () => {
      const invalid = { workoutExerciseId: 'we-123', setNumber: 0 };
      const result = createWorkoutSetSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('reorderWorkoutExercisesSchema', () => {
    it('should validate with exercise orders', () => {
      const valid = { exerciseOrders: [{ exerciseId: 'ex-1', orderIndex: 0 }] };
      const result = reorderWorkoutExercisesSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should reject empty array', () => {
      const invalid = { exerciseOrders: [] };
      const result = reorderWorkoutExercisesSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('createWorkoutExerciseSchema', () => {
    it('should validate with required fields', () => {
      const valid = { exerciseId: 'ex-123', orderIndex: 0 };
      const result = createWorkoutExerciseSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should validate with optional notes', () => {
      const valid = { exerciseId: 'ex-123', orderIndex: 0, notes: 'Focus on form' };
      const result = createWorkoutExerciseSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should reject negative orderIndex', () => {
      const invalid = { exerciseId: 'ex-123', orderIndex: -1 };
      const result = createWorkoutExerciseSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });
});
