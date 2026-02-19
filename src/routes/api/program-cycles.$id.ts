import { createFileRoute } from '@tanstack/react-router';
import { createApiError, API_ERROR_CODES } from '~/lib/api/errors';
import { updateProgramCycle1RM, updateProgramCycleProgress, softDeleteProgramCycle, completeProgramCycle, getProgramCycleWithWorkouts } from '~/lib/db/program';
import { validateBody } from '~/lib/api/route-helpers';
import { updateProgramCycleSchema } from '~/lib/validators';
import { apiRouteWithParams } from '~/lib/api/handler';

export const Route = createFileRoute('/api/program-cycles/$id')({
  server: {
    handlers: {
      GET: apiRouteWithParams('Get program cycle', async ({ session, d1Db, params }) => {
        const cycleWithWorkouts = await getProgramCycleWithWorkouts(d1Db, params.id, session.sub);
        if (!cycleWithWorkouts) {
          return createApiError('Program cycle not found', 404, API_ERROR_CODES.NOT_FOUND);
        }

        const completedCount = cycleWithWorkouts.workouts.filter((w) => w.isComplete).length;

        const responseData = {
          ...cycleWithWorkouts,
          preferredGymDays: cycleWithWorkouts.preferredGymDays ? cycleWithWorkouts.preferredGymDays.split(',') : [],
          totalSessionsCompleted: completedCount,
        };

        return Response.json(responseData, {
          headers: {
            'Cache-Control': 'private, max-age=60, stale-while-revalidate=300',
          },
        });
      }),
      PUT: apiRouteWithParams('Update program cycle', async ({ session, d1Db, params, request }) => {
        const body = await validateBody(request, updateProgramCycleSchema);
        if (!body) {
          return createApiError('Invalid request body', 400, API_ERROR_CODES.VALIDATION_ERROR);
        }
        const { squat1rm, bench1rm, deadlift1rm, ohp1rm, currentWeek, currentSession, isComplete } = body;

        const workosId = session.sub;
        let updated;
        const has1RMUpdate = squat1rm !== undefined || bench1rm !== undefined || deadlift1rm !== undefined || ohp1rm !== undefined;
        const hasProgressUpdate = currentWeek !== undefined || currentSession !== undefined;
        
        if (has1RMUpdate) {
          updated = await updateProgramCycle1RM(d1Db, params.id, workosId, { squat1rm, bench1rm, deadlift1rm, ohp1rm });
        }
        if (hasProgressUpdate) {
          updated = await updateProgramCycleProgress(d1Db, params.id, workosId, { currentWeek, currentSession });
        }
        if (isComplete) {
          updated = await completeProgramCycle(d1Db, params.id, workosId);
        }

        if (!updated) {
          return createApiError('Program cycle not found', 404, API_ERROR_CODES.NOT_FOUND);
        }

        return Response.json(updated);
      }),
      DELETE: apiRouteWithParams('Delete program cycle', async ({ session, d1Db, params }) => {
        const success = await softDeleteProgramCycle(d1Db, params.id, session.sub);
        if (!success) {
          return createApiError('Program cycle not found', 404, API_ERROR_CODES.NOT_FOUND);
        }

        return Response.json({ success: true });
      }),
    },
  },
});

export default function ApiProgramCycleId() {
  return null;
}
