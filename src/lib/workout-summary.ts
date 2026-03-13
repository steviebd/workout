import type { WorkoutExerciseWithDetails } from '~/lib/db/workout/types';

export function formatDuration(start: string | number, end?: string): string {
  let minutes: number;
  if (typeof start === 'number') {
    minutes = start;
  } else {
    const startDate = new Date(start);
    const endDate = end ? new Date(end) : new Date();
    minutes = Math.floor((endDate.getTime() - startDate.getTime()) / 60000);
  }
  
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours > 0) {
    return `${hours}h ${mins}m`;
  }
  return `${mins}m`;
}

export function calculateTotalVolume(exercises: WorkoutExerciseWithDetails[]): number {
  try {
    let total = 0;
    for (const exercise of exercises) {
      for (const set of exercise.sets) {
        if (set.isComplete && set.weight && set.reps) {
          total += set.weight * set.reps;
        }
      }
    }
    return total;
  } catch {
    return 0;
  }
}

export function calculateE1RM(weight: number, reps: number): number {
  if (reps === 1) return weight;
  return Math.round(weight * (1 + reps / 30));
}

export interface Tested1RMs {
  squat: number;
  bench: number;
  deadlift: number;
  ohp: number;
}

export function getTested1RMs(exercises: WorkoutExerciseWithDetails[]): Tested1RMs {
  const tested: Tested1RMs = {
    squat: 0,
    bench: 0,
    deadlift: 0,
    ohp: 0,
  };
  
  for (const exercise of exercises) {
    const name = (exercise.exercise?.name ?? '').toLowerCase();
    for (const set of exercise.sets) {
      if (set.isComplete && set.weight) {
        if (name.includes('squat') && set.weight > tested.squat) {
          tested.squat = set.weight;
        } else if ((name.includes('bench') || name === 'bench press') && set.weight > tested.bench) {
          tested.bench = set.weight;
        } else if (name.includes('deadlift') && set.weight > tested.deadlift) {
          tested.deadlift = set.weight;
        } else if ((name.includes('overhead') || name.includes('ohp') || name === 'overhead press') && set.weight > tested.ohp) {
          tested.ohp = set.weight;
        }
      }
    }
  }
  
  return tested;
}

export interface WorkoutMax {
  exerciseName: string;
  weight: number;
  reps: number;
  estimatedE1RM: number;
}

export function getWorkoutMaxes(exercises: WorkoutExerciseWithDetails[]): WorkoutMax[] {
  const maxes = new Map<string, { weight: number; reps: number }>();

  for (const exercise of exercises) {
    const exerciseName = exercise.exercise?.name ?? '';
    for (const set of exercise.sets) {
      if (set.isComplete && set.weight) {
        const current = maxes.get(exerciseName);
        if (!current || set.weight > current.weight) {
          maxes.set(exerciseName, {
            weight: set.weight,
            reps: set.reps ?? 0
          });
        }
      }
    }
  }

  return Array.from(maxes.entries()).map(([name, data]) => ({
    exerciseName: name,
    weight: data.weight,
    reps: data.reps,
    estimatedE1RM: calculateE1RM(data.weight, data.reps),
  }));
}

export interface PRComparison {
  exerciseName: string;
  weight: number;
  reps: number;
  estimatedE1RM: number;
  historicalPR: {
    weight: number;
    reps: number;
    e1rm: number;
    date: string;
  } | null;
  isNewRecord: boolean;
}

export interface PR {
  id: string;
  exerciseName: string;
  date: string;
  weight: number;
  reps: number;
}

export function getComparisonData(
  workoutMaxes: WorkoutMax[],
  allTimePRs: PR[]
): PRComparison[] {
  return workoutMaxes.map(exercise => {
    const historicalPR = allTimePRs.find(pr =>
      pr.exerciseName.toLowerCase() === exercise.exerciseName.toLowerCase()
    );
    const historicalE1RM = historicalPR ? calculateE1RM(historicalPR.weight, historicalPR.reps) : 0;
    const isNewWeightRecord = historicalPR ? exercise.weight > historicalPR.weight : false;
    const isNewE1RMRecord = historicalPR ? exercise.estimatedE1RM > historicalE1RM : false;
    return {
      ...exercise,
      historicalPR: historicalPR ? {
        weight: historicalPR.weight,
        reps: historicalPR.reps,
        e1rm: historicalE1RM,
        date: historicalPR.date,
      } : null,
      isNewRecord: isNewWeightRecord || isNewE1RMRecord,
    };
  }).sort((a, b) => a.exerciseName.localeCompare(b.exerciseName));
}
