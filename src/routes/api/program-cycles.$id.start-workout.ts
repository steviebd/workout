import { createFileRoute } from '@tanstack/react-router';
import { env } from 'cloudflare:workers';
import { getProgramCycleById, getCurrentWorkout, getProgramCycleWorkoutById, generateTemplateFromWorkout } from '~/lib/db/program';
import { getSession } from '~/lib/session';
import { createWorkout } from '~/lib/db/workout';
import { getTemplateById, getTemplateExercises } from '~/lib/db/template';
import { createDb } from '~/lib/db';
import { workoutExercises, workoutSets } from '~/lib/db/schema';

const BATCH_SIZE = 7;

export const Route = createFileRoute('/api/program-cycles/$id/start-workout')({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        try {
          const session = await getSession(request);
          if (!session) {
            return Response.json({ error: 'Not authenticated' }, { status: 401 });
          }

          const db = (env as { DB?: D1Database }).DB;
          if (!db) {
            return Response.json({ error: 'Database not available' }, { status: 500 });
          }

          const drizzleDb = createDb(db);

          // Check if a specific programCycleWorkoutId was provided
          let requestBody: { programCycleWorkoutId?: string } = {};
          try {
            const text = await request.text();
            if (text) {
              requestBody = JSON.parse(text) as { programCycleWorkoutId?: string };
            }
          } catch {
            // No body or invalid JSON, use default behavior
          }

          console.log('Start workout - params.id:', params.id, 'session.workosId:', session.workosId, 'programCycleWorkoutId:', requestBody.programCycleWorkoutId);
          const [cycle, currentWorkout] = await Promise.all([
            getProgramCycleById(db, params.id, session.workosId),
            requestBody.programCycleWorkoutId 
              ? getProgramCycleWorkoutById(db, requestBody.programCycleWorkoutId, session.workosId)
              : getCurrentWorkout(db, params.id, session.workosId),
          ]);

          console.log('Start workout - cycle:', cycle?.id, 'currentWorkout:', currentWorkout?.id);

          if (!cycle) {
            console.log('Start workout - Cycle not found');
            return Response.json({ error: 'Program cycle not found' }, { status: 404 });
          }

          if (cycle.status === 'completed') {
            console.log('Start workout - Cycle is completed');
            return Response.json({ error: 'Program cycle is already completed' }, { status: 400 });
          }

          if (!currentWorkout) {
            console.log('Start workout - No current workout found');
            return Response.json({ error: 'No pending workouts found for this cycle. The cycle may not have any workouts assigned.' }, { status: 404 });
          }

          let templateId: string = currentWorkout.templateId ?? '';
          console.log('Start workout - currentWorkout id:', currentWorkout.id, 'templateId:', currentWorkout.templateId);
          if (!templateId) {
            console.log('Start workout - calling generateTemplateFromWorkout');
            templateId = await generateTemplateFromWorkout(db, session.workosId, currentWorkout, cycle);
            console.log('Start workout - generateTemplateFromWorkout returned:', templateId);
          } else {
            console.log('Start workout - using existing templateId:', templateId);
          }

          const [templateResult, templateExercises] = await Promise.all([
            getTemplateById(db, templateId, session.workosId),
            getTemplateExercises(db, templateId, session.workosId),
          ]);

          console.log('Start workout - templateResult:', templateResult?.id, 'templateExercises count:', templateExercises.length);

          if (!templateResult) {
            console.log('Start workout - Template not found');
            return Response.json({ error: 'Template not found' }, { status: 404 });
          }

          const template = templateResult;

          const workout = await createWorkout(db, {
            workosId: session.workosId,
            templateId: template.id,
            programCycleId: template.programCycleId ?? undefined,
            name: template.name,
          });
          console.log('Start workout - created workout:', workout.id);

          const workoutExerciseInserts = templateExercises.map((te) => ({
            workoutId: workout.id,
            exerciseId: te.exerciseId,
            orderIndex: te.orderIndex,
            notes: undefined,
            localId: undefined,
            isAmrap: te.isAmrap ?? false,
            setNumber: te.setNumber ?? null,
          }));

          const insertedExercises: Array<{ id: string }> = [];
          for (let i = 0; i < workoutExerciseInserts.length; i += BATCH_SIZE) {
            const batch = workoutExerciseInserts.slice(i, i + BATCH_SIZE);
            const result = await drizzleDb.insert(workoutExercises).values(batch).returning({ id: workoutExercises.id }).all();
            insertedExercises.push(...result);
          }

          const workoutSetInserts: Array<typeof workoutSets.$inferInsert> = [];
          for (let i = 0; i < templateExercises.length; i++) {
            const te = templateExercises[i];
            const insertedExercise = insertedExercises[i];
            if (!insertedExercise) continue;

            const numSets = te.sets ?? 1;
            const targetWeight = te.targetWeight ?? 0;
            const reps = te.reps ?? 0;

            for (let setNum = 1; setNum <= numSets; setNum++) {
              workoutSetInserts.push({
                workoutExerciseId: insertedExercise.id,
                setNumber: setNum,
                weight: targetWeight,
                reps: reps,
                rpe: undefined,
                isComplete: false,
                localId: undefined,
              });
            }
          }

          for (let i = 0; i < workoutSetInserts.length; i += BATCH_SIZE) {
            const batch = workoutSetInserts.slice(i, i + BATCH_SIZE);
            await drizzleDb.insert(workoutSets).values(batch).run();
          }

          return Response.json({ workoutId: workout.id, workoutName: workout.name }, { status: 201 });
        } catch (err) {
          console.error('Start workout error:', err);
          return Response.json({ error: 'Server error' }, { status: 500 });
        }
      },
    },
  },
});

export default function ApiProgramCycleStartWorkout() {
  return null;
}
