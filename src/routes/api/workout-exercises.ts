import { createFileRoute } from '@tanstack/react-router';
import { env } from 'cloudflare:workers';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import { workoutExercises, workouts } from '~/lib/db/schema';
import { createDb } from '~/lib/db/index';
import { requireAuth, validateBody } from '~/lib/api/route-helpers';

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
          const session = await requireAuth(request);
          if (!session) {
            return Response.json({ error: 'Not authenticated' }, { status: 401 });
          }

          const db = (env as { DB?: D1Database }).DB;
          if (!db) {
            return Response.json({ error: 'Database not available' }, { status: 500 });
          }

          const body = await validateBody(request, createWorkoutExerciseSchema);
          if (!body) {
            return Response.json({ error: 'Invalid request body' }, { status: 400 });
          }

          const drizzleDb = createDb(db);

          const workout = await drizzleDb
            .select({ id: workouts.id })
            .from(workouts)
            .where(and(eq(workouts.id, body.workoutId), eq(workouts.workosId, session.sub)))
            .get();

          if (!workout) {
            return Response.json({ error: 'Workout not found' }, { status: 404 });
          }

          const workoutExercise = await drizzleDb
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
          return Response.json({ error: 'Server error' }, { status: 500 });
        }
      },
      PUT: async ({ request }) => {
        try {
          const session = await requireAuth(request);
          if (!session) {
            return Response.json({ error: 'Not authenticated' }, { status: 401 });
          }

          const db = (env as { DB?: D1Database }).DB;
          if (!db) {
            return Response.json({ error: 'Database not available' }, { status: 500 });
          }

          const body = await validateBody(request, updateWorkoutExerciseSchema);
          if (!body) {
            return Response.json({ error: 'Invalid request body' }, { status: 400 });
          }

          if (!body.localId) {
            return Response.json({ error: 'localId is required' }, { status: 400 });
          }

          const drizzleDb = createDb(db);

          const existingExercise = await drizzleDb
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
            return Response.json({ error: 'Workout exercise not found' }, { status: 404 });
          }

          const updateData: Partial<typeof workoutExercises.$inferInsert> = {};
          if (body.exerciseId !== undefined) updateData.exerciseId = body.exerciseId;
          if (body.orderIndex !== undefined) updateData.orderIndex = body.orderIndex;
          if (body.notes !== undefined) updateData.notes = body.notes;
          if (body.isAmrap !== undefined) updateData.isAmrap = body.isAmrap;
          if (body.setNumber !== undefined) updateData.setNumber = body.setNumber;

          const updatedExercise = await drizzleDb
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
          return Response.json({ error: 'Server error' }, { status: 500 });
        }
      },
    },
  },
});

export default function ApiWorkoutExercises() {
  return null;
}
