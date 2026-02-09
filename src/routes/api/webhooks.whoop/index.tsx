import { createFileRoute } from '@tanstack/react-router';
import { env } from 'cloudflare:workers';
import { whoopRepository, WhoopApiClient } from '~/lib/whoop';
import { trackEvent } from '~/lib/posthog';
import { mapWhoopSleepToDb, mapWhoopRecoveryToDb, mapWhoopCycleToDb, mapWhoopWorkoutToDb } from '~/lib/whoop/api';

const WHOOP_WEBHOOK_SECRET = process.env.WHOOP_WEBHOOK_SECRET;

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

async function verifyWebhookSignature(body: string, signature: string): Promise<boolean> {
  if (!WHOOP_WEBHOOK_SECRET) {
    return false;
  }

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(WHOOP_WEBHOOK_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify']
  );

  const signatureBuffer = Buffer.from(signature, 'hex');
  const bodyBuffer = encoder.encode(body);

  return crypto.subtle.verify('HMAC', key, signatureBuffer, bodyBuffer);
}

export const Route = createFileRoute('/api/webhooks/whoop/')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = await request.text();
        const signature = request.headers.get('X-Whoop-Signature') || '';

        const isValid = await verifyWebhookSignature(body, signature);
        if (!isValid) {
          return new Response('Invalid signature', { status: 401 });
        }

        let payload: { event_id: string; event_type: string; user_id: number; payload: unknown };
        try {
          payload = JSON.parse(body) as { event_id: string; event_type: string; user_id: number; payload: unknown };
        } catch {
          return new Response('Invalid JSON', { status: 400 });
        }

        const d1Db = (env as { DB?: D1Database }).DB;
        if (!d1Db) {
          return new Response('Database not available', { status: 500 });
        }

        const webhookEvent = {
          id: payload.event_id,
          eventType: payload.event_type,
          payloadRaw: body,
        };

        const inserted = await whoopRepository.insertWebhookEvent(d1Db, webhookEvent);
        if (!inserted) {
          return Response.json({ status: 'duplicate' });
        }

        await trackEvent('whoop_webhook_received', { eventType: payload.event_type });

        processWebhookEvent(d1Db, payload).catch(console.error);

        return Response.json({ status: 'received' });
      },
    },
  },
});

async function processWebhookEvent(d1Db: D1Database, payload: { event_id: string; event_type: string; user_id: number; payload: unknown }) {
  try {
    const connection = await whoopRepository.getConnectionByWhoopUserId(d1Db, payload.user_id.toString());
    if (!connection) {
      await whoopRepository.markWebhookProcessed(d1Db, payload.event_id, 'No connection found for whoop user');
      return;
    }

    const workosId = connection.workosId;
    const client = new WhoopApiClient(workosId, d1Db);
    const now = new Date();
    const endDate = formatDate(now);
    const startDate = formatDate(addDays(now, -7));

    switch (payload.event_type) {
      case 'daily.data.updated': {
        const cycles = await client.getCycles(startDate, endDate);
        for (const cycle of cycles.records) {
          await whoopRepository.upsertCycle(d1Db, workosId, mapWhoopCycleToDb(cycle, workosId));
        }
        const recoveries = await client.getRecoveries(startDate, endDate);
        for (const recovery of recoveries.records) {
          await whoopRepository.upsertRecovery(d1Db, workosId, mapWhoopRecoveryToDb(recovery, workosId));
        }
        const sleeps = await client.getSleeps(startDate, endDate);
        for (const sleep of sleeps.records) {
          await whoopRepository.upsertSleep(d1Db, workosId, mapWhoopSleepToDb(sleep, workosId));
        }
        break;
      }
      case 'workout.completed': {
        const workouts = await client.getWorkouts(startDate, endDate);
        for (const workout of workouts.records) {
          await whoopRepository.upsertWorkout(d1Db, workosId, mapWhoopWorkoutToDb(workout, workosId));
        }
        break;
      }
      case 'sleep.completed': {
        const sleeps = await client.getSleeps(startDate, endDate);
        for (const sleep of sleeps.records) {
          await whoopRepository.upsertSleep(d1Db, workosId, mapWhoopSleepToDb(sleep, workosId));
        }
        break;
      }
    }

    await whoopRepository.updateLastSyncAt(d1Db, workosId);
    await whoopRepository.markWebhookProcessed(d1Db, payload.event_id);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    await whoopRepository.markWebhookProcessed(d1Db, payload.event_id, errorMessage);
  }
}

export default function ApiWebhooksWhoop() {
  return null;
}
