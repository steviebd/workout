export interface ExerciseHistoryItem {
  workoutId: string;
  workoutName: string;
  workoutDate: string;
  maxWeight: number;
  repsAtMax: number;
  est1rm: number;
  isPR: boolean;
}

export interface ExerciseHistoryStats {
  maxWeight: number;
  est1rm: number;
  totalWorkouts: number;
}

export interface WorkoutHistoryStats {
  totalWorkouts: number;
  thisWeek: number;
  thisMonth: number;
  totalVolume: number;
  totalSets: number;
}

export interface WeeklyVolumeData {
  week: string;
  weekStart: string;
  volume: number;
}

export interface StrengthDataPoint {
  date: string;
  workoutId: string;
  weight: number;
  reps: number;
  est1rm: number;
}

export interface PersonalRecord {
  id: string;
  exerciseId: string;
  exerciseName: string;
  date: string;
  weight: number;
  reps: number;
  est1rm: number;
  previousRecord?: number;
}

export interface VolumeData {
  sets: number;
  reps: number;
  weight: number;
  volume: number;
}

export interface SetVolume {
  weight: number;
  reps: number;
  volume: number;
}
