import { createFileRoute } from '@tanstack/react-router';
import { type NewWorkoutSet, deleteWorkoutSet, updateWorkoutSet } from '../../lib/db/workout';
import { withApiContext } from '../../lib/api/context';
import { createApiError } from '../../lib/api/errors';

export const Route = createFileRoute('/api/workouts/sets/$setId')({
  server: {
    handlers: {
       PUT: async ({ request, params }) => {
          try {
            const { d1Db, session } = await withApiContext(request);

            if (!params.setId || typeof params.setId !== 'string') {
              console.error('Invalid set ID:', params.setId);
              return createApiError('Invalid set ID', 400, 'VALIDATION_ERROR');
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
                return createApiError('Weight must be a non-negative number', 400, 'VALIDATION_ERROR');
              }
              updateData.weight = weight;
            }

            if (reps !== undefined && reps !== null) {
              if (typeof reps !== 'number' || reps < 0) {
                return createApiError('Reps must be a non-negative number', 400, 'VALIDATION_ERROR');
              }
              updateData.reps = reps;
            }

            if (rpe !== undefined && rpe !== null) {
              if (typeof rpe !== 'number' || rpe < 0) {
                return createApiError('RPE must be a non-negative number', 400, 'VALIDATION_ERROR');
              }
              updateData.rpe = rpe;
            }

            if (isComplete !== undefined) {
              if (typeof isComplete !== 'boolean') {
                return createApiError('isComplete must be a boolean', 400, 'VALIDATION_ERROR');
              }
              updateData.isComplete = isComplete;
              if (isComplete) {
                updateData.completedAt = new Date().toISOString();
              }
            }

            if (Object.keys(updateData).length === 0) {
              return createApiError('No valid fields to update', 400, 'VALIDATION_ERROR');
            }

            const workoutSet = await updateWorkoutSet(d1Db, params.setId, session.sub, updateData as Partial<NewWorkoutSet>);

            if (!workoutSet) {
               console.warn('Set not found or does not belong to user:', { setId: params.setId, workosId: session.sub });
              return createApiError('Set not found or does not belong to you', 404, 'NOT_FOUND');
            }

             return Response.json(workoutSet);
          } catch (err) {
            console.error('Update set error:', err);
            return createApiError('Server error', 500, 'SERVER_ERROR');
          }
        },
       DELETE: async ({ request, params }) => {
          try {
            const { d1Db, session } = await withApiContext(request);

            if (!params.setId || typeof params.setId !== 'string') {
              console.error('Invalid set ID for delete:', params.setId);
              return createApiError('Invalid set ID', 400, 'VALIDATION_ERROR');
            }

            const deleted = await deleteWorkoutSet(d1Db, params.setId, session.sub);

            if (!deleted) {
              console.warn('Delete set failed - not found or does not belong to user:', { setId: params.setId, workosId: session.sub });
              return createApiError('Set not found or does not belong to you', 404, 'NOT_FOUND');
            }

            return new Response(null, { status: 204 });
          } catch (err) {
            console.error('Delete set error:', err);
            return createApiError('Server error', 500, 'SERVER_ERROR');
          }
        },
    },
  },
});

export default function ApiWorkoutSetId() {
  return null;
}
