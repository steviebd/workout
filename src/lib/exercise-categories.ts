export function isSquat(name: string): boolean {
  const n = name.toLowerCase();
  return n.includes('squat') && !n.includes('goblet');
}

export function isBench(name: string): boolean {
  const n = name.toLowerCase();
  return n === 'bench' || n === 'bench press' || n.includes('bench');
}

export function isDeadlift(name: string): boolean {
  const n = name.toLowerCase();
  return n.includes('deadlift');
}

export function isOverheadPress(name: string): boolean {
  const n = name.toLowerCase();
  return n === 'ohp' || n.includes('overhead') || n.includes('over head');
}
