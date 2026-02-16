import { createFileRoute } from '@tanstack/react-router';
import { withApiContext } from '../../lib/api/context';
import { createApiError, ApiError, API_ERROR_CODES } from '../../lib/api/errors';
import { updateProgramCycle1RM, updateProgramCycleProgress, softDeleteProgramCycle, completeProgramCycle, getProgramCycleWithWorkouts } from '~/lib/db/program';

interface ProgramCycleUpdateBody {
  squat1rm?: number;
  bench1rm?: number;
  deadlift1rm?: number;
  ohp1rm?: number;
  currentWeek?: number;
  currentSession?: number;
  isComplete?: boolean;
}

export const Route = createFileRoute('/api/program-cycles/$id')({
  server: {
    handlers: {
       GET: async ({ request, params }) => {
         try {
           const { session, d1Db } = await withApiContext(request);

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

           return Response.json(responseData);
         } catch (err) {
           if (err instanceof ApiError) {
             return createApiError(err.message, err.status, err.code);
           }
           console.error('Get program cycle error:', err);
           return createApiError('Server error', 500, API_ERROR_CODES.SERVER_ERROR);
         }
       },
       PUT: async ({ request, params }) => {
         try {
           const { session, d1Db } = await withApiContext(request);

           const body = await request.json() as ProgramCycleUpdateBody;
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
         } catch (err) {
           if (err instanceof ApiError) {
             return createApiError(err.message, err.status, err.code);
           }
           console.error('Update program cycle error:', err);
           return createApiError('Server error', 500, API_ERROR_CODES.SERVER_ERROR);
         }
       },
       DELETE: async ({ request, params }) => {
         try {
           const { session, d1Db } = await withApiContext(request);

            const success = await softDeleteProgramCycle(d1Db, params.id, session.sub);
           if (!success) {
             return createApiError('Program cycle not found', 404, API_ERROR_CODES.NOT_FOUND);
           }

           return Response.json({ success: true });
         } catch (err) {
           if (err instanceof ApiError) {
             return createApiError(err.message, err.status, err.code);
           }
           console.error('Delete program cycle error:', err);
           return createApiError('Server error', 500, API_ERROR_CODES.SERVER_ERROR);
         }
       },
    },
  },
});

export default function ApiProgramCycleId() {
  return null;
}
