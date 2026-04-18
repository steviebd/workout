import { createFileRoute } from '@tanstack/react-router';
import { apiRoute, parseQueryParams } from '~/lib/api/handler';
import { validateBody } from '~/lib/api/route-helpers';
import { createApiError, API_ERROR_CODES } from '~/lib/api/errors';
import {
  getTrainingContextRow,
  upsertTrainingContextRow,
} from '~/lib/db/nutrition';
import { upsertTrainingContextSchema } from '~/lib/validators/nutrition';

export const Route = createFileRoute('/api/nutrition/training-context')({
  server: {
    handlers: {
      GET: apiRoute('Get training context', async ({ session, db: d1Db, request }) => {
        const url = new URL(request.url);
        const { date } = parseQueryParams<{ date?: string }>(url);

        if (!date) {
          return createApiError('date query parameter is required', 400, API_ERROR_CODES.VALIDATION_ERROR);
        }

        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(date)) {
          return createApiError('Invalid date format. Use YYYY-MM-DD', 400, API_ERROR_CODES.VALIDATION_ERROR);
        }

        const context = await getTrainingContextRow(d1Db, session.sub, date);

        if (!context) {
          return Response.json({ trainingType: 'rest_day', customLabel: null });
        }

        return Response.json({
          trainingType: context.trainingType,
          customLabel: context.customLabel,
        });
      }),
      POST: apiRoute('Upsert training context', async ({ session, db: d1Db, request }) => {
        const body = await validateBody(request, upsertTrainingContextSchema);
        if (!body) {
          return createApiError('Invalid request body', 400, API_ERROR_CODES.VALIDATION_ERROR);
        }

        const url = new URL(request.url);
        const { date } = parseQueryParams<{ date?: string }>(url);

        if (!date) {
          return createApiError('date query parameter is required', 400, API_ERROR_CODES.VALIDATION_ERROR);
        }

        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(date)) {
          return createApiError('Invalid date format. Use YYYY-MM-DD', 400, API_ERROR_CODES.VALIDATION_ERROR);
        }

        const context = await upsertTrainingContextRow(d1Db, session.sub, date, {
          trainingType: body.trainingType,
          customLabel: body.customLabel,
        });

        return Response.json({
          trainingType: context.trainingType,
          customLabel: context.customLabel,
        });
      }),
    },
  },
});

export default function ApiNutritionTrainingContext() {
  return null;
}
