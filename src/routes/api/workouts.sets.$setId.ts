import { createFileRoute } from '@tanstack/react-router';
import { env } from 'cloudflare:workers';
import { type NewWorkoutSet, deleteWorkoutSet, updateWorkoutSet } from '../../lib/db/workout';
import { getSession } from '../../lib/session';

export const Route = createFileRoute('/api/workouts/sets/$setId')({
  server: {
    handlers: {
      PUT: async ({ request, params }) => {
        try {
          const session = await getSession(request);
          if (!session) {
            return Response.json({ error: 'Not authenticated' }, { status: 401 });
          }

          const body = await request.json();
          const { weight, reps, rpe, isComplete } = body as {
            weight?: number | null;
            reps?: number | null;
            rpe?: number | null;
            isComplete?: boolean;
          };

          console.log('Update set request:', {
            setId: params.setId,
            weight,
            reps,
            rpe,
            isComplete,
            body
          });

          const updateData: Record<string, unknown> = {};

          if (weight !== undefined && weight !== null) {
            if (typeof weight !== 'number' || weight < 0) {
              return Response.json({ error: 'Weight must be a non-negative number' }, { status: 400 });
            }
            updateData.weight = weight;
          }

          if (reps !== undefined && reps !== null) {
            if (typeof reps !== 'number' || reps < 0) {
              return Response.json({ error: 'Reps must be a non-negative number' }, { status: 400 });
            }
            updateData.reps = reps;
          }

          if (rpe !== undefined && rpe !== null) {
            if (typeof rpe !== 'number' || rpe < 0) {
              return Response.json({ error: 'RPE must be a non-negative number' }, { status: 400 });
            }
            updateData.rpe = rpe;
          }

          if (isComplete !== undefined) {
            if (typeof isComplete !== 'boolean') {
              return Response.json({ error: 'isComplete must be a boolean' }, { status: 400 });
            }
            updateData.isComplete = isComplete;
            if (isComplete) {
              updateData.completedAt = new Date().toISOString();
            }
          }

          if (Object.keys(updateData).length === 0) {
            return Response.json({ error: 'No valid fields to update' }, { status: 400 });
          }

          const db = (env as { DB?: D1Database }).DB;
          if (!db) {
            return Response.json({ error: 'Database not available' }, { status: 500 });
          }

          const workoutSet = await updateWorkoutSet(db, params.setId, updateData as Partial<NewWorkoutSet>);

          if (!workoutSet) {
            return Response.json({ error: 'Set not found' }, { status: 404 });
          }

          return Response.json(workoutSet);
        } catch (err) {
          console.error('Update set error:', err);
          const errorMessage = err instanceof Error ? err.message : String(err);
          return Response.json({ error: 'Server error', details: errorMessage }, { status: 500 });
        }
      },
      DELETE: async ({ request, params }) => {
        try {
          const session = await getSession(request);
          if (!session) {
            return Response.json({ error: 'Not authenticated' }, { status: 401 });
          }

          const db = (env as { DB?: D1Database }).DB;
          if (!db) {
            return Response.json({ error: 'Database not available' }, { status: 500 });
          }

          const deleted = await deleteWorkoutSet(db, params.setId);

          if (!deleted) {
            return Response.json({ error: 'Set not found' }, { status: 404 });
          }

          return new Response(null, { status: 204 });
        } catch (err) {
          console.error('Delete set error:', err);
          const errorMessage = err instanceof Error ? err.message : String(err);
          return Response.json({ error: 'Server error', details: errorMessage }, { status: 500 });
        }
      },
    },
  },
});

export default function ApiWorkoutSetId() {
  return null;
}
