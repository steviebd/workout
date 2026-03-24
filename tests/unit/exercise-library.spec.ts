import { describe, expect, it } from 'vitest';
import { exerciseLibrary, type ExerciseLibraryItem } from '../../src/lib/db/exercise/library';

describe('Exercise Library', () => {
  it('should have exercises', () => {
    expect(exerciseLibrary.length).toBeGreaterThan(0);
  });

  it('should have unique IDs', () => {
    const ids = exerciseLibrary.map(e => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('should have required fields for each exercise', () => {
    exerciseLibrary.forEach((exercise: ExerciseLibraryItem) => {
      expect(exercise).toHaveProperty('id');
      expect(exercise).toHaveProperty('name');
      expect(exercise).toHaveProperty('muscleGroup');
      expect(exercise).toHaveProperty('description');
      expect(typeof exercise.name).toBe('string');
      expect(typeof exercise.muscleGroup).toBe('string');
      expect(typeof exercise.description).toBe('string');
    });
  });

  it('should have valid muscle groups', () => {
    const validMuscleGroups = ['Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps', 'Forearms', 'Quadriceps', 'Hamstrings', 'Glutes', 'Calves', 'Core'];
    exerciseLibrary.forEach((exercise: ExerciseLibraryItem) => {
      expect(validMuscleGroups).toContain(exercise.muscleGroup);
    });
  });

  it('should have Bench Press', () => {
    const benchPress = exerciseLibrary.find(e => e.id === 'barbell-bench-press');
    expect(benchPress).toBeDefined();
    expect(benchPress?.name).toBe('Bench Press');
  });

  it('should have Squat', () => {
    const squat = exerciseLibrary.find(e => e.name.toLowerCase().includes('squat'));
    expect(squat).toBeDefined();
  });

  it('should have Deadlift', () => {
    const deadlift = exerciseLibrary.find(e => e.name.toLowerCase().includes('deadlift'));
    expect(deadlift).toBeDefined();
  });

  it('should have Overhead Press', () => {
    const ohp = exerciseLibrary.find(e => e.name.toLowerCase().includes('overhead press'));
    expect(ohp).toBeDefined();
  });
});
