import { createFileRoute } from '@tanstack/react-router';
import { env, waitUntil } from 'cloudflare:workers';
import { timingSafeEqual } from 'node:crypto';
import { Buffer } from 'node:buffer';
import { whoopRepository, WhoopApiClient } from '~/lib/whoop';
import { trackEvent } from '~/lib/posthog';
import { mapWhoopSleepToDb, mapWhoopRecoveryToDb, mapWhoopWorkoutToDb } from '~/lib/whoop/api';

const REPLAY_TOLERANCE_MS = 5 * 60 * 1000;

async function verifyWebhookSignature(
  timestamp: string,
  body: string,
  signature: string,
  clientSecret: string
): Promise<boolean> {
  if (!clientSecret) {
    return false;
  }

  const timestampNum = parseInt(timestamp, 10);
  if (isNaN(timestampNum)) {
    return false;
  }

  const now = Date.now();
  if (Math.abs(now - timestampNum) > REPLAY_TOLERANCE_MS) {
    return false;
  }

  const encoder = new TextEncoder();
  const data = timestamp + body;
  const keyData = encoder.encode(clientSecret);
  const messageData = encoder.encode(data);

  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signatureBytes = await crypto.subtle.sign('HMAC', key, messageData);
  const expectedBuffer = Buffer.from(new Uint8Array(signatureBytes));
  const sigBuffer = Buffer.from(signature, 'base64');

  if (sigBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(sigBuffer, expectedBuffer);
}

async function processWebhookEvent(
  d1Db: D1Database,
  payload: { user_id: number; id: string; type: string; trace_id: string }
) {
  const { user_id: userId, id, type, trace_id: traceId } = payload;

  try {
    const connection = await whoopRepository.getConnectionByWhoopUserId(d1Db, userId.toString());
    if (!connection) {
      await whoopRepository.markWebhookProcessed(d1Db, traceId, 'No connection found for whoop user');
      return;
    }

    const workosId = connection.workosId;
    const client = new WhoopApiClient(workosId, d1Db);

    switch (type) {
      case 'workout.updated': {
        const workout = await client.getWorkoutById(id);
        await whoopRepository.upsertWorkout(d1Db, workosId, mapWhoopWorkoutToDb(workout, workosId));
        break;
      }
      case 'workout.deleted': {
        await whoopRepository.updateWorkoutDeletedAt(d1Db, workosId, id, new Date().toISOString());
        break;
      }
      case 'sleep.updated': {
        const sleep = await client.getSleepById(id);
        await whoopRepository.upsertSleep(d1Db, workosId, mapWhoopSleepToDb(sleep, workosId));
        break;
      }
      case 'sleep.deleted': {
        await whoopRepository.updateSleepDeletedAt(d1Db, workosId, id, new Date().toISOString());
        await whoopRepository.updateRecoveryDeletedAt(d1Db, workosId, id, new Date().toISOString());
        break;
      }
      case 'recovery.updated': {
        const recovery = await client.getRecoveryBySleepId(id);
        await whoopRepository.upsertRecovery(d1Db, workosId, mapWhoopRecoveryToDb(recovery, workosId));
        break;
      }
      case 'recovery.deleted': {
        await whoopRepository.updateRecoveryDeletedAt(d1Db, workosId, id, new Date().toISOString());
        break;
      }
    }

    await whoopRepository.updateLastSyncAt(d1Db, workosId);
    await whoopRepository.markWebhookProcessed(d1Db, traceId);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    await whoopRepository.markWebhookProcessed(d1Db, traceId, errorMessage);
  }
}

export const Route = createFileRoute('/api/webhooks/whoop/')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const timestamp = request.headers.get('X-WHOOP-Signature-Timestamp') ?? '';
        const signature = request.headers.get('X-WHOOP-Signature') ?? '';
        const body = await request.text();

        const clientSecret = (env as { WHOOP_CLIENT_SECRET?: string }).WHOOP_CLIENT_SECRET ?? '';
        const isValid = await verifyWebhookSignature(timestamp, body, signature, clientSecret);
        if (!isValid) {
          return new Response('Invalid signature', { status: 401 });
        }

        let payload: { user_id: number; id: string; type: string; trace_id: string };
        try {
          payload = JSON.parse(body) as { user_id: number; id: string; type: string; trace_id: string };
        } catch {
          return new Response('Invalid JSON', { status: 400 });
        }

        const validEventTypes = [
          'workout.updated',
          'workout.deleted',
          'sleep.updated',
          'sleep.deleted',
          'recovery.updated',
          'recovery.deleted',
        ];

        if (!validEventTypes.includes(payload.type)) {
          return Response.json({ status: 'ignored' });
        }

        const d1Db = (env as { DB?: D1Database }).DB;
        if (!d1Db) {
          return new Response('Database not available', { status: 500 });
        }

        const webhookEvent = {
          id: payload.trace_id,
          traceId: payload.trace_id,
          eventType: payload.type,
          payloadRaw: body,
        };

        const inserted = await whoopRepository.insertWebhookEvent(d1Db, webhookEvent);
        if (!inserted) {
          return Response.json({ status: 'duplicate' });
        }

        await trackEvent('whoop_webhook_received', { eventType: payload.type });

        waitUntil(processWebhookEvent(d1Db, payload));

        return Response.json({ status: 'received' });
      },
    },
  },
});

export default function ApiWebhooksWhoop() {
  return null;
}
