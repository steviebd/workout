import { createFileRoute } from '@tanstack/react-router';
import { eq, desc, and } from 'drizzle-orm';
import { withApiContext } from '../../lib/api/context';
import { createApiError, API_ERROR_CODES } from '../../lib/api/errors';
import { workouts } from '../../lib/db/schema';
import { validateBody } from '~/lib/api/route-helpers';
import { update1RMTestWorkoutSchema } from '~/lib/validators';

export const Route = createFileRoute('/api/program-cycles/$cycleId/1rm-test-workout')({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        try {
          const { db, session } = await withApiContext(request);

          const workout = await db
            .select()
            .from(workouts)
            .where(and(eq(workouts.programCycleId, params.cycleId), eq(workouts.workosId, session.sub)))
            .orderBy(desc(workouts.completedAt))
            .get();

          if (!workout) {
            return createApiError('1RM test workout not found', 404, API_ERROR_CODES.NOT_FOUND);
          }

          return Response.json(workout);
        } catch (err) {
          console.error('Get 1RM test workout error:', err);
          return createApiError('Server error', 500, API_ERROR_CODES.SERVER_ERROR);
        }
      },
      PUT: async ({ request, params }) => {
        try {
          const { db, session } = await withApiContext(request);

          const body = await validateBody(request, update1RMTestWorkoutSchema);
          if (!body) {
            return createApiError('Invalid request body', 400, API_ERROR_CODES.VALIDATION_ERROR);
          }

          const workout = await db
            .select()
            .from(workouts)
            .where(and(eq(workouts.programCycleId, params.cycleId), eq(workouts.workosId, session.sub)))
            .orderBy(desc(workouts.completedAt))
            .get();

          if (!workout) {
            return createApiError('1RM test workout not found', 404, API_ERROR_CODES.NOT_FOUND);
          }

          const updated = await db
            .update(workouts)
            .set({
              squat1rm: body.squat1rm,
              bench1rm: body.bench1rm,
              deadlift1rm: body.deadlift1rm,
              ohp1rm: body.ohp1rm,
              startingSquat1rm: body.startingSquat1rm,
              startingBench1rm: body.startingBench1rm,
              startingDeadlift1rm: body.startingDeadlift1rm,
              startingOhp1rm: body.startingOhp1rm,
            })
            .where(eq(workouts.id, workout.id))
            .returning()
            .get();

          return Response.json(updated);
        } catch (err) {
          console.error('Update 1RM test workout error:', err);
          return createApiError('Server error', 500, API_ERROR_CODES.SERVER_ERROR);
        }
      },
    },
  },
});

export default function ApiProgramCycleId1rmTestWorkout() {
  return null;
}
