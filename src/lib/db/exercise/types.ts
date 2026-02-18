import { type Exercise, type NewExercise } from '../schema';

export type { Exercise, NewExercise };

export interface CreateExerciseInput {
  name: string;
  muscleGroup?: string;
  description?: string;
  localId?: string;
  libraryId?: string;
}

export interface UpdateExerciseInput {
  name?: string;
  muscleGroup?: string;
  description?: string;
}

/** @deprecated Use CreateExerciseInput instead */
export type CreateExerciseData = CreateExerciseInput;

/** @deprecated Use UpdateExerciseInput instead */
export type UpdateExerciseData = UpdateExerciseInput;

export interface GetExercisesOptions {
  search?: string;
  muscleGroup?: string;
  excludeDeleted?: boolean;
  sortBy?: 'createdAt' | 'muscleGroup' | 'name';
  sortOrder?: 'ASC' | 'DESC';
  limit?: number;
  offset?: number;
}

export interface LibraryExercise {
  name: string;
  muscleGroup: string;
  description: string;
}
