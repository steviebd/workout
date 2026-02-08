import { createFileRoute } from '@tanstack/react-router';
import { eq, and } from 'drizzle-orm';
import { workoutSets, workoutExercises, workouts } from '../../lib/db/schema';
import { withApiContext } from '../../lib/api/context';
import { createApiError, API_ERROR_CODES } from '../../lib/api/errors';

export const Route = createFileRoute('/api/workout-sets')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const { session, db } = await withApiContext(request);

          const body = await request.json();
          const { workoutExerciseId, setNumber, weight, reps, rpe, localId } = body as {
            workoutExerciseId: string;
            setNumber: number;
            weight?: number;
            reps?: number;
            rpe?: number;
            localId?: string;
          };

          if (!workoutExerciseId || setNumber === undefined) {
            return createApiError('Workout exercise ID and set number are required', 400, API_ERROR_CODES.VALIDATION_ERROR);
          }

          const exerciseWithOwnership = await db
            .select({
              exerciseId: workoutExercises.id,
            })
            .from(workoutExercises)
            .innerJoin(workouts, eq(workoutExercises.workoutId, workouts.id))
            .where(and(
              eq(workoutExercises.id, workoutExerciseId),
              eq(workouts.workosId, session.sub)
            ))
            .get();

          if (!exerciseWithOwnership) {
            return createApiError('Workout exercise not found or does not belong to you', 404, API_ERROR_CODES.NOT_FOUND);
          }

          const now = new Date().toISOString();
          const workoutSet = await db
            .insert(workoutSets)
            .values({
              workoutExerciseId,
              setNumber,
              weight,
              reps,
              rpe,
              localId,
              isComplete: false,
            })
            .returning()
            .get();

          return Response.json({
            id: workoutSet.id,
            updatedAt: now,
          }, { status: 201 });
        } catch (err) {
          console.error('Create set error:', err);
          return createApiError('Server error', 500, API_ERROR_CODES.SERVER_ERROR);
        }
      },
      PUT: async ({ request }) => {
        try {
          const { session, db } = await withApiContext(request);

          const body = await request.json();
          const { localId, workoutExerciseId, setNumber, weight, reps, rpe, isComplete } = body as {
            localId: string;
            workoutExerciseId?: string;
            setNumber?: number;
            weight?: number;
            reps?: number;
            rpe?: number;
            isComplete?: boolean;
          };

          if (!localId) {
            return createApiError('Local ID is required', 400, API_ERROR_CODES.VALIDATION_ERROR);
          }

          const setWithOwnership = await db
            .select({
              setId: workoutSets.id,
            })
            .from(workoutSets)
            .innerJoin(workoutExercises, eq(workoutSets.workoutExerciseId, workoutExercises.id))
            .innerJoin(workouts, eq(workoutExercises.workoutId, workouts.id))
            .where(and(
              eq(workoutSets.localId, localId),
              eq(workouts.workosId, session.sub)
            ))
            .get();

          if (!setWithOwnership) {
            return createApiError('Workout set not found or does not belong to you', 404, API_ERROR_CODES.NOT_FOUND);
          }

          const now = new Date().toISOString();
          const updateData: Partial<typeof workoutSets.$inferInsert> = {
            updatedAt: now,
          };

          if (workoutExerciseId !== undefined) updateData.workoutExerciseId = workoutExerciseId;
          if (setNumber !== undefined) updateData.setNumber = setNumber;
          if (weight !== undefined) updateData.weight = weight;
          if (reps !== undefined) updateData.reps = reps;
          if (rpe !== undefined) updateData.rpe = rpe;
          if (isComplete !== undefined) {
            updateData.isComplete = isComplete;
            if (isComplete) {
              updateData.completedAt = now;
            }
          }

          const updated = await db
            .update(workoutSets)
            .set(updateData)
            .where(eq(workoutSets.id, setWithOwnership.setId))
            .returning()
            .get();

          return Response.json({
            id: updated.id,
            updatedAt: now,
          });
        } catch (err) {
          console.error('Update set error:', err);
          return createApiError('Server error', 500, API_ERROR_CODES.SERVER_ERROR);
        }
      },
    },
  },
});

export default function ApiWorkoutSets() {
  return null;
}
