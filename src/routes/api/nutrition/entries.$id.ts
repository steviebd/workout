import { createFileRoute } from '@tanstack/react-router';
import { apiRouteWithParams } from '~/lib/api/handler';
import { validateBody } from '~/lib/api/route-helpers';
import { createApiError, API_ERROR_CODES } from '~/lib/api/errors';
import {
  getNutritionEntryById,
  updateNutritionEntryRow,
  softDeleteNutritionEntry,
} from '~/lib/db/nutrition';
import { updateNutritionEntrySchema } from '~/lib/validators/nutrition';

export const Route = createFileRoute('/api/nutrition/entries/$id')({
  server: {
    handlers: {
      PUT: apiRouteWithParams('Update nutrition entry', async ({ session, db: d1Db, params, request }) => {
        const entry = await getNutritionEntryById(d1Db, params.id, session.sub);
        if (!entry) {
          return createApiError('Nutrition entry not found', 404, API_ERROR_CODES.NOT_FOUND);
        }

        const body = await validateBody(request, updateNutritionEntrySchema);
        if (!body) {
          return createApiError('Invalid request body', 400, API_ERROR_CODES.VALIDATION_ERROR);
        }

        const updated = await updateNutritionEntryRow(d1Db, params.id, session.sub, {
          name: body.name,
          calories: body.calories,
          proteinG: body.proteinG,
          carbsG: body.carbsG,
          fatG: body.fatG,
          mealType: body.mealType,
        });

        if (!updated) {
          return createApiError('Nutrition entry not found', 404, API_ERROR_CODES.NOT_FOUND);
        }

        return Response.json(updated);
      }),
      DELETE: apiRouteWithParams('Delete nutrition entry', async ({ session, db: d1Db, params }) => {
        const entry = await getNutritionEntryById(d1Db, params.id, session.sub);
        if (!entry) {
          return createApiError('Nutrition entry not found', 404, API_ERROR_CODES.NOT_FOUND);
        }

        const deleted = await softDeleteNutritionEntry(d1Db, params.id, session.sub);
        if (!deleted) {
          return createApiError('Nutrition entry not found', 404, API_ERROR_CODES.NOT_FOUND);
        }

        return new Response(null, { status: 204 });
      }),
    },
  },
});

export default function ApiNutritionEntryId() {
  return null;
}
