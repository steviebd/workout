import { createFileRoute } from '@tanstack/react-router';
import { withApiContext } from '../../lib/api/context';
import { createApiError, ApiError, API_ERROR_CODES } from '../../lib/api/errors';
import { getCycleWorkouts } from '~/lib/db/program';

export const Route = createFileRoute('/api/program-cycles/$id/workouts')({
  server: {
    handlers: {
       GET: async ({ request, params }) => {
         try {
           const { session, d1Db } = await withApiContext(request);

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
         } catch (err) {
           if (err instanceof ApiError) {
             return createApiError(err.message, err.status, err.code);
           }
           console.error('Get cycle workouts error:', err);
           return createApiError('Server error', 500, API_ERROR_CODES.SERVER_ERROR);
         }
      },
    },
  },
});

export default function ApiProgramCycleWorkouts() {
  return null;
}
