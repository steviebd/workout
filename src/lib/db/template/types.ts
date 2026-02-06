import { createDb } from '../index';
import type { Template, NewTemplate, TemplateExercise, NewTemplateExercise } from '../schema';

export type { Template, NewTemplate, TemplateExercise, NewTemplateExercise };

export type DbOrTx = D1Database | ReturnType<typeof createDb>;

export interface TemplateExerciseWithDetails extends TemplateExercise {
  exercise?: {
    id: string;
    name: string;
    muscleGroup: string | null;
  };
}

export interface CreateTemplateData {
  name: string;
  description?: string;
  notes?: string;
  localId?: string;
  programCycleId?: string;
}

export interface UpdateTemplateData {
  name?: string;
  description?: string;
  notes?: string;
}

export interface GetTemplatesOptions {
  search?: string;
  sortBy?: 'createdAt' | 'name';
  sortOrder?: 'ASC' | 'DESC';
  limit?: number;
  offset?: number;
}

export interface TemplateWithExerciseCount extends Template {
  exerciseCount: number;
}

export interface ExerciseOrder {
  exerciseId: string;
  orderIndex: number;
}
