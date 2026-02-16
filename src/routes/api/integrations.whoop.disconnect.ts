import { createFileRoute } from '@tanstack/react-router';
import { withApiContext } from '~/lib/api/context';
import { whoopRepository } from '~/lib/whoop/repository';

export const Route = createFileRoute('/api/integrations/whoop/disconnect' as const)({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        try {
          const { session, d1Db } = await withApiContext(request);
          const workosId = session.sub;

          const connection = await whoopRepository.getConnection(d1Db, workosId);
          if (!connection) {
            return Response.json({ error: 'Whoop not connected' }, { status: 400 });
          }

          await whoopRepository.deleteConnection(d1Db, workosId);

          return Response.json({ success: true });
        } catch (err) {
          console.error('Whoop disconnect error:', err);
          return Response.json({ error: 'Disconnect failed' }, { status: 500 });
        }
      },
    },
  },
});

export default function ApiWhoopDisconnect() {
  return null;
}
