import { createFileRoute } from '@tanstack/react-router';
import { trackEvent } from '~/lib/analytics/server';

export const Route = createFileRoute('/api/analytics/track')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json();
          const { event, properties, distinctId } = body as { event?: string; properties?: Record<string, unknown>; distinctId?: string };

          if (!event) {
            return Response.json({ error: 'Event name is required' }, { status: 400 });
          }

          trackEvent(event, properties, distinctId ?? 'anonymous');

          return Response.json({ success: true });
        } catch (error) {
          console.error('Error tracking event:', error);
          return Response.json({ error: 'Failed to track event' }, { status: 500 });
        }
      },
    },
  },
});

export default function ApiAnalyticsTrack() {
  return null;
}
