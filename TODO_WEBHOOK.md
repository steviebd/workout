# WHOOP Webhook Implementation Plan

## Current Issues

The project has a webhook endpoint at `/api/webhooks/whoop/index.tsx`, but there are critical issues:

1. **Wrong event types**: The current code listens for v1 event types (`daily.data.updated`, `workout.completed`, `sleep.completed`), but WHOOP **removed v1 webhooks**. The v2 event types are:
   - `workout.updated` / `workout.deleted`
   - `sleep.updated` / `sleep.deleted`
   - `recovery.updated` / `recovery.deleted`

2. **Payload format mismatch**: v2 webhooks use UUIDs for IDs, not integers

3. **No cron job for reconciliation**: As documented by WHOOP, webhooks can be missed — a reconciliation job is recommended but missing

4. **No WHOOP user ID → internal user mapping**: Webhook `user_id` is a WHOOP `int64`, need lookup to resolve to internal user
   - Note: `whoopConnections.whoopUserId` is stored as `text` and `getConnectionByWhoopUserId` already does `.toString()` — this lookup exists but the webhook handler needs to use it properly

5. **No token revocation flow**: WHOOP recommends revoking access tokens for users who disable the integration to stop receiving webhooks

6. **Wrong signature verification secret**: Current code uses `WHOOP_WEBHOOK_SECRET` env var, but WHOOP uses the app's **client secret** (`WHOOP_CLIENT_SECRET`) for webhook signatures — there is no separate webhook secret

7. **Wrong HMAC input**: Current code only HMACs the request body, but the signature is computed over `timestamp + body` (the `X-WHOOP-Signature-Timestamp` header concatenated with the raw body)

8. **No timing-safe signature comparison**: Current code uses `crypto.subtle.verify` which may not be constant-time for the comparison step — should use `crypto.timingSafeEqual`

9. **Fire-and-forget processing is unsafe on Workers**: `void processWebhookEvent(...)` means the runtime can kill the worker after responding. Must use `ctx.waitUntil()` via `ExecutionContext` to keep the worker alive during async processing

10. **Recovery primary key will break**: `mapWhoopRecoveryToDb` currently uses `cycle_id` as the recovery's DB primary key, but v2 webhook recovery events use `sleep_id` as the identifier. This is a breaking change requiring a migration

---

## Implementation Plan

### Phase 1: Database Schema Updates

Add `deletedAt` timestamp to WHOOP data tables:
- `whoopWorkouts`
- `whoopSleeps`
- `whoopRecoveries`

Add `traceId` column to `whoopWebhookEvents` for deduplication using v2 `trace_id` field.

**Migration: Recovery primary key change.** Currently `whoopRecoveries.id` is set to `cycle_id` by `mapWhoopRecoveryToDb`. The v2 webhook sends `sleep_id` as the recovery identifier. Change the mapping to use `sleep_id` as the primary key. This requires a data migration:
1. Add a `sleepId` column to `whoopRecoveries`
2. Backfill `sleepId` from the existing `rawJson` (`sleep_id` field)
3. Re-key existing rows from `cycle_id` → `sleep_id` as the primary key
4. Drop the old `cycle_id`-based rows after verification

Note: `whoopCycles` does NOT need `deletedAt` — v2 webhooks don't have cycle events. Stale cycles will be naturally overwritten by the reconciliation job.

### Phase 2: Update Webhook Handler

**File:** `src/routes/api/webhooks.whoop/index.tsx`

1. **Change event types** to v2:
   ```
   workout.updated, workout.deleted
   sleep.updated, sleep.deleted
   recovery.updated, recovery.deleted
   ```

2. **Use `trace_id`** for deduplication instead of `event_id`

3. **Fetch by ID** instead of date range:
   - `GET /v2/activity/workout/{uuid}`
   - `GET /v2/activity/sleep/{uuid}`
   - `GET /v2/recovery/{sleep_uuid}`

4. **Handle soft delete**: Set `deletedAt` on `.deleted` events
   - Note: A recovery is deleted when its associated sleep is deleted — handle recovery cascade on `sleep.deleted`

5. **Ignore unneeded event types**: All event types are sent to every URL (no selective subscription). Return `2XX` immediately for any unhandled types.

6. **WHOOP user ID lookup**: Resolve webhook `user_id` (int64) to internal user before processing. The existing `getConnectionByWhoopUserId` method handles the int→string conversion.

7. **Fix signature verification**:
   - Remove `WHOOP_WEBHOOK_SECRET` — use `WHOOP_CLIENT_SECRET` (already available in env)
   - HMAC input must be `timestamp + body` (concatenate `X-WHOOP-Signature-Timestamp` header with raw request body)
   - Signature is base64-encoded (not hex as current code assumes)
   - Use `crypto.timingSafeEqual` for constant-time comparison to prevent timing attacks
   - **Add replay attack check**: Verify `X-WHOOP-Signature-Timestamp` is within ±5 minutes of current time

8. **Use `ctx.waitUntil()` for async processing**: Instead of `void processWebhookEvent(...)`, pass `ExecutionContext` and call `ctx.waitUntil(processWebhookEvent(...))` so the Workers runtime keeps the isolate alive until processing completes

### Phase 3: Repository Updates

**File:** `src/lib/whoop/repository.ts`

- Add soft-delete methods: `updateWorkoutDeletedAt()`, `updateSleepDeletedAt()`, `updateRecoveryDeletedAt()`
- Update query methods to filter out `deletedAt IS NOT NULL`

### Phase 4: Add Fetch-by-ID API Methods

**File:** `src/lib/whoop/api.ts`

Add methods to fetch individual records:
- `getWorkoutById(uuid: string)`
- `getSleepById(uuid: string)`
- `getRecoveryBySleepId(uuid: string)`

### Phase 5: ~~Add Reconciliation Cron Job~~

~~Create a scheduled worker to run daily:~~
~~- Fetch each user's last 14 days of data~~
~~- Upsert records (handles any missed webhooks)~~

~~**Trigger mechanism:** Cloudflare Workers scheduled handlers use the `scheduled` event configured in `wrangler.toml` via `[triggers]` cron syntax — NOT an HTTP route. However, since TanStack Start owns the worker entry point, the simplest approach is:~~
~~- Create an API route `src/routes/api/cron/reconcile.whoop.ts` protected by a shared secret header~~
~~- Configure a Cloudflare Cron Trigger to hit this route with the auth header~~
~~- Alternatively, add a separate worker in `wrangler.toml` with a `[triggers]` block if the app architecture supports it~~

**SKIPPED** - Manual sync available on /health page instead.

### Phase 6: Token Revocation

Handle deauthorized users:
- When a user disables the integration, revoke their WHOOP access token
- This stops WHOOP from sending webhooks for that user

### Phase 7: WHOOP Dashboard Configuration

Configure in WHOOP Developer Dashboard:
1. Set webhook URL to `https://your-domain.com/api/webhooks/whoop`
2. Select **v2** model version
3. The signature is verified using the app's **client secret** (found in the dashboard) — not a separate webhook secret

---

## Files to Modify

| File | Change |
|------|--------|
| `src/lib/db/schema.ts` | Add `deletedAt` to whoopWorkouts, whoopSleeps, whoopRecoveries. Add `traceId` to whoopWebhookEvents. Migrate recovery PK from `cycle_id` to `sleep_id`. |
| `src/lib/whoop/repository.ts` | Add soft-delete methods, update queries to filter `deletedAt`, update recovery ID mapping |
| `src/lib/whoop/api.ts` | Add fetch-by-ID methods, update `mapWhoopRecoveryToDb` to use `sleep_id` as PK |
| `src/routes/api/webhooks.whoop/index.tsx` | Full rewrite for v2: fix signature (use client secret, timestamp+body, base64, timingSafeEqual), use `ctx.waitUntil()`, v2 event types |

---

## Webhook Payload (v2)

```json
{
  "user_id": 456,
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "type": "sleep.updated",
  "trace_id": "e369c784-5100-49e8-8098-75d35c47b31b"
}
```

## Event Types

| Event | ID Type | API Endpoint |
|-------|---------|--------------|
| `workout.updated` | workout UUID | GET /v2/activity/workout/{id} |
| `workout.deleted` | workout UUID | N/A - soft delete |
| `sleep.updated` | sleep UUID | GET /v2/activity/sleep/{id} |
| `sleep.deleted` | sleep UUID | N/A - soft delete |
| `recovery.updated` | sleep UUID | GET /v2/recovery/{sleep_id} |
| `recovery.deleted` | sleep UUID | N/A - soft delete |

Note: For recovery events, the ID is the UUID of the **associated sleep**, not a recovery UUID.

---

## Signature Verification

The signature uses `X-WHOOP-Signature` header with SHA256 HMAC:

```
calculated_signature = base64Encode(HMACSHA256(timestamp_header + raw_http_request_body, client_secret))
```

Headers:
- `X-WHOOP-Signature` - the actual signature (base64-encoded, NOT hex)
- `X-WHOOP-Signature-Timestamp` - milliseconds since epoch

Key: The app's **client secret** (`WHOOP_CLIENT_SECRET`) — NOT a separate webhook secret. Remove the `WHOOP_WEBHOOK_SECRET` env var.

---

## Implementation Notes

### `ctx.waitUntil()` Access

TanStack Start doesn't expose `ExecutionContext` in route handler arguments. Use `getExecutionContext()` from the `cloudflare:workers` module (already imported for `env`):

```ts
import { env, getExecutionContext } from 'cloudflare:workers';

// In the handler:
const ctx = getExecutionContext();
ctx.waitUntil(processWebhookEvent(d1Db, payload));
```

### Header Casing

Current code uses `X-Whoop-Signature`. The v2 docs specify `X-WHOOP-Signature` and `X-WHOOP-Signature-Timestamp`. Cloudflare Workers' `request.headers.get()` is case-insensitive per the Fetch spec, so this is cosmetic — but update to match the docs for readability.

### Recovery Cascade on `sleep.deleted`

When a `sleep.deleted` event is received, the associated recovery must also be soft-deleted. Since recoveries are keyed by `sleep_id` (after the PK migration), the cascade is: look up the recovery by the deleted sleep's UUID and set its `deletedAt` too.

### HTTP-Triggered Cron (not native scheduled handler)

TanStack Start owns the worker's `export default`, so a native `scheduled` export can't coexist alongside it. The HTTP route approach (API route + shared-secret header + Cloudflare Cron Trigger) is the pragmatic alternative.

---

## Best Practices (from WHOOP docs)

1. **Respond quickly** - Return 2XX within 1 second, process asynchronously
2. **Validate signatures** - Always verify webhook authenticity
3. **Implement reconciliation job** - Don't rely solely on webhooks
4. **Handle duplicates** - Use `trace_id` to detect duplicate deliveries
5. **Retry handling** - WHOOP retries 5 times over ~1 hour on failure
6. **Use `ctx.waitUntil()`** - On Cloudflare Workers, async processing after returning a response must be wrapped in `ctx.waitUntil()` or the runtime may terminate the isolate before it completes
