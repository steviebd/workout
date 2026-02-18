import { createFileRoute } from '@tanstack/react-router';
import { apiRouteWithParams } from '~/lib/api/handler';
import { getCycleWorkouts } from '~/lib/db/program';

export const Route = createFileRoute('/api/program-cycles/$id/workouts')({
  server: {
    handlers: {
      GET: apiRouteWithParams('Get cycle workouts', async ({ session, d1Db, params }) => {
        const workouts = await getCycleWorkouts(d1Db, params.id, session.sub);
        const responseData = workouts.map(w => ({
          id: w.id,
          cycleId: w.cycleId,
          templateId: w.templateId,
          weekNumber: w.weekNumber,
          sessionNumber: w.sessionNumber,
          sessionName: w.sessionName,
          targetLifts: w.targetLifts,
          isComplete: w.isComplete,
          workoutId: w.workoutId,
          scheduledDate: w.scheduledDate,
          scheduledTime: w.scheduledTime,
          createdAt: w.createdAt,
          updatedAt: w.updatedAt,
        }));
        return Response.json(responseData);
      }),
    },
  },
});

export default function ApiProgramCycleWorkouts() {
  return null;
}
