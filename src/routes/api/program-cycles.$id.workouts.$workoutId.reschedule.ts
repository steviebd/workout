import { createFileRoute } from '@tanstack/react-router';
import { createApiError, API_ERROR_CODES } from '../../lib/api/errors';
import { updateProgramCycleWorkout, getProgramCycleWorkoutById } from '~/lib/db/program';
import { validateBody } from '~/lib/api/route-helpers';
import { rescheduleWorkoutSchema } from '~/lib/validators';
import { apiRouteWithParams } from '~/lib/api/handler';

export const Route = createFileRoute('/api/program-cycles/$id/workouts/$workoutId/reschedule')({
  server: {
    handlers: {
      PUT: apiRouteWithParams('Reschedule workout', async ({ d1Db, params, request }) => {
        const body = await validateBody(request, rescheduleWorkoutSchema);
        if (!body) {
          return createApiError('Invalid request body', 400, API_ERROR_CODES.VALIDATION_ERROR);
        }
        const { scheduledDate, scheduledTime } = body;

        const existingWorkout = await getProgramCycleWorkoutById(d1Db, params.workoutId);
        if (!existingWorkout) {
          return createApiError('Workout not found', 404, API_ERROR_CODES.NOT_FOUND);
        }

        const updated = await updateProgramCycleWorkout(d1Db, params.workoutId, {
          scheduledDate,
          scheduledTime,
        });

        if (!updated) {
          return createApiError('Failed to reschedule workout', 500, API_ERROR_CODES.SERVER_ERROR);
        }

        return Response.json({
          id: updated.id,
          cycleId: updated.cycleId,
          templateId: updated.templateId,
          weekNumber: updated.weekNumber,
          sessionNumber: updated.sessionNumber,
          sessionName: updated.sessionName,
          targetLifts: updated.targetLifts,
          isComplete: updated.isComplete,
          workoutId: updated.workoutId,
          scheduledDate: updated.scheduledDate,
          scheduledTime: updated.scheduledTime,
          createdAt: updated.createdAt,
          updatedAt: updated.updatedAt,
        });
      }),
    },
  },
});

export default function ApiRescheduleWorkout() {
  return null;
}
