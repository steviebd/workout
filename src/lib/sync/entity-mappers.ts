import type { TableType, ServerEntity } from './types';
import type { LocalExercise, LocalTemplate, LocalWorkout, LocalWorkoutExercise, LocalWorkoutSet } from '../db/local-db';

export function createEntityItem(
  tableName: TableType,
  serverData: ServerEntity,
  searchId: string
): LocalExercise | LocalTemplate | LocalWorkout | LocalWorkoutExercise | LocalWorkoutSet | null {
  const baseItem = {
    serverId: serverData.id,
    localId: searchId,
    serverUpdatedAt: new Date(serverData.updatedAt),
    syncStatus: 'synced' as const,
    needsSync: false,
  };

  switch (tableName) {
    case 'exercises':
      return {
        ...baseItem,
        workosId: (serverData.workosId as string) ?? '',
        name: (serverData.name as string) ?? '',
        muscleGroup: (serverData.muscleGroup as string) ?? '',
        description: serverData.description as string | undefined,
        createdAt: serverData.createdAt ? new Date(serverData.createdAt as string) : new Date(),
        updatedAt: serverData.updatedAt ? new Date(serverData.updatedAt) : new Date(),
      } as LocalExercise;
    case 'templates':
      return {
        ...baseItem,
        workosId: (serverData.workosId as string) ?? '',
        name: (serverData.name as string) ?? '',
        description: serverData.description as string | undefined,
        notes: serverData.notes as string | undefined,
        exercises: [],
        createdAt: serverData.createdAt ? new Date(serverData.createdAt as string) : new Date(),
        updatedAt: serverData.updatedAt ? new Date(serverData.updatedAt) : new Date(),
      } as LocalTemplate;
    case 'workouts':
      return {
        ...baseItem,
        workosId: (serverData.workosId as string) ?? '',
        name: (serverData.name as string) ?? '',
        templateId: serverData.templateId as string | undefined,
        startedAt: serverData.startedAt ? new Date(serverData.startedAt as string) : new Date(),
        completedAt: serverData.completedAt ? new Date(serverData.completedAt as string) : undefined,
        notes: serverData.notes as string | undefined,
        status: 'completed' as const,
      } as LocalWorkout;
    case 'workoutExercises':
      return {
        ...baseItem,
        workoutId: (serverData.workoutId as string) ?? '',
        exerciseId: (serverData.exerciseId as string) ?? '',
        order: (serverData.orderIndex as number) ?? 0,
        notes: serverData.notes as string | undefined,
      } as LocalWorkoutExercise;
    case 'workoutSets':
      return {
        ...baseItem,
        workoutExerciseId: (serverData.workoutExerciseId as string) ?? '',
        order: (serverData.setNumber as number) ?? 0,
        setNumber: (serverData.setNumber as number) ?? 0,
        weight: (serverData.weight as number) ?? 0,
        reps: (serverData.reps as number) ?? 0,
        rpe: serverData.rpe as number | undefined,
        completed: (serverData.isComplete as boolean) ?? false,
      } as LocalWorkoutSet;
    default:
      return null;
  }
}
