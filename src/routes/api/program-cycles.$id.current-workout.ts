import { createFileRoute } from '@tanstack/react-router';
import { apiRouteWithParams } from '~/lib/api/handler';
import { getCurrentWorkout, getProgramCycleById } from '~/lib/db/program';
import { getTemplateExercises } from '~/lib/db/template';

export const Route = createFileRoute('/api/program-cycles/$id/current-workout')({
  server: {
    handlers: {
      GET: apiRouteWithParams('Get current workout', async ({ session, d1Db, params }) => {
        const cycle = await getProgramCycleById(d1Db, params.id, session.sub);
        if (!cycle) {
          return Response.json({ error: 'Program cycle not found' }, { status: 404 });
        }

        const currentWorkout = await getCurrentWorkout(d1Db, params.id, session.sub);
        if (!currentWorkout) {
          return Response.json({ error: 'No pending workouts found for this cycle' }, { status: 404 });
        }

        const templateId = currentWorkout.templateId ?? '';
        if (!templateId) {
          return Response.json({
            id: currentWorkout.id,
            weekNumber: currentWorkout.weekNumber,
            sessionNumber: currentWorkout.sessionNumber,
            sessionName: currentWorkout.sessionName,
            isComplete: currentWorkout.isComplete,
            scheduledDate: currentWorkout.scheduledDate,
            scheduledTime: currentWorkout.scheduledTime,
            exercises: [],
          });
        }

        const exercises = await getTemplateExercises(d1Db, templateId, session.sub);

        const responseData = {
          id: currentWorkout.id,
          weekNumber: currentWorkout.weekNumber,
          sessionNumber: currentWorkout.sessionNumber,
          sessionName: currentWorkout.sessionName,
          isComplete: currentWorkout.isComplete,
          scheduledDate: currentWorkout.scheduledDate,
          scheduledTime: currentWorkout.scheduledTime,
          exercises: exercises.map((e) => ({
            id: e.id,
            orderIndex: e.orderIndex,
            targetWeight: e.targetWeight,
            sets: e.sets,
            reps: e.reps,
            exercise: {
              id: e.exercise?.id ?? '',
              name: e.exercise?.name ?? '',
              muscleGroup: e.exercise?.muscleGroup ?? null,
            },
          })),
        };

        return Response.json(responseData);
      }),
    },
  },
});

export default function ApiProgramCycleCurrentWorkout() {
  return null;
}
