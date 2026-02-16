import type { UserProgramCycle, ProgramCycleWorkout, Template } from '../schema';

export type { UserProgramCycle, ProgramCycleWorkout };

export interface ProgramCycleWithWorkouts extends UserProgramCycle {
  workouts: ProgramCycleWorkout[];
  templates?: Template[];
}

export interface CreateProgramCycleData {
  programSlug: string;
  name: string;
  squat1rm: number;
  bench1rm: number;
  deadlift1rm: number;
  ohp1rm: number;
  totalSessionsPlanned: number;
  preferredGymDays: string;
  preferredTimeOfDay?: string;
  programStartDate: string;
  firstSessionDate: string;
  workouts: Array<{
    weekNumber: number;
    sessionNumber: number;
    sessionName: string;
    scheduledDate: string;
    scheduledTime?: string;
    targetLifts?: string;
  }>;
}

export interface ProgramWorkoutData {
  templateId: string;
  weekNumber: number;
  sessionNumber: number;
  sessionName: string;
  targetLifts: string;
}

export interface TargetLift {
  name: string;
  lift?: string;
  targetWeight: number;
  sets: number;
  reps: number;
  isAccessory?: boolean;
  isRequired?: boolean;
  accessoryId?: string;
  addedWeight?: number;
}

export interface TargetLiftWorkout {
  weekNumber: number;
  sessionNumber: number;
  sessionName: string;
  targetLifts?: TargetLift[];
  exercises?: Array<{ name: string; lift?: string; targetWeight: number; sets: number; reps: number }>;
  accessories?: Array<{ name: string; accessoryId?: string; targetWeight?: number; addedWeight?: number; sets?: number; reps?: number | string; isAccessory?: boolean; isRequired?: boolean }>;
}
