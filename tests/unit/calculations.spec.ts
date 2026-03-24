import { describe, expect, it } from 'vitest';
import { calculateE1RM, calculateVolume, calculateSetVolume, isPR, calculatePRImprovement, getCurrentMaxFromHistory } from '../../src/lib/domain/stats/calculations';

describe('Stats Calculations', () => {
  describe('calculateE1RM', () => {
    it('should return weight when reps is 1', () => {
      expect(calculateE1RM(100, 1)).toBe(100);
    });

    it('should calculate E1RM using formula for reps > 1', () => {
      // E1RM = weight * (1 + reps / 30)
      // 100 * (1 + 5/30) = 100 * 1.1666... = 116.67 -> 117
      expect(calculateE1RM(100, 5)).toBe(117);
    });

    it('should round to nearest integer', () => {
      expect(calculateE1RM(100, 10)).toBe(133);
    });

    it('should handle zero weight', () => {
      expect(calculateE1RM(0, 5)).toBe(0);
    });
  });

  describe('calculateVolume', () => {
    it('should calculate volume as weight * reps', () => {
      expect(calculateVolume(100, 10)).toBe(1000);
    });

    it('should handle zero weight', () => {
      expect(calculateVolume(0, 10)).toBe(0);
    });

    it('should handle zero reps', () => {
      expect(calculateVolume(100, 0)).toBe(0);
    });
  });

  describe('calculateSetVolume', () => {
    it('should return object with weight, reps, and volume', () => {
      const result = calculateSetVolume(100, 10);
      expect(result.weight).toBe(100);
      expect(result.reps).toBe(10);
      expect(result.volume).toBe(1000);
    });
  });

  describe('isPR', () => {
    it('should return true when current > previous', () => {
      expect(isPR(110, 100)).toBe(true);
    });

    it('should return false when current <= previous', () => {
      expect(isPR(100, 100)).toBe(false);
      expect(isPR(90, 100)).toBe(false);
    });
  });

  describe('calculatePRImprovement', () => {
    it('should calculate percentage improvement', () => {
      // (110 - 100) / 100 * 100 = 10%
      expect(calculatePRImprovement(110, 100)).toBe(10);
    });

    it('should return 0 when previous is 0', () => {
      expect(calculatePRImprovement(100, 0)).toBe(0);
    });

    it('should handle decrease in weight', () => {
      // (90 - 100) / 100 * 100 = -10%
      expect(calculatePRImprovement(90, 100)).toBe(-10);
    });

    it('should round to nearest integer', () => {
      // (105 - 100) / 100 * 100 = 5%
      expect(calculatePRImprovement(105, 100)).toBe(5);
    });
  });

  describe('getCurrentMaxFromHistory', () => {
    it('should return highest maxWeight from history', () => {
      const history = [
        { maxWeight: 100 },
        { maxWeight: 120 },
        { maxWeight: 110 },
      ];
      expect(getCurrentMaxFromHistory(history)).toBe(120);
    });

    it('should return 0 for empty history', () => {
      expect(getCurrentMaxFromHistory([])).toBe(0);
    });

    it('should handle single item', () => {
      expect(getCurrentMaxFromHistory([{ maxWeight: 100 }])).toBe(100);
    });
  });
});
