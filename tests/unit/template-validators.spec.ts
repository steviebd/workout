import { describe, expect, it } from 'vitest';
import { createTemplateSchema, updateTemplateSchema, addExerciseToTemplateSchema, reorderTemplateExercisesSchema, createProgramCycleSchema, updatePreferencesSchema } from '../../src/lib/validators/template.schema';

describe('Template Validators', () => {
  describe('createTemplateSchema', () => {
    it('should validate a valid template', () => {
      const valid = { name: 'My Template' };
      const result = createTemplateSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should validate with all optional fields', () => {
      const valid = {
        name: 'My Template',
        description: 'A description',
        notes: 'Some notes',
        localId: 'local-123',
        programCycleId: 'cycle-456',
      };
      const result = createTemplateSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should reject empty name', () => {
      const invalid = { name: '' };
      const result = createTemplateSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should reject name that is too long', () => {
      const invalid = { name: 'a'.repeat(201) };
      const result = createTemplateSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('updateTemplateSchema', () => {
    it('should validate empty object', () => {
      const valid = {};
      const result = updateTemplateSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should validate partial update', () => {
      const valid = { name: 'New Name' };
      const result = updateTemplateSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });
  });

  describe('addExerciseToTemplateSchema', () => {
    it('should validate with required fields', () => {
      const valid = { exerciseId: 'ex-123' };
      const result = addExerciseToTemplateSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should validate with optional fields', () => {
      const valid = { exerciseId: 'ex-123', orderIndex: 0, localId: 'local-456' };
      const result = addExerciseToTemplateSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should reject missing exerciseId', () => {
      const invalid = {};
      const result = addExerciseToTemplateSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('reorderTemplateExercisesSchema', () => {
    it('should validate with exercise orders', () => {
      const valid = { exerciseOrders: [{ exerciseId: 'ex-1', orderIndex: 0 }, { exerciseId: 'ex-2', orderIndex: 1 }] };
      const result = reorderTemplateExercisesSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should reject empty array', () => {
      const invalid = { exerciseOrders: [] };
      const result = reorderTemplateExercisesSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('createProgramCycleSchema', () => {
    it('should validate with required fields', () => {
      const valid = {
        programSlug: 'stronglifts-5x5',
        squat1rm: 100,
        bench1rm: 80,
        deadlift1rm: 120,
        ohp1rm: 60,
        preferredGymDays: ['Mon', 'Wed', 'Fri'],
        programStartDate: '2024-01-01',
        firstSessionDate: '2024-01-02',
      };
      const result = createProgramCycleSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should reject missing required fields', () => {
      const invalid = { programSlug: 'stronglifts-5x5' };
      const result = createProgramCycleSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should reject negative 1RM values', () => {
      const invalid = {
        programSlug: 'stronglifts-5x5',
        squat1rm: -10,
        bench1rm: 80,
        deadlift1rm: 120,
        ohp1rm: 60,
        preferredGymDays: ['Mon'],
        programStartDate: '2024-01-01',
        firstSessionDate: '2024-01-02',
      };
      const result = createProgramCycleSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should reject empty preferredGymDays', () => {
      const invalid = {
        programSlug: 'stronglifts-5x5',
        squat1rm: 100,
        bench1rm: 80,
        deadlift1rm: 120,
        ohp1rm: 60,
        preferredGymDays: [],
        programStartDate: '2024-01-01',
        firstSessionDate: '2024-01-02',
      };
      const result = createProgramCycleSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('updatePreferencesSchema', () => {
    it('should validate with weightUnit', () => {
      const valid = { weightUnit: 'kg' };
      const result = updatePreferencesSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should validate with theme', () => {
      const valid = { theme: 'dark' };
      const result = updatePreferencesSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should validate with weeklyWorkoutTarget', () => {
      const valid = { weeklyWorkoutTarget: 4 };
      const result = updatePreferencesSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should reject invalid weightUnit', () => {
      const invalid = { weightUnit: 'stones' };
      const result = updatePreferencesSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should reject weeklyWorkoutTarget > 7', () => {
      const invalid = { weeklyWorkoutTarget: 8 };
      const result = updatePreferencesSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });
});
