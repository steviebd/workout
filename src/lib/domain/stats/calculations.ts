import type { SetVolume } from './types';

export function calculateE1RM(weight: number, reps: number): number {
  if (reps === 1) return weight;
  return Math.round(weight * (1 + reps / 30));
}

export function calculateVolume(weight: number, reps: number): number {
  return weight * reps;
}

export function calculateSetVolume(weight: number, reps: number): SetVolume {
  const volume = calculateVolume(weight, reps);
  return { weight, reps, volume };
}

export function isPR(
  currentWeight: number,
  previousMaxWeight: number
): boolean {
  return currentWeight > previousMaxWeight;
}

export function calculatePRImprovement(
  currentWeight: number,
  previousWeight: number
): number {
  if (previousWeight === 0) return 0;
  return Math.round(((currentWeight - previousWeight) / previousWeight) * 100);
}

export function getCurrentMaxFromHistory(
  history: Array<{ maxWeight: number }>
): number {
  let currentMax = 0;
  for (const item of history) {
    if (item.maxWeight > currentMax) {
      currentMax = item.maxWeight;
    }
  }
  return currentMax;
}
