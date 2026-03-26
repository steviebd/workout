import { describe, expect, it } from 'vitest';
import { createExerciseSchema, updateExerciseSchema, copyExerciseFromLibrarySchema } from '../../src/lib/validators/exercise.schema';

describe('Exercise Validators', () => {
  describe('createExerciseSchema', () => {
    it('should validate a valid exercise', () => {
      const valid = { name: 'Bench Press' };
      const result = createExerciseSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should validate with optional fields', () => {
      const valid = {
        name: 'Bench Press',
        muscleGroup: 'Chest',
        description: 'A classic chest exercise',
        localId: 'local-123',
        libraryId: 'lib-456',
      };
      const result = createExerciseSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should reject empty name', () => {
      const invalid = { name: '' };
      const result = createExerciseSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should reject name that is too long', () => {
      const invalid = { name: 'a'.repeat(201) };
      const result = createExerciseSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should trim whitespace from name', () => {
      const input = { name: '  Bench Press  ' };
      const result = createExerciseSchema.safeParse(input);
      if (result.success) {
        expect(result.data.name).toBe('Bench Press');
      }
    });
  });

  describe('updateExerciseSchema', () => {
    it('should validate empty object (all fields optional)', () => {
      const valid = {};
      const result = updateExerciseSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should validate with partial update', () => {
      const valid = { name: 'New Name' };
      const result = updateExerciseSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should reject invalid muscleGroup length', () => {
      const invalid = { muscleGroup: 'a'.repeat(51) };
      const result = updateExerciseSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('copyExerciseFromLibrarySchema', () => {
    it('should validate required fields', () => {
      const valid = {
        name: 'Bench Press',
        muscleGroup: 'Chest',
      };
      const result = copyExerciseFromLibrarySchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should validate with optional description', () => {
      const valid = {
        name: 'Bench Press',
        muscleGroup: 'Chest',
        description: 'A great exercise',
      };
      const result = copyExerciseFromLibrarySchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should reject missing name', () => {
      const invalid = { muscleGroup: 'Chest' };
      const result = copyExerciseFromLibrarySchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should reject missing muscleGroup', () => {
      const invalid = { name: 'Bench Press' };
      const result = copyExerciseFromLibrarySchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });
});
