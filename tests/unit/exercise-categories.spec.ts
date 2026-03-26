import { describe, expect, it } from 'vitest';
import { isSquat, isBench, isDeadlift, isOverheadPress } from '../../src/lib/db/exercise/categories';

describe('Exercise Categories', () => {
  describe('isSquat', () => {
    it('should identify squat exercises', () => {
      expect(isSquat('Squat')).toBe(true);
      expect(isSquat('Front Squat')).toBe(true);
      expect(isSquat('Back Squat')).toBe(true);
      expect(isSquat('Pause Squat')).toBe(true);
    });

    it('should not identify goblet squat as squat', () => {
      expect(isSquat('Goblet Squat')).toBe(false);
    });

    it('should be case insensitive', () => {
      expect(isSquat('SQUAT')).toBe(true);
      expect(isSquat('squat')).toBe(true);
    });
  });

  describe('isBench', () => {
    it('should identify bench press exercises', () => {
      expect(isBench('Bench Press')).toBe(true);
      expect(isBench('Bench')).toBe(true);
      expect(isBench('Incline Bench Press')).toBe(true);
      expect(isBench('Close Grip Bench')).toBe(true);
    });

    it('should be case insensitive', () => {
      expect(isBench('BENCH PRESS')).toBe(true);
      expect(isBench('bench press')).toBe(true);
    });
  });

  describe('isDeadlift', () => {
    it('should identify deadlift exercises', () => {
      expect(isDeadlift('Deadlift')).toBe(true);
      expect(isDeadlift('Romanian Deadlift')).toBe(true);
      expect(isDeadlift('Sumo Deadlift')).toBe(true);
    });

    it('should be case insensitive', () => {
      expect(isDeadlift('DEADLIFT')).toBe(true);
      expect(isDeadlift('deadlift')).toBe(true);
    });
  });

  describe('isOverheadPress', () => {
    it('should identify overhead press exercises', () => {
      expect(isOverheadPress('OHP')).toBe(true);
      expect(isOverheadPress('Overhead Press')).toBe(true);
      expect(isOverheadPress('Over Head Press')).toBe(true);
    });

    it('should be case insensitive', () => {
      expect(isOverheadPress('OVERHEAD PRESS')).toBe(true);
      expect(isOverheadPress('overhead press')).toBe(true);
    });
  });
});
