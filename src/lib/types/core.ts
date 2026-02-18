/**
 * Core Entity Types
 * 
 * Domain-specific type extensions for database entities.
 * For base entity types, import directly from '~/lib/db/schema'.
 */

import type {
  Exercise,
  Template,
  TemplateExercise,
  Workout,
  WorkoutExercise,
  WorkoutSet,
  UserProgramCycle,
  ProgramCycleWorkout,
} from '../db/schema';

// ============================================
// DOMAIN-SPECIFIC TYPE EXTENSIONS
// ============================================

/** Exercise with additional computed fields */
export interface ExerciseWithStats extends Exercise {
  usageCount: number;
  lastUsedAt: string | null;
}

/** Template with full exercise details */
export interface TemplateWithExercises extends Template {
  exercises: TemplateExerciseWithDetails[];
}

/** Template exercise with resolved exercise info */
export interface TemplateExerciseWithDetails extends TemplateExercise {
  exercise?: {
    id: string;
    name: string;
    muscleGroup: string | null;
  };
}

/** Workout with nested exercises and sets */
export interface WorkoutWithExercises extends Workout {
  exercises: WorkoutExerciseWithDetails[];
}

/** Workout exercise with resolved exercise and sets */
export interface WorkoutExerciseWithDetails extends WorkoutExercise {
  exercise?: {
    id: string;
    name: string;
    muscleGroup: string | null;
  };
  sets: WorkoutSet[];
}

/** Workout summary for list views */
export interface WorkoutSummary {
  id: string;
  name: string;
  startedAt: string;
  completedAt: string | null;
  exerciseCount: number;
  totalSets: number;
  totalVolume: number;
  duration: number;
  programCycleId: string | null;
}

/** Program cycle with computed progress */
export interface ProgramCycleWithProgress extends UserProgramCycle {
  progressPercent: number;
  completedSessions: number;
  nextWorkout: ProgramCycleWorkout | null;
}

/** Entity that tracks soft deletion */
export interface SoftDeletable {
  isDeleted: boolean;
}

/** Entity that has local/remote sync tracking */
export interface Syncable {
  localId: string | null;
  updatedAt: string;
}

/** Base entity fields common to most entities */
export interface BaseEntity {
  id: string;
  createdAt: string;
  updatedAt: string;
}

/** Entity owned by a specific user */
export interface UserOwned {
  workosId: string;
}

// ============================================
// RE-EXPORTS FROM DOMAIN TYPES
// ============================================

export type {
  CreateExerciseInput,
  UpdateExerciseInput,
  CreateExerciseData,
  UpdateExerciseData,
  GetExercisesOptions,
  LibraryExercise,
} from '../db/exercise/types';

export type {
  DbOrTx as WorkoutDbOrTx,
  CreateWorkoutData,
  UpdateWorkoutData,
  GetWorkoutsOptions,
  LastWorkoutData,
  WorkoutWithExerciseCount,
  ExerciseOrder,
  LastWorkoutSetData,
  WorkoutHistoryStats,
  ExerciseHistoryItem,
  ExerciseHistoryStats,
  GetExerciseHistoryOptions,
  WeeklyVolumeData,
  GetWeeklyVolumeOptions,
  StrengthDataPoint,
  GetStrengthHistoryOptions,
  PersonalRecord,
} from '../db/workout/types';

export type {
  CreateTemplateData,
  UpdateTemplateData,
  GetTemplatesOptions,
  TemplateWithExerciseCount,
} from '../db/template/types';
