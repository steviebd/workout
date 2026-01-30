export const KG_TO_LBS = 2.20462;

export type WeightUnit = 'kg' | 'lbs';

export function kgToLbs(kg: number): number {
  return kg * KG_TO_LBS;
}

export function lbsToKg(lbs: number): number {
  return lbs / KG_TO_LBS;
}

export function convertWeight(weight: number, fromUnit: WeightUnit, toUnit: WeightUnit): number {
  if (fromUnit === toUnit) return weight;
  if (fromUnit === 'kg' && toUnit === 'lbs') {
    return kgToLbs(weight);
  }
  return lbsToKg(weight);
}

export function formatWeight(weight: number, unit: WeightUnit): string {
  const converted = unit === 'lbs' ? kgToLbs(weight) : weight;
  return `${converted.toFixed(1)} ${unit}`;
}

export function formatVolume(volumeKg: number, unit: WeightUnit): string {
  const converted = unit === 'lbs' ? kgToLbs(volumeKg) : volumeKg;
  const formatted = new Intl.NumberFormat('en-US').format(Math.round(converted));
  return `${formatted} ${unit}`;
}
