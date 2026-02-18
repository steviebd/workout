import { createFileRoute } from '@tanstack/react-router';
import { eq } from 'drizzle-orm';
import { getProgramCycleById, getCurrentWorkout, getProgramCycleWorkoutById, generateTemplateFromWorkout, updateProgramCycleProgress } from '~/lib/db/program';
import { apiRouteWithParams } from '~/lib/api/api-route';
import { createWorkout } from '~/lib/db/workout';
import { getTemplateById, getTemplateExercises } from '~/lib/db/template';
import { workoutExercises, workoutSets, programCycleWorkouts, generateId } from '~/lib/db/schema';
import { insertWithAutoBatching } from '~/lib/db/utils';

export const Route = createFileRoute('/api/program-cycles/$id/start-workout')({
  server: {
    handlers: {
      POST: apiRouteWithParams('Start workout', async ({ d1Db, db, session, params, request }) => {
        let requestBody: { programCycleWorkoutId?: string; actualDate?: string } = {};
        try {
          const text = await request.text();
          if (text) {
            requestBody = JSON.parse(text) as { programCycleWorkoutId?: string; actualDate?: string };
          }
        } catch {
        }

        const actualDate = requestBody.actualDate ? new Date(requestBody.actualDate).toISOString() : new Date().toISOString();
        const actualDateOnly = actualDate.split('T')[0];

        console.log('Start workout - params.id:', params.id, 'session.sub:', session.sub, 'programCycleWorkoutId:', requestBody.programCycleWorkoutId);
        const [cycle, currentWorkout] = await Promise.all([
          getProgramCycleById(d1Db, params.id, session.sub),
          requestBody.programCycleWorkoutId 
            ? getProgramCycleWorkoutById(d1Db, requestBody.programCycleWorkoutId, session.sub)
            : getCurrentWorkout(d1Db, params.id, session.sub),
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
          templateId = await generateTemplateFromWorkout(d1Db, session.sub, currentWorkout, cycle);
          console.log('Start workout - generateTemplateFromWorkout returned:', templateId);
        } else {
          console.log('Start workout - using existing templateId:', templateId);
        }

        const [templateResult, templateExercises] = await Promise.all([
          getTemplateById(d1Db, templateId, session.sub),
          getTemplateExercises(d1Db, templateId, session.sub),
        ]);

        console.log('Start workout - templateResult:', templateResult?.id, 'templateExercises count:', templateExercises.length);

        if (!templateResult) {
          console.log('Start workout - Template not found');
          return Response.json({ error: 'Template not found' }, { status: 404 });
        }

        const template = templateResult;

        const workout = await createWorkout(d1Db, {
          workosId: session.sub,
          templateId: template.id,
          programCycleId: template.programCycleId ?? undefined,
          name: template.name,
        }, actualDate);
        console.log('Start workout - created workout:', workout.id);

        const workoutExerciseInserts = templateExercises.map((te) => ({
          id: generateId(),
          workoutId: workout.id,
          exerciseId: te.exerciseId,
          orderIndex: te.orderIndex,
          notes: undefined,
          localId: undefined,
          isAmrap: te.isAmrap ?? false,
          setNumber: te.setNumber ?? null,
        }));

        await insertWithAutoBatching(db, workoutExercises, workoutExerciseInserts);

        const workoutSetInserts: Array<typeof workoutSets.$inferInsert> = [];
        for (let i = 0; i < templateExercises.length; i++) {
          const te = templateExercises[i];
          const insertedExercise = workoutExerciseInserts[i];
          if (!insertedExercise) continue;

          const numSets = te.sets ?? 1;
          const targetWeight = te.targetWeight ?? 0;
          const reps = te.reps ?? 0;

          for (let setNum = 1; setNum <= numSets; setNum++) {
            workoutSetInserts.push({
              id: generateId(),
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

        await insertWithAutoBatching(db, workoutSets, workoutSetInserts);

        await updateProgramCycleProgress(d1Db, params.id, session.sub, {
          currentWeek: currentWorkout.weekNumber,
          currentSession: currentWorkout.sessionNumber,
        });

        if (currentWorkout.scheduledDate !== actualDateOnly) {
          await db.update(programCycleWorkouts)
            .set({
              scheduledDate: actualDateOnly,
              updatedAt: new Date().toISOString(),
            })
            .where(eq(programCycleWorkouts.id, currentWorkout.id))
            .run();
        }

        return Response.json({ workoutId: workout.id, workoutName: workout.name }, { status: 201 });
      }),
    },
  },
});
