import { createFileRoute } from '@tanstack/react-router';
import { env } from 'cloudflare:workers';
import { desc, eq } from 'drizzle-orm';
import { exercises as exercisesTable, templates as templatesTable, workouts as workoutsTable } from '../../lib/db/schema';
import { createDb } from '../../lib/db/index';
import { getSession } from '../../lib/session';

export const Route = createFileRoute('/api/sync' as const)({
  server: {
    handlers: {
      GET: async ({ request }) => {
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
            .where(eq(exercisesTable.workosId, session.workosId))
            .orderBy(desc(exercisesTable.updatedAt))
            .limit(1000);

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
            .where(eq(templatesTable.workosId, session.workosId))
            .orderBy(desc(templatesTable.updatedAt))
            .limit(1000);

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
              createdAt: workoutsTable.createdAt,
            })
            .from(workoutsTable)
            .where(eq(workoutsTable.workosId, session.workosId))
            .orderBy(desc(workoutsTable.startedAt))
            .limit(1000);

           return Response.json({
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
               createdAt: w.createdAt,
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
