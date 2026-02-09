import { createFileRoute } from '@tanstack/react-router';
import { withApiContext } from '~/lib/api/context';
import { whoopRepository } from '~/lib/whoop/repository';

export const Route = createFileRoute('/api/integrations/whoop/status' as const)({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        try {
          const { session, d1Db } = await withApiContext(request);
          const workosId = session.sub;

          const connection = await whoopRepository.getConnection(d1Db, workosId);

          if (!connection) {
            return Response.json({
              connected: false,
              lastSyncAt: null,
              syncInProgress: false,
              syncStatus: null,
            });
          }

          return Response.json({
            connected: true,
            lastSyncAt: connection.lastSyncAt,
            syncInProgress: connection.syncInProgress,
            syncStatus: connection.syncStatus,
            whoopUserId: connection.whoopUserId,
            scopesGranted: connection.scopesGranted,
            createdAt: connection.createdAt,
          });
        } catch (err) {
          console.error('Whoop status error:', err);
          return Response.json({ error: 'Failed to get status' }, { status: 500 });
        }
      },
    },
  },
});

export default function ApiWhoopStatus() {
  return null;
}
