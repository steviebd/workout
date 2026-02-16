/**
 * Core Entity Types
 * 
 * Re-exports from schema.ts with domain-specific type extensions.
 * This is the source of truth for all database entity types.
 */

import type {
  User,
  NewUser,
  Exercise,
  NewExercise,
  Template,
  NewTemplate,
  TemplateExercise,
  NewTemplateExercise,
  Workout,
  NewWorkout,
  WorkoutExercise,
  NewWorkoutExercise,
  WorkoutSet,
  NewWorkoutSet,
  UserPreference,
  NewUserPreference,
  UserStreak,
  NewUserStreak,
  UserProgramCycle,
  NewUserProgramCycle,
  ProgramCycleWorkout,
  NewProgramCycleWorkout,
  WhoopConnection,
  NewWhoopConnection,
  WhoopSleep,
  NewWhoopSleep,
  WhoopRecovery,
  NewWhoopRecovery,
  WhoopCycle,
  NewWhoopCycle,
  WhoopWorkout,
  NewWhoopWorkout,
  WhoopWebhookEvent,
  NewWhoopWebhookEvent,
} from '../db/schema';

// ============================================
// BASE ENTITY TYPES
// ============================================

/** User entity from database */
export type { User, NewUser };

/** Exercise entity - core building block for workouts */
export type { Exercise, NewExercise };

/** Template for reusable workout structures */
export type { Template, NewTemplate };

/** Exercise within a template with configuration */
export type { TemplateExercise, NewTemplateExercise };

/** Workout session entity */
export type { Workout, NewWorkout };

/** Exercise performed within a workout */
export type { WorkoutExercise, NewWorkoutExercise };

/** Individual set performed for an exercise */
export type { WorkoutSet, NewWorkoutSet };

/** User preferences and settings */
export type { UserPreference, NewUserPreference };

/** User workout streak tracking */
export type { UserStreak, NewUserStreak };

/** Active program cycle for a user */
export type { UserProgramCycle, NewUserProgramCycle };

/** Scheduled workout within a program cycle */
export type { ProgramCycleWorkout, NewProgramCycleWorkout };

// ============================================
// WHOOP INTEGRATION TYPES
// ============================================

/** WHOOP connection configuration */
export type { WhoopConnection, NewWhoopConnection };

/** Sleep data from WHOOP */
export type { WhoopSleep, NewWhoopSleep };

/** Recovery metrics from WHOOP */
export type { WhoopRecovery, NewWhoopRecovery };

/** Daily cycle/strain data from WHOOP */
export type { WhoopCycle, NewWhoopCycle };

/** Workout data from WHOOP */
export type { WhoopWorkout, NewWhoopWorkout };

/** WHOOP webhook event log */
export type { WhoopWebhookEvent, NewWhoopWebhookEvent };

// ============================================
// DOMAIN-SPECIFIC TYPE EXTENSIONS
// ============================================

/** Exercise with additional computed fields */
export interface ExerciseWithStats extends Exercise {
  /** Number of times this exercise has been performed */
  usageCount: number;
  /** Date of last workout using this exercise */
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
  /** Percentage complete (0-100) */
  progressPercent: number;
  /** Number of completed sessions */
  completedSessions: number;
  /** Next scheduled workout */
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
// RE-EXPORTS FROM DOMAIN TYPES (BACKWARD COMPATIBILITY)
// ============================================

export type {
  // Exercise types
  CreateExerciseData,
  UpdateExerciseData,
  GetExercisesOptions,
  LibraryExercise,
} from '../db/exercise/types';

export type {
  // Workout types
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
  // Template types
  CreateTemplateData,
  UpdateTemplateData,
  GetTemplatesOptions,
  TemplateWithExerciseCount,
} from '../db/template/types';
