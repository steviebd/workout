import { type Exercise, type NewExercise } from '../schema';

export type { Exercise, NewExercise };

export interface CreateExerciseData {
  name: string;
  muscleGroup?: string;
  description?: string;
  localId?: string;
  libraryId?: string;
}

export interface UpdateExerciseData {
  name?: string;
  muscleGroup?: string;
  description?: string;
}

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
