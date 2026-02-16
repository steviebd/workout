import { createFileRoute } from '@tanstack/react-router';
import { withApiContext } from '../../lib/api/context';
import { createApiError, API_ERROR_CODES } from '../../lib/api/errors';
import { updateProgramCycleWorkout, getProgramCycleWorkoutById } from '~/lib/db/program';

export const Route = createFileRoute('/api/program-cycles/$id/workouts/$workoutId/reschedule')({
  server: {
    handlers: {
      PUT: async ({ request, params }) => {
        try {
          const { d1Db } = await withApiContext(request);

          const body = await request.json();
          const { scheduledDate, scheduledTime } = body as {
            scheduledDate: string;
            scheduledTime?: string;
          };

          if (!scheduledDate) {
            return createApiError('scheduledDate is required', 400, API_ERROR_CODES.VALIDATION_ERROR);
          }

          const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
          if (!dateRegex.test(scheduledDate)) {
            return createApiError('scheduledDate must be in YYYY-MM-DD format', 400, API_ERROR_CODES.VALIDATION_ERROR);
          }

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
        } catch (err) {
          console.error('Reschedule workout error:', err);
          return createApiError('Server error', 500, API_ERROR_CODES.SERVER_ERROR);
        }
      },
    },
  },
});

export default function ApiRescheduleWorkout() {
  return null;
}
