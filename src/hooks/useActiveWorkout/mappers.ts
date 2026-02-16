import type { LocalWorkout, LocalWorkoutExercise, LocalWorkoutSet } from '~/lib/db/local-db';
import type { ActiveWorkout, ActiveWorkoutExercise } from './types';

export function mapLocalToActiveWorkout(
  localWorkout: LocalWorkout,
  exercises: Array<LocalWorkoutExercise & { sets: LocalWorkoutSet[] }>
): ActiveWorkout {
  const mappedExercises: ActiveWorkoutExercise[] = exercises
    .sort((a, b) => a.order - b.order)
    .map((we) => ({
      exerciseId: we.exerciseId,
      name: '',
      muscleGroup: null,
      orderIndex: we.order,
      sets: we.sets
        .sort((a, b) => a.order - b.order)
        .map((s) => ({
          id: s.localId,
          setNumber: s.setNumber,
          weight: s.weight,
          reps: s.reps,
          rpe: s.rpe ?? undefined,
          isComplete: s.completed,
          completedAt: s.completed ? (s.completedAt ? s.completedAt.toISOString() : new Date().toISOString()) : undefined,
        })),
      notes: we.notes,
    }));

  return {
    id: localWorkout.localId,
    name: localWorkout.name,
    templateId: localWorkout.templateId,
    startedAt: localWorkout.startedAt.toISOString(),
    notes: localWorkout.notes,
    exercises: mappedExercises,
  };
}
