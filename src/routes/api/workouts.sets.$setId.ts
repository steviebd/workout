import { createFileRoute } from '@tanstack/react-router';
import { env } from 'cloudflare:workers';
import { type NewWorkoutSet, deleteWorkoutSet, updateWorkoutSet } from '../../lib/db/workout';
import { requireAuth } from '~/lib/api/route-helpers';

export const Route = createFileRoute('/api/workouts/sets/$setId')({
  server: {
    handlers: {
       PUT: async ({ request, params }) => {
         try {
           const session = await requireAuth(request);
           if (!session) {
             return Response.json({ error: 'Not authenticated' }, { status: 401 });
           }

          if (!params.setId || typeof params.setId !== 'string') {
            console.error('Invalid set ID:', params.setId);
            return Response.json({ error: 'Invalid set ID' }, { status: 400 });
          }

          const body = await request.json();
          const { weight, reps, rpe, isComplete } = body as {
            weight?: number | null;
            reps?: number | null;
            rpe?: number | null;
            isComplete?: boolean;
            localId?: string;
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

           const workoutSet = await updateWorkoutSet(db, params.setId, session.sub, updateData as Partial<NewWorkoutSet>);

          if (!workoutSet) {
             console.warn('Set not found or does not belong to user:', { setId: params.setId, workosId: session.sub });
            return Response.json({ error: 'Set not found or does not belong to you' }, { status: 404 });
          }

           return Response.json(workoutSet);
         } catch (err) {
           console.error('Update set error:', err);
           return Response.json({ error: 'Server error' }, { status: 500 });
         }
       },
       DELETE: async ({ request, params }) => {
         try {
           const session = await requireAuth(request);
           if (!session) {
             return Response.json({ error: 'Not authenticated' }, { status: 401 });
           }

          if (!params.setId || typeof params.setId !== 'string') {
            console.error('Invalid set ID for delete:', params.setId);
            return Response.json({ error: 'Invalid set ID' }, { status: 400 });
          }

          const db = (env as { DB?: D1Database }).DB;
          if (!db) {
            return Response.json({ error: 'Database not available' }, { status: 500 });
          }

           const deleted = await deleteWorkoutSet(db, params.setId, session.sub);

          if (!deleted) {
             console.warn('Delete set failed - not found or does not belong to user:', { setId: params.setId, workosId: session.sub });
            return Response.json({ error: 'Set not found or does not belong to you' }, { status: 404 });
          }

           return new Response(null, { status: 204 });
         } catch (err) {
           console.error('Delete set error:', err);
           return Response.json({ error: 'Server error' }, { status: 500 });
         }
       },
    },
  },
});

export default function ApiWorkoutSetId() {
  return null;
}
