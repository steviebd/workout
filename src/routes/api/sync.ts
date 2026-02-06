import { createFileRoute } from '@tanstack/react-router';
import { env } from 'cloudflare:workers';
import { desc, eq, gt, and, inArray } from 'drizzle-orm';
import {
  exercises as exercisesTable,
  templates as templatesTable,
  workouts as workoutsTable,
  workoutExercises as workoutExercisesTable,
  workoutSets as workoutSetsTable,
} from '../../lib/db/schema';
import { createDb } from '../../lib/db/index';
import { requireAuth } from '../../lib/api/route-helpers';

export const Route = createFileRoute('/api/sync' as const)({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const session = await requireAuth(request);
          if (!session) {
            return Response.json({ error: 'Not authenticated' }, { status: 401 });
          }

          const db = (env as { DB?: D1Database }).DB;
          if (!db) {
            return Response.json({ error: 'Database not available' }, { status: 500 });
          }

          const drizzleDb = createDb(db);

          const url = new URL(request.url);
          const sinceParam = url.searchParams.get('since');
          const lastSync = sinceParam ? new Date(sinceParam).toISOString() : new Date().toISOString();

          const exerciseWhere = sinceParam
            ? and(eq(exercisesTable.workosId, session.sub), gt(exercisesTable.updatedAt, sinceParam))
            : eq(exercisesTable.workosId, session.sub);

          const exercises = await drizzleDb
            .select({
              id: exercisesTable.id,
              localId: exercisesTable.localId,
              workosId: exercisesTable.workosId,
              name: exercisesTable.name,
              muscleGroup: exercisesTable.muscleGroup,
              description: exercisesTable.description,
              isDeleted: exercisesTable.isDeleted,
              createdAt: exercisesTable.createdAt,
              updatedAt: exercisesTable.updatedAt,
            })
            .from(exercisesTable)
            .where(exerciseWhere)
            .orderBy(desc(exercisesTable.updatedAt))
            .limit(1000);

          const templateWhere = sinceParam
            ? and(eq(templatesTable.workosId, session.sub), gt(templatesTable.updatedAt, sinceParam))
            : eq(templatesTable.workosId, session.sub);

          const templates = await drizzleDb
            .select({
              id: templatesTable.id,
              localId: templatesTable.localId,
              workosId: templatesTable.workosId,
              name: templatesTable.name,
              description: templatesTable.description,
              notes: templatesTable.notes,
              isDeleted: templatesTable.isDeleted,
              createdAt: templatesTable.createdAt,
              updatedAt: templatesTable.updatedAt,
            })
            .from(templatesTable)
            .where(templateWhere)
            .orderBy(desc(templatesTable.updatedAt))
            .limit(1000);

          const workoutWhere = sinceParam
            ? and(eq(workoutsTable.workosId, session.sub), gt(workoutsTable.updatedAt, sinceParam))
            : eq(workoutsTable.workosId, session.sub);

          const workouts = await drizzleDb
            .select({
              id: workoutsTable.id,
              localId: workoutsTable.localId,
              workosId: workoutsTable.workosId,
              templateId: workoutsTable.templateId,
              name: workoutsTable.name,
              startedAt: workoutsTable.startedAt,
              completedAt: workoutsTable.completedAt,
              notes: workoutsTable.notes,
              isDeleted: workoutsTable.isDeleted,
              createdAt: workoutsTable.createdAt,
              updatedAt: workoutsTable.updatedAt,
            })
            .from(workoutsTable)
            .where(workoutWhere)
            .orderBy(desc(workoutsTable.startedAt))
            .limit(1000);

          const workoutIds = workouts.map(w => w.id);

          const workoutExerciseWhere = sinceParam
            ? and(
                inArray(workoutExercisesTable.workoutId, workoutIds),
                gt(workoutExercisesTable.updatedAt, sinceParam)
              )
            : inArray(workoutExercisesTable.workoutId, workoutIds);

          const workoutExercises = await drizzleDb
            .select({
              id: workoutExercisesTable.id,
              localId: workoutExercisesTable.localId,
              workoutId: workoutExercisesTable.workoutId,
              exerciseId: workoutExercisesTable.exerciseId,
              orderIndex: workoutExercisesTable.orderIndex,
              notes: workoutExercisesTable.notes,
              isAmrap: workoutExercisesTable.isAmrap,
              setNumber: workoutExercisesTable.setNumber,
              isDeleted: workoutExercisesTable.isDeleted,
              updatedAt: workoutExercisesTable.updatedAt,
            })
            .from(workoutExercisesTable)
            .where(workoutExerciseWhere)
            .orderBy(workoutExercisesTable.workoutId, workoutExercisesTable.orderIndex)
            .limit(2000);

          const workoutExerciseIds = workoutExercises.map(we => we.id);

          const workoutSetWhere = sinceParam
            ? and(
                inArray(workoutSetsTable.workoutExerciseId, workoutExerciseIds),
                gt(workoutSetsTable.updatedAt, sinceParam)
              )
            : inArray(workoutSetsTable.workoutExerciseId, workoutExerciseIds);

          const workoutSets = await drizzleDb
            .select({
              id: workoutSetsTable.id,
              localId: workoutSetsTable.localId,
              workoutExerciseId: workoutSetsTable.workoutExerciseId,
              setNumber: workoutSetsTable.setNumber,
              weight: workoutSetsTable.weight,
              reps: workoutSetsTable.reps,
              rpe: workoutSetsTable.rpe,
              isComplete: workoutSetsTable.isComplete,
              completedAt: workoutSetsTable.completedAt,
              createdAt: workoutSetsTable.createdAt,
              isDeleted: workoutSetsTable.isDeleted,
              updatedAt: workoutSetsTable.updatedAt,
            })
            .from(workoutSetsTable)
            .where(workoutSetWhere)
            .orderBy(workoutSetsTable.workoutExerciseId, workoutSetsTable.setNumber)
            .limit(5000);

          return Response.json({
            lastSync,
            exercises: exercises.map(e => ({
              id: e.id,
              localId: e.localId,
              workosId: e.workosId,
              name: e.name,
              muscleGroup: e.muscleGroup,
              description: e.description,
              isDeleted: e.isDeleted,
              createdAt: e.createdAt,
              updatedAt: e.updatedAt,
            })),
            templates: templates.map(t => ({
              id: t.id,
              localId: t.localId,
              workosId: t.workosId,
              name: t.name,
              description: t.description,
              notes: t.notes,
              isDeleted: t.isDeleted,
              createdAt: t.createdAt,
              updatedAt: t.updatedAt,
            })),
            workouts: workouts.map(w => ({
              id: w.id,
              localId: w.localId,
              workosId: w.workosId,
              templateId: w.templateId,
              name: w.name,
              startedAt: w.startedAt,
              completedAt: w.completedAt,
              notes: w.notes,
              isDeleted: w.isDeleted,
              createdAt: w.createdAt,
              updatedAt: w.updatedAt,
            })),
            workoutExercises: workoutExercises.map(we => ({
              id: we.id,
              localId: we.localId,
              workoutId: we.workoutId,
              exerciseId: we.exerciseId,
              orderIndex: we.orderIndex,
              notes: we.notes,
              isAmrap: we.isAmrap,
              setNumber: we.setNumber,
              isDeleted: we.isDeleted,
              updatedAt: we.updatedAt,
            })),
            workoutSets: workoutSets.map(ws => ({
              id: ws.id,
              localId: ws.localId,
              workoutExerciseId: ws.workoutExerciseId,
              setNumber: ws.setNumber,
              weight: ws.weight,
              reps: ws.reps,
              rpe: ws.rpe,
              isComplete: ws.isComplete,
              completedAt: ws.completedAt,
              createdAt: ws.createdAt,
              isDeleted: ws.isDeleted,
              updatedAt: ws.updatedAt,
            })),
          });
        } catch (err) {
          console.error('Sync error:', err);
          return Response.json({ error: 'Server error' }, { status: 500 });
        }
      },
    },
  },
});

export default function ApiSync() {
  return null;
}
