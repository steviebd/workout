import {
  type NewWorkout,
  type NewWorkoutExercise,
  type NewWorkoutSet,
  type Workout,
  type WorkoutExercise,
  type WorkoutSet,
} from '../schema';
import { createDb } from '../index';

export type { Workout, NewWorkout, WorkoutExercise, NewWorkoutExercise, WorkoutSet, NewWorkoutSet };

export type DbOrTx = D1Database | ReturnType<typeof createDb>;

export interface CreateWorkoutData {
  name: string;
  templateId?: string;
  programCycleId?: string;
  notes?: string;
  localId?: string;
}

export interface UpdateWorkoutData {
  name?: string;
  notes?: string;
  completedAt?: string;
  squat1rm?: number | null;
  bench1rm?: number | null;
  deadlift1rm?: number | null;
  ohp1rm?: number | null;
  startingSquat1rm?: number | null;
  startingBench1rm?: number | null;
  startingDeadlift1rm?: number | null;
  startingOhp1rm?: number | null;
}

export interface GetWorkoutsOptions {
  sortBy?: 'createdAt' | 'startedAt';
  sortOrder?: 'ASC' | 'DESC';
  limit?: number;
  offset?: number;
  fromDate?: string;
  toDate?: string;
  exerciseId?: string;
}

export interface WorkoutWithExercises extends Workout {
  exercises: WorkoutExerciseWithDetails[];
}

export interface WorkoutExerciseWithDetails {
  id: string;
  localId: string | null;
  workoutId: string;
  exerciseId: string;
  orderIndex: number;
  notes: string | null;
  isAmrap: boolean;
  setNumber: number | null;
  exercise?: {
    id: string;
    name: string;
    muscleGroup: string | null;
  };
  sets: WorkoutSet[];
}

export interface LastWorkoutData {
  exerciseId: string;
  weight: number | null;
  reps: number | null;
  rpe: number | null;
}

export interface WorkoutWithExerciseCount {
  id: string;
  workosId: string;
  name: string;
  startedAt: string;
  completedAt: string | null;
  exerciseCount: number;
  totalSets: number;
  totalVolume: number;
  duration: number;
  programCycleId: string | null;
  squat1rm: number | null;
  bench1rm: number | null;
  deadlift1rm: number | null;
  ohp1rm: number | null;
  startingSquat1rm: number | null;
  startingBench1rm: number | null;
  startingDeadlift1rm: number | null;
  startingOhp1rm: number | null;
  programCycle: {
    name: string;
    programSlug: string;
    squat1rm: number;
    bench1rm: number;
    deadlift1rm: number;
    ohp1rm: number;
    startingSquat1rm: number | null;
    startingBench1rm: number | null;
    startingDeadlift1rm: number | null;
    startingOhp1rm: number | null;
  } | null;
}

export interface ExerciseOrder {
  exerciseId: string;
  orderIndex: number;
}

export interface LastWorkoutSetData {
  setNumber: number;
  weight: number | null;
  reps: number | null;
  rpe: number | null;
}

export interface WorkoutHistoryStats {
  totalWorkouts: number;
  thisWeek: number;
  thisMonth: number;
  totalVolume: number;
  totalSets: number;
}

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

export interface GetExerciseHistoryOptions {
  fromDate?: string;
  toDate?: string;
  limit?: number;
  offset?: number;
}

export interface WeeklyVolumeData {
  week: string;
  weekStart: string;
  volume: number;
}

export interface GetWeeklyVolumeOptions {
  fromDate?: string;
  toDate?: string;
  exerciseId?: string;
}

export interface StrengthDataPoint {
  date: string;
  workoutId: string;
  weight: number;
  reps: number;
  est1rm: number;
}

export interface GetStrengthHistoryOptions {
  fromDate?: string;
  toDate?: string;
  limit?: number;
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
