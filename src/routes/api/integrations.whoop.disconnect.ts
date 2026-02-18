import { createFileRoute } from '@tanstack/react-router';
import { apiRoute } from '~/lib/api/handler';
import { whoopRepository } from '~/lib/whoop/repository';

export const Route = createFileRoute('/api/integrations/whoop/disconnect' as const)({
  server: {
    handlers: {
      POST: apiRoute('Whoop disconnect', async ({ session, d1Db }) => {
        const workosId = session.sub;

        const connection = await whoopRepository.getConnection(d1Db, workosId);
        if (!connection) {
          return Response.json({ error: 'Whoop not connected' }, { status: 400 });
        }

        await whoopRepository.deleteConnection(d1Db, workosId);

        return Response.json({ success: true });
      }),
    },
  },
});

export default function ApiWhoopDisconnect() {
  return null;
}
