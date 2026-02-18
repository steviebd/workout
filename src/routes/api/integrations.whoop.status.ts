import { createFileRoute } from '@tanstack/react-router';
import { apiRoute } from '~/lib/api/handler';
import { whoopRepository } from '~/lib/whoop/repository';

export const Route = createFileRoute('/api/integrations/whoop/status' as const)({
  server: {
    handlers: {
      GET: apiRoute('Whoop status', async ({ session, d1Db }) => {
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
      }),
    },
  },
});

export default function ApiWhoopStatus() {
  return null;
}
