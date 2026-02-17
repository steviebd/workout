import type { TableType, ServerEntity } from './types';

export function createUpdateFields(tableName: TableType, serverData: ServerEntity): Record<string, unknown> {
  const updateFields: Record<string, unknown> = {
    serverUpdatedAt: new Date(serverData.updatedAt),
    syncStatus: 'synced' as const,
    needsSync: false,
  };

  switch (tableName) {
    case 'exercises':
      if (serverData.workosId !== undefined) updateFields.workosId = serverData.workosId;
      if (serverData.name !== undefined) updateFields.name = serverData.name;
      if (serverData.muscleGroup !== undefined) updateFields.muscleGroup = serverData.muscleGroup;
      if (serverData.description !== undefined) updateFields.description = serverData.description;
      if (serverData.updatedAt !== undefined) updateFields.updatedAt = new Date(serverData.updatedAt);
      break;
    case 'templates':
      if (serverData.workosId !== undefined) updateFields.workosId = serverData.workosId;
      if (serverData.name !== undefined) updateFields.name = serverData.name;
      if (serverData.description !== undefined) updateFields.description = serverData.description;
      if (serverData.updatedAt !== undefined) updateFields.updatedAt = new Date(serverData.updatedAt);
      break;
    case 'workouts':
      if (serverData.workosId !== undefined) updateFields.workosId = serverData.workosId;
      if (serverData.templateId !== undefined) updateFields.templateId = serverData.templateId;
      if (serverData.programCycleId !== undefined) updateFields.programCycleId = serverData.programCycleId;
      if (serverData.name !== undefined) updateFields.name = serverData.name;
      if (serverData.startedAt !== undefined) updateFields.startedAt = new Date(serverData.startedAt as string);
      if (serverData.completedAt !== undefined) updateFields.completedAt = serverData.completedAt ? new Date(serverData.completedAt as string) : undefined;
      if (serverData.notes !== undefined) updateFields.notes = serverData.notes;
      if (serverData.status !== undefined) updateFields.status = serverData.status;
      if (serverData.squat1rm !== undefined) updateFields.squat1rm = serverData.squat1rm;
      if (serverData.bench1rm !== undefined) updateFields.bench1rm = serverData.bench1rm;
      if (serverData.deadlift1rm !== undefined) updateFields.deadlift1rm = serverData.deadlift1rm;
      if (serverData.ohp1rm !== undefined) updateFields.ohp1rm = serverData.ohp1rm;
      if (serverData.startingSquat1rm !== undefined) updateFields.startingSquat1rm = serverData.startingSquat1rm;
      if (serverData.startingBench1rm !== undefined) updateFields.startingBench1rm = serverData.startingBench1rm;
      if (serverData.startingDeadlift1rm !== undefined) updateFields.startingDeadlift1rm = serverData.startingDeadlift1rm;
      if (serverData.startingOhp1rm !== undefined) updateFields.startingOhp1rm = serverData.startingOhp1rm;
      break;
    case 'workoutExercises':
      if (serverData.workoutId !== undefined) updateFields.workoutId = serverData.workoutId;
      if (serverData.exerciseId !== undefined) updateFields.exerciseId = serverData.exerciseId;
      if (serverData.orderIndex !== undefined) updateFields.order = serverData.orderIndex;
      if (serverData.notes !== undefined) updateFields.notes = serverData.notes;
      break;
    case 'workoutSets':
      if (serverData.workoutExerciseId !== undefined) updateFields.workoutExerciseId = serverData.workoutExerciseId;
      if (serverData.orderIndex !== undefined) updateFields.order = serverData.orderIndex;
      if (serverData.setNumber !== undefined) updateFields.setNumber = serverData.setNumber;
      if (serverData.weight !== undefined) updateFields.weight = serverData.weight;
      if (serverData.reps !== undefined) updateFields.reps = serverData.reps;
      if (serverData.rpe !== undefined) updateFields.rpe = serverData.rpe;
      if (serverData.isComplete !== undefined) updateFields.completed = serverData.isComplete;
      break;
  }

  return updateFields;
}
