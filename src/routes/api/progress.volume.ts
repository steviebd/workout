import { createFileRoute } from '@tanstack/react-router';
import { env } from 'cloudflare:workers';
import { getWeeklyVolume } from '../../lib/db/workout';
import { getSession } from '../../lib/session';

export const Route = createFileRoute('/api/progress/volume')({
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

          const url = new URL(request.url);
          const dateRangeParam = url.searchParams.get('dateRange');
          const volumeScopeParam = url.searchParams.get('volumeScope');
          const exerciseIdParam = url.searchParams.get('exerciseId');

          const validDateRanges = ['1m', '3m', '6m', '1y', 'all'] as const;
          const validVolumeScopes = ['all', 'selected'] as const;

          let dateRange: typeof validDateRanges[number] | undefined;
          if (dateRangeParam !== null && validDateRanges.includes(dateRangeParam as typeof validDateRanges[number])) {
            dateRange = dateRangeParam as typeof validDateRanges[number];
          }

          let volumeScope: typeof validVolumeScopes[number] | undefined;
          if (volumeScopeParam !== null && validVolumeScopes.includes(volumeScopeParam as typeof validVolumeScopes[number])) {
            volumeScope = volumeScopeParam as typeof validVolumeScopes[number];
          }

          const exerciseId = exerciseIdParam ?? undefined;

          if (volumeScope === 'selected' && !exerciseId) {
            return Response.json({ error: 'exerciseId is required when volumeScope is selected' }, { status: 400 });
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

           const weeklyVolume = await getWeeklyVolume(db, session.workosId, {
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
           });
         } catch (err) {
           console.error('Get volume progress error:', err);
           return Response.json({ error: 'Server error' }, { status: 500 });
         }
       },
    },
  },
});

export default function ApiProgressVolume() {
  return null;
}
