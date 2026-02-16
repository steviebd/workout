import {
  validateWorkoutExerciseOwnership as checkExerciseOwnership,
  validateWorkoutSetOwnershipByLocalId as checkSetOwnership,
} from '../db/ownership';
import type { DbOrTx } from '../db';

export interface SetOwnershipCheckResult {
  isValid: boolean;
  setId?: string;
  error?: string;
}

export async function validateWorkoutExerciseOwnership(
  dbOrTx: DbOrTx,
  workoutExerciseId: string,
  workosId: string
): Promise<SetOwnershipCheckResult> {
  const result = await checkExerciseOwnership(dbOrTx, workoutExerciseId, workosId);
  return {
    isValid: result.isValid,
    error: result.error,
  };
}

export async function validateWorkoutSetOwnership(
  dbOrTx: DbOrTx,
  localId: string,
  workosId: string
): Promise<SetOwnershipCheckResult> {
  const result = await checkSetOwnership(dbOrTx, localId, workosId);
  return {
    isValid: result.isValid,
    setId: result.entityId,
    error: result.error,
  };
}
