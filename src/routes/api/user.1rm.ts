import { createFileRoute } from '@tanstack/react-router';
import { apiRoute } from '~/lib/api/handler';
import { getLatestOneRMs } from '~/lib/db/program';

export const Route = createFileRoute('/api/user/1rm')({
  server: {
    handlers: {
      GET: apiRoute('Get latest 1RM', async ({ session, d1Db }) => {
        const oneRMs = await getLatestOneRMs(d1Db, session.sub);

        if (!oneRMs) {
          return Response.json({
            squat1rm: null,
            bench1rm: null,
            deadlift1rm: null,
            ohp1rm: null,
          });
        }

        return Response.json(oneRMs);
      }),
    },
  },
});

export default function ApiUser1rm() {
  return null;
}
