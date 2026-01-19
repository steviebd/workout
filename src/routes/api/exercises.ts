import { createFileRoute } from '@tanstack/react-router';
import { env } from 'cloudflare:workers';
import { type CreateExerciseData, createExercise, getExercisesByUserId } from '../../lib/db/exercise';
import { getSession } from '../../lib/session';

export const Route = createFileRoute('/api/exercises')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const session = await getSession(request);
          if (!session) {
            return Response.json({ error: 'Not authenticated' }, { status: 401 });
          }

          const url = new URL(request.url);
          const search = url.searchParams.get('search') || undefined;
          const muscleGroup = url.searchParams.get('muscleGroup') || undefined;
          const sortBy = url.searchParams.get('sortBy') as 'createdAt' | 'muscleGroup' | 'name' | undefined;
          const sortOrder = url.searchParams.get('sortOrder') as 'ASC' | 'DESC' | undefined;

          const db = (env as { DB?: D1Database }).DB;
          if (!db) {
            return Response.json({ error: 'Database not available' }, { status: 500 });
          }

          const exercises = await getExercisesByUserId(db, session.userId, {
            search,
            muscleGroup,
            sortBy,
            sortOrder,
          });

          return Response.json(exercises);
        } catch (err) {
          console.error('Get exercises error:', err);
          const errorMessage = err instanceof Error ? err.message : String(err);
          const errorStack = err instanceof Error ? err.stack : undefined;
          console.error('Error details:', { message: errorMessage, stack: errorStack });
          return Response.json({ 
            error: 'Server error', 
            details: errorMessage,
            hint: 'Check server logs for stack trace'
          }, { status: 500 });
        }
      },
      POST: async ({ request }) => {
        try {
          const session = await getSession(request);
          if (!session) {
            return Response.json({ error: 'Not authenticated' }, { status: 401 });
          }

          const body = await request.json();
          const { name, muscleGroup, description } = body as CreateExerciseData;

          if (!name) {
            return Response.json({ error: 'Name is required' }, { status: 400 });
          }

          const db = (env as { DB?: D1Database }).DB;
          if (!db) {
            return Response.json({ error: 'Database not available' }, { status: 500 });
          }

          const exercise = await createExercise(db, {
            userId: session.userId,
            name,
            muscleGroup,
            description,
          });

          return Response.json(exercise, { status: 201 });
        } catch (err) {
          console.error('Create exercise error:', err);
          const errorMessage = err instanceof Error ? err.message : String(err);
          const errorStack = err instanceof Error ? err.stack : undefined;
          console.error('Error details:', { message: errorMessage, stack: errorStack });
          return Response.json({ 
            error: 'Server error', 
            details: errorMessage,
            hint: 'Check server logs for stack trace'
          }, { status: 500 });
        }
      },
    },
  },
});

export default function ApiExercises() {
  return null;
}
