import { createFileRoute } from '@tanstack/react-router';
import { apiRoute, parseQueryParams } from '~/lib/api/handler';
import { validateBody } from '~/lib/api/route-helpers';
import { createApiError, API_ERROR_CODES } from '~/lib/api/errors';
import {
  getNutritionEntriesForDay,
  createNutritionEntryRow,
} from '~/lib/db/nutrition';
import {
  createNutritionEntrySchema,
  nutritionEntryQuerySchema,
} from '~/lib/validators/nutrition';

export const Route = createFileRoute('/api/nutrition/entries')({
  server: {
    handlers: {
      GET: apiRoute('Get nutrition entries', async ({ session, db: d1Db, request }) => {
        const url = new URL(request.url);
        const { date } = parseQueryParams<{ date?: string }>(url);

        if (!date) {
          return createApiError('date query parameter is required', 400, API_ERROR_CODES.VALIDATION_ERROR);
        }

        const validation = nutritionEntryQuerySchema.safeParse({ date });
        if (!validation.success) {
          return createApiError('Invalid date format', 400, API_ERROR_CODES.VALIDATION_ERROR);
        }

        const entries = await getNutritionEntriesForDay(d1Db, session.sub, date);

        return Response.json(entries);
      }),
      POST: apiRoute('Create nutrition entry', async ({ session, db: d1Db, request }) => {
        const body = await validateBody(request, createNutritionEntrySchema);
        if (!body) {
          return createApiError('Invalid request body', 400, API_ERROR_CODES.VALIDATION_ERROR);
        }

        const entry = await createNutritionEntryRow(d1Db, session.sub, {
          name: body.name,
          calories: body.calories,
          proteinG: body.proteinG,
          carbsG: body.carbsG,
          fatG: body.fatG,
          mealType: body.mealType,
          date: body.date,
        });

        return Response.json(entry, { status: 201 });
      }),
    },
  },
});

export default function ApiNutritionEntries() {
  return null;
}
