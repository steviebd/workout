import { createFileRoute } from '@tanstack/react-router';
import { env } from 'cloudflare:workers';
import { updateProgramCycleWorkout, getProgramCycleWorkoutById } from '~/lib/db/program';
import { getSession } from '~/lib/session';

export const Route = createFileRoute('/api/program-cycles/$id/workouts/$workoutId/reschedule')({
  server: {
    handlers: {
      PUT: async ({ request, params }) => {
        try {
          const session = await getSession(request);
          if (!session) {
            return Response.json({ error: 'Not authenticated' }, { status: 401 });
          }

          const body = await request.json();
          const { scheduledDate, scheduledTime } = body as {
            scheduledDate: string;
            scheduledTime?: string;
          };

          if (!scheduledDate) {
            return Response.json({ error: 'scheduledDate is required' }, { status: 400 });
          }

          const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
          if (!dateRegex.test(scheduledDate)) {
            return Response.json({ error: 'scheduledDate must be in YYYY-MM-DD format' }, { status: 400 });
          }

          const db = (env as { DB?: D1Database }).DB;
          if (!db) {
            return Response.json({ error: 'Database not available' }, { status: 500 });
          }

          const existingWorkout = await getProgramCycleWorkoutById(db, params.workoutId);
          if (!existingWorkout) {
            return Response.json({ error: 'Workout not found' }, { status: 404 });
          }

          const updated = await updateProgramCycleWorkout(db, params.workoutId, {
            scheduledDate,
            scheduledTime,
          });

          if (!updated) {
            return Response.json({ error: 'Failed to reschedule workout' }, { status: 500 });
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
          return Response.json({ error: 'Server error' }, { status: 500 });
        }
      },
    },
  },
});

export default function ApiRescheduleWorkout() {
  return null;
}
