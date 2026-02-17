import { createFileRoute } from '@tanstack/react-router';
import { type NewWorkoutSet, deleteWorkoutSet, updateWorkoutSet } from '../../lib/db/workout';
import { withApiContext } from '../../lib/api/context';
import { createApiError, API_ERROR_CODES } from '../../lib/api/errors';
import { validateBody } from '~/lib/api/route-helpers';
import { updateWorkoutSetSchema } from '~/lib/validators';

export const Route = createFileRoute('/api/workouts/sets/$setId')({
  server: {
    handlers: {
           PUT: async ({ request, params }) => {
           try {
             const { d1Db, session } = await withApiContext(request);

             if (!params.setId || typeof params.setId !== 'string') {
               console.error('Invalid set ID:', params.setId);
               return createApiError('Invalid set ID', 400, API_ERROR_CODES.VALIDATION_ERROR);
             }

             const body = await validateBody(request, updateWorkoutSetSchema);
             if (!body) {
               return createApiError('Invalid request body', 400, API_ERROR_CODES.VALIDATION_ERROR);
             }
             const { weight, reps, rpe, isComplete } = body;

            console.log('Update set request:', {
              setId: params.setId,
              weight,
              reps,
              rpe,
              isComplete,
            });

            const updateData: Record<string, unknown> = {};

            if (weight !== undefined && weight !== null) {
              updateData.weight = weight;
            }

            if (reps !== undefined && reps !== null) {
              updateData.reps = reps;
            }

            if (rpe !== undefined && rpe !== null) {
              updateData.rpe = rpe;
            }

            if (isComplete !== undefined) {
              updateData.isComplete = isComplete;
              if (isComplete) {
                updateData.completedAt = new Date().toISOString();
              }
            }

            if (Object.keys(updateData).length === 0) {
              return createApiError('No valid fields to update', 400, API_ERROR_CODES.VALIDATION_ERROR);
            }

            const workoutSet = await updateWorkoutSet(d1Db, params.setId, session.sub, updateData as Partial<NewWorkoutSet>);

            if (!workoutSet) {
               console.warn('Set not found or does not belong to user:', { setId: params.setId, workosId: session.sub });
              return createApiError('Set not found or does not belong to you', 404, API_ERROR_CODES.NOT_FOUND);
            }

             return Response.json(workoutSet);
          } catch (err) {
            console.error('Update set error:', err);
            return createApiError('Server error', 500, API_ERROR_CODES.SERVER_ERROR);
          }
        },
       DELETE: async ({ request, params }) => {
          try {
            const { d1Db, session } = await withApiContext(request);

            if (!params.setId || typeof params.setId !== 'string') {
              console.error('Invalid set ID for delete:', params.setId);
              return createApiError('Invalid set ID', 400, API_ERROR_CODES.VALIDATION_ERROR);
            }

            const deleted = await deleteWorkoutSet(d1Db, params.setId, session.sub);

            if (!deleted) {
              console.warn('Delete set failed - not found or does not belong to user:', { setId: params.setId, workosId: session.sub });
              return createApiError('Set not found or does not belong to you', 404, API_ERROR_CODES.NOT_FOUND);
            }

            return new Response(null, { status: 204 });
          } catch (err) {
            console.error('Delete set error:', err);
            return createApiError('Server error', 500, API_ERROR_CODES.SERVER_ERROR);
          }
        },
    },
  },
});

export default function ApiWorkoutSetId() {
  return null;
}
