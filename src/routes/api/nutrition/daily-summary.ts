import { createFileRoute } from '@tanstack/react-router';
import { apiRoute, parseQueryParams } from '~/lib/api/handler';
import { createApiError, API_ERROR_CODES } from '~/lib/api/errors';
import {
  getTodayIntake,
  getUserBodyStats,
  getTrainingContext,
  getWhoopData,
  getNutritionEntriesForDay,
  calculateMacroTargets,
} from '~/lib/db/nutrition';

export const Route = createFileRoute('/api/nutrition/daily-summary')({
  server: {
    handlers: {
      GET: apiRoute('Get daily nutrition summary', async ({ session, db: d1Db, request }) => {
        const url = new URL(request.url);
        const { date } = parseQueryParams<{ date?: string }>(url);

        if (!date) {
          return createApiError('date query parameter is required', 400, API_ERROR_CODES.VALIDATION_ERROR);
        }

        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(date)) {
          return createApiError('Invalid date format. Use YYYY-MM-DD', 400, API_ERROR_CODES.VALIDATION_ERROR);
        }

        const [intake, bodyStats, trainingCtx, whoop, entries] = await Promise.all([
          getTodayIntake(d1Db, session.sub, date),
          getUserBodyStats(d1Db, session.sub),
          getTrainingContext(d1Db, session.sub, date),
          getWhoopData(d1Db, session.sub, date),
          getNutritionEntriesForDay(d1Db, session.sub, date),
        ]);

        let targets = {
          calories: bodyStats?.targetCalories ?? 2500,
          proteinG: bodyStats?.targetProteinG ?? 150,
          carbsG: bodyStats?.targetCarbsG ?? 250,
          fatG: bodyStats?.targetFatG ?? 80,
        };

        if (bodyStats?.bodyweightKg) {
          const calculatedTargets = calculateMacroTargets(
            bodyStats.bodyweightKg,
            trainingCtx?.type ?? null,
            false,
            bodyStats?.targetCalories ? {
              targetCalories: bodyStats.targetCalories,
              targetProteinG: bodyStats.targetProteinG ?? undefined,
              targetCarbsG: bodyStats.targetCarbsG ?? undefined,
              targetFatG: bodyStats.targetFatG ?? undefined,
            } : undefined
          );
          if (!bodyStats?.targetCalories) {
            targets = calculatedTargets;
          }
        }

        return Response.json({
          entries: entries.map(e => ({
            id: e.id,
            name: e.name,
            mealType: e.mealType,
            calories: e.calories,
            proteinG: e.proteinG,
            carbsG: e.carbsG,
            fatG: e.fatG,
            loggedAt: e.loggedAt,
          })),
          totals: {
            calories: intake.totalCalories,
            proteinG: intake.totalProteinG,
            carbsG: intake.totalCarbsG,
            fatG: intake.totalFatG,
          },
          targets,
          bodyweightKg: bodyStats?.bodyweightKg ?? null,
          trainingContext: trainingCtx,
          whoopRecovery: whoop,
          whoopCycle: null,
          programSession: null,
        });
      }),
    },
  },
});

export default function ApiNutritionDailySummary() {
  return null;
}
