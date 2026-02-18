/**
 * API Types
 *
 * Request/response types for API routes and validation schemas.
 * These types are used for request validation and response typing.
 */

// ============================================
// VALIDATOR SCHEMA TYPES
// ============================================

export {
  type CreateExerciseInput,
  type UpdateExerciseInput,
} from '../db/exercise/types';

export interface CopyExerciseFromLibraryInput {
  name: string;
  muscleGroup: string;
  description?: string;
}

export interface CreateTemplateInput {
  name: string;
  description?: string;
  notes?: string;
  localId?: string;
  programCycleId?: string;
}

export interface UpdateTemplateInput {
  name?: string;
  description?: string;
  notes?: string;
}

export interface AddExerciseToTemplateInput {
  exerciseId: string;
  orderIndex: number;
  targetWeight?: number;
  addedWeight?: number;
  sets?: number;
  reps?: number;
  repsRaw?: string;
  isAmrap?: boolean;
  isAccessory?: boolean;
  isRequired?: boolean;
  setNumber?: number;
}

export interface ReorderTemplateExercisesInput {
  exerciseOrders: Array<{
    exerciseId: string;
    orderIndex: number;
  }>;
}

export interface CreateWorkoutInput {
  templateId?: string;
  programCycleId?: string;
  notes?: string;
  localId?: string;
}

export interface UpdateWorkoutInput {
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

export interface CreateWorkoutExerciseInput {
  exerciseId: string;
  orderIndex: number;
  notes?: string;
  isAmrap?: boolean;
  setNumber?: number;
}

export interface ReorderWorkoutExercisesInput {
  exerciseOrders: Array<{
    exerciseId: string;
    orderIndex: number;
  }>;
}

export interface CreateWorkoutSetInput {
  workoutExerciseId: string;
  setNumber: number;
  weight?: number;
  reps?: number;
  rpe?: number;
  isComplete?: boolean;
}

export interface UpdateWorkoutSetInput {
  weight?: number;
  reps?: number;
  rpe?: number;
  isComplete?: boolean;
}

// ============================================
// API RESPONSE TYPES
// ============================================

/** Generic API success response */
export interface ApiSuccess<T = unknown> {
  success: true;
  data: T;
}

/** Generic API error response */
export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

/** Standard API response wrapper */
export type ApiResponse<T = unknown> = ApiSuccess<T> | ApiError;

/** Paginated response metadata */
export interface PaginatedMeta {
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

/** Paginated API response */
export interface PaginatedResponse<T> extends ApiSuccess<T> {
  meta: PaginatedMeta;
}

// ============================================
// ENTITY-SPECIFIC RESPONSE TYPES
// ============================================

/** Response type for exercise list queries */
export interface ExerciseListResponse {
  exercises: Array<import('../db/schema').Exercise>;
}

/** Response type for workout list queries */
export interface WorkoutListResponse {
  workouts: Array<import('../db/schema').Workout>;
}

/** Response type for template list queries */
export interface TemplateListResponse {
  templates: Array<import('../db/schema').Template>;
}

/** Response for CRUD operations returning a single entity */
export interface EntityResponse<T> {
  entity: T;
}

/** Response for bulk operations */
export interface BulkOperationResponse {
  affected: number;
  errors?: Array<{ localId: string; error: string }>;
}

// ============================================
// ROUTE PARAMETER TYPES
// ============================================

/** Common route parameter types */
export interface ByIdParams {
  id: string;
}

export interface ByLocalIdParams {
  localId: string;
}

export interface NestedIdParams {
  id: string;
  childId: string;
}

// ============================================
// FORM/INPUT TYPES (for client components)
// ============================================

/** Form data for creating an exercise */
export interface ExerciseFormData {
  name: string;
  muscleGroup?: string;
  description?: string;
}

/** Form data for creating a workout */
export interface WorkoutFormData {
  name: string;
  templateId?: string;
  notes?: string;
}

/** Form data for logging a set */
export interface SetFormData {
  weight?: number;
  reps?: number;
  rpe?: number;
  isComplete: boolean;
}
