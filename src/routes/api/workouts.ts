import { createFileRoute } from '@tanstack/react-router';
import { asc, desc, eq } from 'drizzle-orm';
import { createWorkoutWithDetails } from '../../lib/db/workout';
import { workouts } from '../../lib/db/schema';
import { getTemplateExercises } from '../../lib/db/template';
import { validateBody } from '../../lib/api/route-helpers';
import { createWorkoutSchema } from '../../lib/validators';
import { withApiContext } from '../../lib/api/context';
import { createApiError, API_ERROR_CODES } from '../../lib/api/errors';

type WorkoutSortColumn = typeof workouts.startedAt | typeof workouts.createdAt | typeof workouts.name;

const validSortColumns: Record<string, WorkoutSortColumn> = {
  startedAt: workouts.startedAt,
  createdAt: workouts.createdAt,
  name: workouts.name,
};

export const Route = createFileRoute('/api/workouts')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const { session, db } = await withApiContext(request);

          const url = new URL(request.url);
          const limitParam = url.searchParams.get('limit');
          const limit = limitParam ? parseInt(limitParam, 10) : 10;
          const sortBy = url.searchParams.get('sortBy') ?? 'startedAt';
          const sortOrder = url.searchParams.get('sortOrder') ?? 'DESC';

          if (isNaN(limit) || limit < 1 || limit > 100) {
            return createApiError('Invalid limit (1-100)', 400, API_ERROR_CODES.VALIDATION_ERROR);
          }

          const sortColumn = validSortColumns[sortBy] ?? workouts.startedAt;
          const orderFn = sortOrder === 'DESC' ? desc : asc;

          const userWorkouts = await db
            .select({
              id: workouts.id,
              name: workouts.name,
              notes: workouts.notes,
              startedAt: workouts.startedAt,
              completedAt: workouts.completedAt,
              workosId: workouts.workosId,
              createdAt: workouts.createdAt,
            })
            .from(workouts)
            .where(eq(workouts.workosId, session.sub))
            .orderBy(orderFn(sortColumn))
            .limit(limit)
            .all();

          return Response.json(userWorkouts);
        } catch (err) {
          console.error('Fetch workouts error:', err);
          return createApiError('Server error', 500, API_ERROR_CODES.SERVER_ERROR);
        }
      },
      POST: async ({ request }) => {
        try {
          const { session, db: d1Db } = await withApiContext(request);

          const body = await validateBody(request, createWorkoutSchema);
          if (!body) {
            return createApiError('Invalid request body', 400, API_ERROR_CODES.VALIDATION_ERROR);
          }

          let exercisesToAdd: string[] = body.exerciseIds ?? [];

          if (exercisesToAdd.length === 0 && body.templateId) {
            const templateExercises = await getTemplateExercises(d1Db, body.templateId, session.sub);
            exercisesToAdd = templateExercises.map((te) => te.exerciseId);
          }

          const workout = await createWorkoutWithDetails(d1Db, {
            workosId: session.sub,
            name: body.name.trim(),
            templateId: body.templateId,
            notes: body.notes?.trim(),
            exerciseIds: exercisesToAdd,
            localId: body.localId,
          });

          return Response.json(workout, { status: 201 });
        } catch (err) {
          console.error('Create workout error:', err);
          return createApiError('Server error', 500, API_ERROR_CODES.SERVER_ERROR);
        }
      },
    },
  },
});

export default function ApiWorkouts() {
  return null;
}
