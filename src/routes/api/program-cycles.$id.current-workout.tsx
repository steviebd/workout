import { createFileRoute } from '@tanstack/react-router';
import { env } from 'cloudflare:workers';
import { eq, and, asc } from 'drizzle-orm';
import { createDb } from '~/lib/db';
import { programCycleWorkouts, templateExercises, exercises, templates } from '~/lib/db/schema';
import { getSession } from '~/lib/session';

export const Route = createFileRoute('/api/program-cycles/$id/current-workout')({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        try {
          const session = await getSession(request);
          if (!session) {
            return Response.json({ error: 'Not authenticated' }, { status: 401 });
          }

          const db = (env as { DB?: D1Database }).DB;
          if (!db) {
            return Response.json({ error: 'Database not available' }, { status: 500 });
          }

          const drizzleDb = createDb(db);

          const currentWorkout = await drizzleDb
            .select({
              id: programCycleWorkouts.id,
              weekNumber: programCycleWorkouts.weekNumber,
              sessionNumber: programCycleWorkouts.sessionNumber,
              sessionName: programCycleWorkouts.sessionName,
              isComplete: programCycleWorkouts.isComplete,
              templateId: programCycleWorkouts.templateId,
              targetLifts: programCycleWorkouts.targetLifts,
            })
            .from(programCycleWorkouts)
            .innerJoin(templates, eq(programCycleWorkouts.templateId, templates.id))
            .where(and(
              eq(programCycleWorkouts.cycleId, params.id),
              eq(programCycleWorkouts.isComplete, false),
              eq(templates.workosId, session.workosId)
            ))
            .orderBy(asc(programCycleWorkouts.weekNumber), asc(programCycleWorkouts.sessionNumber))
            .get();

          if (!currentWorkout) {
            return Response.json({ error: 'Workout not found' }, { status: 404 });
          }

          const templateExercisesData = await drizzleDb
            .select({
              id: templateExercises.id,
              exerciseId: templateExercises.exerciseId,
              orderIndex: templateExercises.orderIndex,
              targetWeight: templateExercises.targetWeight,
              sets: templateExercises.sets,
              reps: templateExercises.reps,
              exercise: {
                id: exercises.id,
                name: exercises.name,
                muscleGroup: exercises.muscleGroup,
              },
            })
            .from(templateExercises)
            .innerJoin(exercises, eq(templateExercises.exerciseId, exercises.id))
            .where(eq(templateExercises.templateId, currentWorkout.templateId))
            .orderBy(templateExercises.orderIndex)
            .all();

          return Response.json({
            ...currentWorkout,
            exercises: templateExercisesData,
          });
        } catch (err) {
          console.error('Get current workout error:', err);
          return Response.json({ error: 'Server error' }, { status: 500 });
        }
      },
    },
  },
});

export default function ApiProgramCyclesCurrentWorkout() {
  return null;
}
