const SQUAT_PATTERN = /^(?!goblet).*squat/i;
const BENCH_PATTERN = /^(bench|bench press)$/i;
const BENCH_INCLUDES_PATTERN = /bench/i;
const DEADLIFT_PATTERN = /deadlift/i;
const OHP_PATTERN = /^(ohp|overhead|over head)$/i;
const OHP_INCLUDES_PATTERN = /overhead|over head/i;

const normalizedCache = new Map<string, string>();

function normalizeName(name: string): string {
  const cached = normalizedCache.get(name);
  if (cached) return cached;
  const normalized = name.toLowerCase().trim();
  normalizedCache.set(name, normalized);
  return normalized;
}

export function isSquat(name: string): boolean {
  return SQUAT_PATTERN.test(name);
}

export function isBench(name: string): boolean {
  const normalized = normalizeName(name);
  return BENCH_PATTERN.test(normalized) || BENCH_INCLUDES_PATTERN.test(normalized);
}

export function isDeadlift(name: string): boolean {
  return DEADLIFT_PATTERN.test(name);
}

export function isOverheadPress(name: string): boolean {
  const normalized = normalizeName(name);
  return OHP_PATTERN.test(normalized) || OHP_INCLUDES_PATTERN.test(normalized);
}
