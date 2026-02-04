import { createFileRoute } from '@tanstack/react-router';
import { env } from 'cloudflare:workers';
import { eq, and, asc } from 'drizzle-orm';
import type { LiftType } from '~/lib/programs/types';
import { createDb } from '~/lib/db';
import { programCycleWorkouts, templateExercises, exercises, templates, userProgramCycles } from '~/lib/db/schema';
import { getSession } from '~/lib/session';
import { stronglifts } from '~/lib/programs/stronglifts';
import { wendler531 } from '~/lib/programs/wendler531';
import { madcow } from '~/lib/programs/madcow';

const PROGRAM_MAP: Record<string, typeof stronglifts | typeof wendler531 | typeof madcow> = {
  'stronglifts-5x5': stronglifts,
  '531': wendler531,
  'madcow-5x5': madcow,
};

const LIFT_MAP: Record<string, LiftType> = {
  'Squat': 'squat',
  'Bench Press': 'bench',
  'Deadlift': 'deadlift',
  'Overhead Press': 'ohp',
  'Barbell Row': 'row',
};

function getEstimatedOneRM(lift: LiftType, oneRMs: { squat: number; bench: number; deadlift: number; ohp: number }): number {
  switch (lift) {
    case 'squat': return oneRMs.squat;
    case 'bench': return oneRMs.bench;
    case 'deadlift': return oneRMs.deadlift;
    case 'ohp': return oneRMs.ohp;
    case 'row': return oneRMs.bench * 0.6;
    default: return oneRMs.squat;
  }
}

function calculateRecalculatedWeight(
  programConfig: typeof stronglifts | typeof wendler531 | typeof madcow,
  lift: LiftType,
  estimatedOneRM: number,
  week: number,
  session: number
): number {
  return programConfig.calculateTargetWeight(estimatedOneRM, week, session, lift);
}

export const Route = createFileRoute('/api/program-cycles/$id/current-workout')({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        try {
          const session = await getSession(request);
          if (!session?.workosId) {
            return Response.json({ error: 'Not authenticated' }, { status: 401 });
          }

          const db = (env as { DB?: D1Database }).DB;
          if (!db) {
            return Response.json({ error: 'Database not available' }, { status: 500 });
          }

          const drizzleDb = createDb(db);

          const cycle = await drizzleDb
            .select({
              id: userProgramCycles.id,
              programSlug: userProgramCycles.programSlug,
              squat1rm: userProgramCycles.squat1rm,
              bench1rm: userProgramCycles.bench1rm,
              deadlift1rm: userProgramCycles.deadlift1rm,
              ohp1rm: userProgramCycles.ohp1rm,
            })
            .from(userProgramCycles)
            .where(and(eq(userProgramCycles.id, params.id), eq(userProgramCycles.workosId, session.sub)))
            .get();

          if (!cycle) {
            return Response.json({ error: 'Program cycle not found' }, { status: 404 });
          }

          const currentWorkout = await drizzleDb
            .select({
              id: programCycleWorkouts.id,
              weekNumber: programCycleWorkouts.weekNumber,
              sessionNumber: programCycleWorkouts.sessionNumber,
              sessionName: programCycleWorkouts.sessionName,
              isComplete: programCycleWorkouts.isComplete,
              templateId: programCycleWorkouts.templateId,
              targetLifts: programCycleWorkouts.targetLifts,
            })
            .from(programCycleWorkouts)
            .leftJoin(templates, and(
              eq(programCycleWorkouts.templateId, templates.id),
              eq(templates.workosId, session.sub)
            ))
            .where(and(
              eq(programCycleWorkouts.cycleId, params.id),
              eq(programCycleWorkouts.isComplete, false)
            ))
            .orderBy(asc(programCycleWorkouts.weekNumber), asc(programCycleWorkouts.sessionNumber))
            .get();

          if (!currentWorkout) {
            return Response.json({ error: 'Workout not found' }, { status: 404 });
          }

          let exercisesWithRecalculatedWeights: Array<{
            id: string;
            exerciseId: string;
            orderIndex: number;
            targetWeight: number | null;
            sets: number | null;
            reps: number | null;
            exercise: { id: string; name: string; muscleGroup: string | null };
          }> = [];

          if (currentWorkout.templateId) {
            const templateExercisesData = await drizzleDb
              .select({
                id: templateExercises.id,
                exerciseId: templateExercises.exerciseId,
                orderIndex: templateExercises.orderIndex,
                targetWeight: templateExercises.targetWeight,
                sets: templateExercises.sets,
                reps: templateExercises.reps,
                exercise: {
                  id: exercises.id,
                  name: exercises.name,
                  muscleGroup: exercises.muscleGroup,
                },
              })
              .from(templateExercises)
              .innerJoin(exercises, eq(templateExercises.exerciseId, exercises.id))
              .where(eq(templateExercises.templateId, currentWorkout.templateId))
              .orderBy(templateExercises.orderIndex)
              .all();

            const programConfig = PROGRAM_MAP[cycle.programSlug];

            if (programConfig) {
              const oneRMs = {
                squat: cycle.squat1rm,
                bench: cycle.bench1rm,
                deadlift: cycle.deadlift1rm,
                ohp: cycle.ohp1rm,
              };

              exercisesWithRecalculatedWeights = templateExercisesData.map((exercise) => {
                const lift = LIFT_MAP[exercise.exercise.name] || 'squat';
                const estimatedOneRM = getEstimatedOneRM(lift, oneRMs);

                const newWeight = calculateRecalculatedWeight(
                  programConfig,
                  lift,
                  estimatedOneRM,
                  currentWorkout.weekNumber,
                  currentWorkout.sessionNumber
                );

                return {
                  ...exercise,
                  targetWeight: newWeight,
                };
              });
            } else {
              exercisesWithRecalculatedWeights = templateExercisesData;
            }
          }

          return Response.json({
            ...currentWorkout,
            exercises: exercisesWithRecalculatedWeights,
          });
        } catch (err) {
          console.error('Get current workout error:', err);
          return Response.json({ error: 'Server error' }, { status: 500 });
        }
      },
    },
  },
});

export default function ApiProgramCyclesCurrentWorkout() {
  return null;
}
