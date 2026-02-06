import { createFileRoute } from '@tanstack/react-router';
import { env } from 'cloudflare:workers';
import { eq, and } from 'drizzle-orm';
import { workoutSets, workoutExercises, workouts } from '../../lib/db/schema';
import { createDb } from '../../lib/db';
import { requireAuth } from '~/lib/api/route-helpers';

export const Route = createFileRoute('/api/workout-sets')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const session = await requireAuth(request);
          if (!session) {
            return Response.json({ error: 'Not authenticated' }, { status: 401 });
          }

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
            return Response.json({ error: 'Workout exercise ID and set number are required' }, { status: 400 });
          }

          const db = (env as { DB?: D1Database }).DB;
          if (!db) {
            return Response.json({ error: 'Database not available' }, { status: 500 });
          }

          const drizzleDb = createDb(db);

          const exerciseWithOwnership = await drizzleDb
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
            return Response.json({ error: 'Workout exercise not found or does not belong to you' }, { status: 404 });
          }

          const now = new Date().toISOString();
          const workoutSet = await drizzleDb
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
          const errorMessage = err instanceof Error ? err.message : String(err);
          return Response.json({ error: 'Server error', details: errorMessage }, { status: 500 });
        }
      },
      PUT: async ({ request }) => {
        try {
          const session = await requireAuth(request);
          if (!session) {
            return Response.json({ error: 'Not authenticated' }, { status: 401 });
          }

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
            return Response.json({ error: 'Local ID is required' }, { status: 400 });
          }

          const db = (env as { DB?: D1Database }).DB;
          if (!db) {
            return Response.json({ error: 'Database not available' }, { status: 500 });
          }

          const drizzleDb = createDb(db);

          const setWithOwnership = await drizzleDb
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
            return Response.json({ error: 'Workout set not found or does not belong to you' }, { status: 404 });
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

          const updated = await drizzleDb
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
          const errorMessage = err instanceof Error ? err.message : String(err);
          return Response.json({ error: 'Server error', details: errorMessage }, { status: 500 });
        }
      },
    },
  },
});

export default function ApiWorkoutSets() {
  return null;
}
