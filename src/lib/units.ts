export type WeightUnit = 'lbs' | 'kg';

export function convertWeight(value: number, from: WeightUnit, to: WeightUnit): number {
  if (from === to) return value;
  if (from === 'lbs' && to === 'kg') return value * 0.453592;
  if (from === 'kg' && to === 'lbs') return value * 2.20462;
  return value;
}
