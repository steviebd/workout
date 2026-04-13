import { createFileRoute } from '@tanstack/react-router';
import { apiRoute } from '~/lib/api/api-route';
import { validateBody } from '~/lib/api/route-helpers';
import { createApiError, API_ERROR_CODES } from '~/lib/api/errors';
import {
  getUserBodyStats,
  upsertBodyStatsRow,
} from '~/lib/db/nutrition';
import { upsertBodyStatsSchema } from '~/lib/validators/nutrition';

export const Route = createFileRoute('/api/nutrition/body-stats')({
  server: {
    handlers: {
      GET: apiRoute('Get body stats', async ({ session, db: d1Db }) => {
        const stats = await getUserBodyStats(d1Db, session.sub);
        return Response.json(stats);
      }),
      POST: apiRoute('Upsert body stats', async ({ session, db: d1Db, request }) => {
        const body = await validateBody(request, upsertBodyStatsSchema);
        if (!body) {
          return createApiError('Invalid request body', 400, API_ERROR_CODES.VALIDATION_ERROR);
        }

        const stats = await upsertBodyStatsRow(d1Db, session.sub, {
          bodyweightKg: body.bodyweightKg,
          heightCm: body.heightCm,
          targetCalories: body.targetCalories,
          targetProteinG: body.targetProteinG,
          targetCarbsG: body.targetCarbsG,
          targetFatG: body.targetFatG,
          recordedAt: body.recordedAt,
        });

        return Response.json(stats, { status: 200 });
      }),
    },
  },
});

export default function ApiNutritionBodyStats() {
  return null;
}