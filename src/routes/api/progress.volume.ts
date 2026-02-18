import { createFileRoute } from '@tanstack/react-router';
import { getWeeklyVolume } from '../../lib/db/workout';
import { apiRoute, parseQueryParams } from '~/lib/api/handler';
import { createApiError, API_ERROR_CODES } from '~/lib/api/errors';

export const Route = createFileRoute('/api/progress/volume')({
  server: {
    handlers: {
      GET: apiRoute('Get volume progress', async ({ session, d1Db, request }) => {
        const url = new URL(request.url);
        const { dateRange: dateRangeParam, volumeScope: volumeScopeParam, exerciseId: exerciseIdParam } = parseQueryParams<{
          dateRange?: '1m' | '3m' | '6m' | '1y' | 'all';
          volumeScope?: 'all' | 'selected';
          exerciseId?: string;
        }>(url);

        const validDateRanges = ['1m', '3m', '6m', '1y', 'all'] as const;
        const validVolumeScopes = ['all', 'selected'] as const;

        let dateRange: typeof validDateRanges[number] | undefined;
        if (dateRangeParam && validDateRanges.includes(dateRangeParam as typeof validDateRanges[number])) {
          dateRange = dateRangeParam;
        }

        let volumeScope: typeof validVolumeScopes[number] | undefined;
        if (volumeScopeParam && validVolumeScopes.includes(volumeScopeParam as typeof validVolumeScopes[number])) {
          volumeScope = volumeScopeParam;
        }

        const exerciseId = exerciseIdParam ?? undefined;

        if (volumeScope === 'selected' && !exerciseId) {
          return createApiError('exerciseId is required when volumeScope is selected', 400, API_ERROR_CODES.VALIDATION_ERROR);
        }

        let fromDate: string | undefined;
        const toDate = new Date().toISOString();

        if (dateRange) {
          const baseDate = new Date();
          switch (dateRange) {
            case '1m':
              baseDate.setMonth(baseDate.getMonth() - 1);
              break;
            case '3m':
              baseDate.setMonth(baseDate.getMonth() - 3);
              break;
            case '6m':
              baseDate.setMonth(baseDate.getMonth() - 6);
              break;
            case '1y':
              baseDate.setFullYear(baseDate.getFullYear() - 1);
              break;
            case 'all':
              fromDate = undefined;
              break;
          }
          if (dateRange !== 'all') {
            fromDate = baseDate.toISOString();
          }
        }

        const exerciseFilter = volumeScope === 'selected' && exerciseId
          ? exerciseId
          : undefined;

        const weeklyVolume = await getWeeklyVolume(d1Db, session.sub, {
          fromDate,
          toDate,
          exerciseId: exerciseFilter,
        });

        return Response.json({
          weeklyVolume: weeklyVolume.map(v => ({
            week: v.week,
            weekStart: v.weekStart,
            volume: v.volume,
          })),
        }, {
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate',
          },
        });
      }),
    },
  },
});

export default function ApiProgressVolume() {
  return null;
}
