import { createFileRoute } from '@tanstack/react-router';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import { withApiContext } from '../../lib/api/context';
import { createApiError, API_ERROR_CODES } from '../../lib/api/errors';
import { workoutExercises, workouts } from '~/lib/db/schema';
import { validateBody } from '~/lib/api/route-helpers';

const createWorkoutExerciseSchema = z.object({
  localId: z.string().optional(),
  workoutId: z.string().min(1),
  exerciseId: z.string().min(1),
  orderIndex: z.number().int().min(0),
  notes: z.string().max(2000).optional(),
  isAmrap: z.boolean().optional(),
  setNumber: z.number().int().optional(),
});

const updateWorkoutExerciseSchema = z.object({
  localId: z.string().min(1),
  exerciseId: z.string().min(1).optional(),
  orderIndex: z.number().int().min(0).optional(),
  notes: z.string().max(2000).optional(),
  isAmrap: z.boolean().optional(),
  setNumber: z.number().int().optional(),
});

export const Route = createFileRoute('/api/workout-exercises')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const { session, db } = await withApiContext(request);

          const body = await validateBody(request, createWorkoutExerciseSchema);
          if (!body) {
            return createApiError('Invalid request body', 400, API_ERROR_CODES.VALIDATION_ERROR);
          }

          const workout = await db
            .select({ id: workouts.id })
            .from(workouts)
            .where(and(eq(workouts.id, body.workoutId), eq(workouts.workosId, session.sub)))
            .get();

          if (!workout) {
            return createApiError('Workout not found', 404, API_ERROR_CODES.NOT_FOUND);
          }

          const workoutExercise = await db
            .insert(workoutExercises)
            .values({
              workoutId: body.workoutId,
              exerciseId: body.exerciseId,
              orderIndex: body.orderIndex,
              notes: body.notes,
              localId: body.localId,
              isAmrap: body.isAmrap ?? false,
              setNumber: body.setNumber ?? null,
            })
            .returning()
            .get();

          return Response.json({
            id: workoutExercise.id,
            updatedAt: workoutExercise.updatedAt,
          }, { status: 201 });
        } catch (err) {
          console.error('Create workout exercise error:', err);
          return createApiError('Server error', 500, API_ERROR_CODES.SERVER_ERROR);
        }
      },
      PUT: async ({ request }) => {
        try {
          const { session, db } = await withApiContext(request);

          const body = await validateBody(request, updateWorkoutExerciseSchema);
          if (!body) {
            return createApiError('Invalid request body', 400, API_ERROR_CODES.VALIDATION_ERROR);
          }

          if (!body.localId) {
            return createApiError('localId is required', 400, API_ERROR_CODES.VALIDATION_ERROR);
          }

          const existingExercise = await db
            .select({
              id: workoutExercises.id,
            })
            .from(workoutExercises)
            .innerJoin(workouts, eq(workoutExercises.workoutId, workouts.id))
            .where(and(
              eq(workoutExercises.localId, body.localId),
              eq(workouts.workosId, session.sub)
            ))
            .get();

          if (!existingExercise) {
            return createApiError('Workout exercise not found', 404, API_ERROR_CODES.NOT_FOUND);
          }

          const updateData: Partial<typeof workoutExercises.$inferInsert> = {};
          if (body.exerciseId !== undefined) updateData.exerciseId = body.exerciseId;
          if (body.orderIndex !== undefined) updateData.orderIndex = body.orderIndex;
          if (body.notes !== undefined) updateData.notes = body.notes;
          if (body.isAmrap !== undefined) updateData.isAmrap = body.isAmrap;
          if (body.setNumber !== undefined) updateData.setNumber = body.setNumber;

          const updatedExercise = await db
            .update(workoutExercises)
            .set(updateData)
            .where(eq(workoutExercises.id, existingExercise.id))
            .returning()
            .get();

          return Response.json({
            id: updatedExercise.id,
            updatedAt: updatedExercise.updatedAt,
          });
        } catch (err) {
          console.error('Update workout exercise error:', err);
          return createApiError('Server error', 500, API_ERROR_CODES.SERVER_ERROR);
        }
      },
    },
  },
});

export default function ApiWorkoutExercises() {
  return null;
}
