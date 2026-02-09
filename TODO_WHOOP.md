# Whoop Integration - Implementation Plan

## Overview
Add Whoop health data integration with OAuth authentication (PKCE), bidirectional sync (manual + webhooks), and dedicated `/health` page with detailed views to display all captured Whoop metrics.

## Environment Variables (Infisical)

| Variable | Purpose |
|----------|---------|
| `WHOOP_CLIENT_ID` | Whoop OAuth client ID |
| `WHOOP_CLIENT_SECRET` | Whoop OAuth client secret |
| `WHOOP_API_URL` | Whoop API base URL (`https://api.prod.whoop.com`) |
| `WHOOP_WEBHOOK_SECRET` | Webhook signature verification secret |
| `WHOOP_TOKEN_ENCRYPTION_KEY` | 32-byte base64 key for AES-GCM token encryption at rest |

**Note**: Different domains for dev/staging/prod - webhook URL adapts to deployment environment.

## Database Schema

### `src/lib/db/schema.ts` - New Tables

**whoop_connections**
| Column | Type | Purpose |
|--------|------|---------|
| `workos_id` | TEXT PK | Links to users table |
| `access_token_encrypted` | TEXT | AES-GCM encrypted Whoop access token |
| `refresh_token_encrypted` | TEXT | AES-GCM encrypted Whoop refresh token |
| `token_expires_at` | TEXT | Token expiry time (ISO string) |
| `whoop_user_id` | TEXT | Whoop user ID from API |
| `scopes_granted` | TEXT | OAuth scopes granted (comma-separated) |
| `sync_status` | TEXT ('active', 'revoked', 'error') | Connection status |
| `sync_in_progress` | INTEGER (boolean) | Prevents concurrent syncs |
| `sync_started_at` | TEXT | When current sync started (stale lock detection) |
| `last_sync_at` | TEXT | Last successful sync |
| `created_at` | TEXT | Record creation |
| `updated_at` | TEXT | Record update |

**whoop_sleeps**
| Column | Type | Purpose |
|--------|------|---------|
| `id` | TEXT PK | Whoop sleep ID |
| `workos_id` | TEXT FK | User reference |
| `sleep_date` | TEXT | Date of sleep |
| `start_time` | TEXT | Sleep start (ISO timestamp) |
| `end_time` | TEXT | Sleep end (ISO timestamp) |
| `timezone_offset` | TEXT | Timezone offset |
| `is_nap` | INTEGER (boolean) | Nap vs main sleep |
| `cycle_id` | TEXT | Related cycle |
| `quality_score` | REAL | Sleep performance % |
| `need_base` | REAL | Hours |
| `need_strain` | REAL | Hours |
| `need_debt` | REAL | Hours |
| `in_bed_duration_ms` | INTEGER | |
| `awake_duration_ms` | INTEGER | |
| `asleep_duration_ms` | INTEGER | |
| `light_sleep_duration_ms` | INTEGER | |
| `rem_sleep_duration_ms` | INTEGER | |
| `slow_wave_sleep_duration_ms` | INTEGER | |
| `disruptions` | INTEGER | |
| `efficiency` | REAL | |
| `respiratory_rate` | REAL | |
| `raw_json` | TEXT | Full Whoop API response for this record |
| `whoop_created_at` | TEXT | Whoop's created timestamp |
| `whoop_updated_at` | TEXT | Whoop's updated timestamp |
| `created_at` | TEXT | Local ingestion time |
| `updated_at` | TEXT | Local update time |

**whoop_recoveries**
| Column | Type | Purpose |
|--------|------|---------|
| `id` | TEXT PK | Whoop recovery ID |
| `workos_id` | TEXT FK | User reference |
| `cycle_id` | TEXT | Related cycle |
| `date` | TEXT | Date |
| `score` | INTEGER | 0-100% |
| `status` | TEXT ('red', 'yellow', 'green') | Recovery status |
| `resting_heart_rate` | INTEGER | bpm |
| `hrv` | REAL | ms |
| `spo2` | REAL | % |
| `skin_temp` | REAL | celsius |
| `cardiovascular_load` | REAL | acute load |
| `musculoskeletal_load` | REAL | acute load |
| `raw_json` | TEXT | Full Whoop API response |
| `whoop_created_at` | TEXT | Whoop's created timestamp |
| `whoop_updated_at` | TEXT | Whoop's updated timestamp |
| `created_at` | TEXT | |
| `updated_at` | TEXT | |

**whoop_cycles**
| Column | Type | Purpose |
|--------|------|---------|
| `id` | TEXT PK | Whoop cycle ID |
| `workos_id` | TEXT FK | User reference |
| `date` | TEXT | Date |
| `start_time` | TEXT | Cycle start (ISO timestamp) |
| `end_time` | TEXT | Cycle end (ISO timestamp) |
| `score` | INTEGER | 0-100 strain score |
| `effort` | REAL | Perceived effort |
| `total_strain` | REAL | Cumulative strain |
| `average_heart_rate` | INTEGER | bpm |
| `max_heart_rate` | INTEGER | bpm |
| `calories_burned` | INTEGER | |
| `distance` | REAL | meters |
| `steps` | INTEGER | |
| `time_awake_ms` | INTEGER | |
| `zone1_ms` | INTEGER | Zone durations |
| `zone2_ms` | INTEGER | |
| `zone3_ms` | INTEGER | |
| `zone4_ms` | INTEGER | |
| `zone5_ms` | INTEGER | |
| `raw_json` | TEXT | Full Whoop API response |
| `whoop_created_at` | TEXT | Whoop's created timestamp |
| `whoop_updated_at` | TEXT | Whoop's updated timestamp |
| `created_at` | TEXT | |
| `updated_at` | TEXT | |

**whoop_workouts**
| Column | Type | Purpose |
|--------|------|---------|
| `id` | TEXT PK | Whoop workout ID |
| `workos_id` | TEXT FK | User reference |
| `name` | TEXT | Workout name |
| `sport_id` | INTEGER | Whoop sport ID |
| `sport_name` | TEXT | Sport name |
| `start_time` | TEXT | ISO timestamp |
| `end_time` | TEXT | ISO timestamp |
| `duration_ms` | INTEGER | |
| `strain` | REAL | |
| `average_heart_rate` | INTEGER | bpm |
| `max_heart_rate` | INTEGER | bpm |
| `calories` | INTEGER | |
| `distance` | REAL | |
| `zone1_ms` | INTEGER | |
| `zone2_ms` | INTEGER | |
| `zone3_ms` | INTEGER | |
| `zone4_ms` | INTEGER | |
| `zone5_ms` | INTEGER | |
| `raw_json` | TEXT | Full Whoop API response |
| `whoop_created_at` | TEXT | Whoop's created timestamp |
| `whoop_updated_at` | TEXT | Whoop's updated timestamp |
| `created_at` | TEXT | |
| `updated_at` | TEXT | |

**whoop_webhook_events** (idempotency + audit)
| Column | Type | Purpose |
|--------|------|---------|
| `id` | TEXT PK | Whoop event ID (unique, for dedup) |
| `workos_id` | TEXT | Mapped user (nullable until resolved) |
| `event_type` | TEXT | e.g. `daily.data.updated` |
| `payload_raw` | TEXT | Raw JSON payload |
| `received_at` | TEXT | When we received the webhook |
| `processed_at` | TEXT | When processing completed (null if pending) |
| `processing_error` | TEXT | Error message if processing failed |

### Indexes

| Index | Columns | Purpose |
|-------|---------|---------|
| `idx_whoop_sleeps_workos_date` | `(workos_id, sleep_date)` | Date range queries |
| `idx_whoop_sleeps_workos_start` | `(workos_id, start_time)` | Timeline queries |
| `idx_whoop_recoveries_workos_date` | `(workos_id, date)` | Date range queries |
| `idx_whoop_cycles_workos_date` | `(workos_id, date)` | Date range queries |
| `idx_whoop_cycles_workos_start` | `(workos_id, start_time)` | Timeline queries |
| `idx_whoop_workouts_workos_start` | `(workos_id, start_time)` | Timeline queries |
| `idx_whoop_webhook_events_type` | `(event_type)` | Event filtering |

## Security

### OAuth PKCE + State Parameter
- Use Authorization Code flow with PKCE (S256) even though we're a confidential client
- Generate `code_verifier` + `code_challenge` in `whoop.connect`
- Store `{state, code_verifier, workosId, createdAt}` in a short-lived HttpOnly, SameSite=Lax cookie
- Callback validates: state matches cookie, state not expired (10 min TTL), user still signed in and matches stored `workosId`

### Token Encryption at Rest
- Encrypt `access_token` and `refresh_token` using AES-GCM via WebCrypto (Workers-compatible)
- Store `{iv + ciphertext}` as a single base64 blob in D1
- Key stored as `WHOOP_TOKEN_ENCRYPTION_KEY` in Infisical
- D1 is not a secret store; encryption prevents exposure via DB dumps/logs/migrations

### CSRF Protection
- All mutating endpoints (`sync`, `disconnect`) are POST-only
- Enforce SameSite=Lax cookies + Origin/Referer header check on POST endpoints

## API Routes

Route naming follows existing codebase convention: dot-separated `.ts` files in `src/routes/api/`.

### OAuth Flow

**`src/routes/api/integrations.whoop.connect.ts`**
- GET endpoint (requires auth)
- Generates PKCE `code_verifier` + `code_challenge`
- Generates random `state` parameter
- Stores `{state, code_verifier, workosId}` in HttpOnly cookie (10 min expiry)
- Redirects to Whoop OAuth authorization URL with scopes + PKCE
- Tracks: `whoop_connect_initiated`

**`src/routes/api/integrations.whoop.callback.ts`**
- GET endpoint (requires auth)
- Validates `state` parameter against cookie (not expired, user matches)
- Exchanges authorization code for tokens using `code_verifier`
- Encrypts tokens before storage
- Stores connection in `whoop_connections`
- Clears state cookie
- Tracks: `whoop_connected`, `whoop_connect_failed`

### Sync

**`src/routes/api/integrations.whoop.sync.ts`**
- POST endpoint (requires auth)
- Acquires per-user sync lock (atomic update on `sync_in_progress` + `sync_started_at`)
- Stale lock detection: if lock held > 5 min, allow takeover
- Fetches data from Whoop API with lookback window (re-fetches last 7 days + new data since `last_sync_at`)
- Handles cursor-based pagination (loops until all pages exhausted)
- Upserts into D1 tables
- Updates `last_sync_at`, releases sync lock
- Tracks: `whoop_sync_started`, `whoop_sync_completed`, `whoop_sync_failed`

**`src/routes/api/integrations.whoop.status.ts`**
- GET endpoint (requires auth)
- Returns connection status, last sync time, sync in progress
- Response: `{ connected: boolean, lastSyncAt: string | null, syncInProgress: boolean }`

### Disconnect

**`src/routes/api/integrations.whoop.disconnect.ts`**
- POST endpoint (requires auth)
- Revokes Whoop tokens (API call)
- Deletes connection record from D1
- Tracks: `whoop_disconnected`

### Webhooks

**`src/routes/api/webhooks.whoop.ts`**
- POST endpoint (unauthenticated, signature-verified)
- Validates webhook signature using raw request body + `timingSafeEqual`
- Inserts event row into `whoop_webhook_events` (if duplicate ID, return 200 immediately)
- Processes sync via `ctx.waitUntil()` for background execution
- Returns 200 immediately after persisting event
- Handles events: `daily.data.updated`, `workout.completed`, `sleep.completed`

### Token Refresh (Internal Only)

Token refresh is handled internally by the Whoop API client — **not exposed as a public route**. The client automatically refreshes expired tokens during sync/webhook processing and updates encrypted tokens in D1.

## Library Layer

### `src/lib/whoop/`

**`index.ts`**
```typescript
export { WhoopApiClient } from './api';
export { whoopRepository } from './repository';
export { encryptToken, decryptToken } from './crypto';
export type { WhoopUser, WhoopSleep, WhoopRecovery, WhoopCycle, WhoopWorkout } from './types';
```

**`types.ts`**
- TypeScript interfaces matching Whoop API responses
- Sleep, Recovery, Cycle, Workout, User types
- API response pagination types (cursor-based)
- **Zod schemas for runtime validation** of all Whoop API responses (protects against API changes/malformed data)

**`crypto.ts`**
- `encryptToken(plaintext, key)` → base64 blob (iv + ciphertext)
- `decryptToken(blob, key)` → plaintext
- Uses AES-GCM via WebCrypto (Workers-compatible)

**`api.ts`**
- `WhoopApiClient` class
- Internal token refresh logic (not a public route)
- Cursor-based pagination: all list endpoints loop until `next_token` is null
- Endpoints:
  - `getUser()` → User info
  - `getCycles(startDate, endDate)` → Daily cycles (paginated)
  - `getSleeps(startDate, endDate)` → Sleep data (paginated)
  - `getRecoveries(startDate, endDate)` → Recovery data (paginated)
  - `getWorkouts(startDate, endDate)` → Workouts (paginated)
- Rate limiting: honor `429` status + `Retry-After` header, exponential backoff
- Error handling: `401` → mark connection as `revoked`, `429` → backoff, `5xx` → retry with limit
- Mapping functions: `mapWhoopSleepToDb()`, `mapWhoopCycleToDb()`, etc.

**`repository.ts`**
- `createConnection(workosId, encryptedTokens, whoopUserId)`
- `getConnection(workosId)`
- `updateTokens(workosId, encryptedAccessToken, encryptedRefreshToken, expiresAt)`
- `acquireSyncLock(workosId)` → boolean (atomic, with stale lock detection)
- `releaseSyncLock(workosId)`
- `deleteConnection(workosId)`
- `upsertSleep(workosId, sleepData)`
- `upsertRecovery(workosId, recoveryData)`
- `upsertCycle(workosId, cycleData)`
- `upsertWorkout(workosId, workoutData)`
- `getSleeps(workosId, startDate, endDate)`
- `getRecoveries(workosId, startDate, endDate)`
- `getCycles(workosId, startDate, endDate)`
- `getWorkouts(workosId, startDate, endDate)`
- `getLatestSyncDate(workosId)`
- `insertWebhookEvent(event)` → returns false if duplicate
- `markWebhookProcessed(eventId, error?)`

## Frontend

### Header Update

**`src/components/Header.tsx`**
- Add "Health" nav item between Theme toggle and Settings dropdown
- Link to `/health`
- Show badge/dot if Whoop connected and sync pending
- Conditionally render: only if user has Whoop connection

### Health Page

**`src/routes/health.tsx`**
- Route: `/health`
- Layout: Sticky header with connection status, tab navigation
- Tabs: Overview | Sleep | Recovery | Strain | Workouts

**`src/components/health/`**

- `HealthHeader.tsx`
  - Connection status indicator
  - "Connect Whoop" button (if not connected)
  - "Sync Now" button (if connected, shows spinner during sync)
  - Last synced timestamp

- `HealthOverview.tsx`
  - Today's recovery score (large, color-coded)
  - Today's strain score
  - Sleep summary (last night)
  - Weekly trends sparklines

- `SleepTab.tsx`
  - List of sleep sessions
  - Metrics: quality score, duration, debt, efficiency
  - Expandable details: stages breakdown, HRV, respiratory rate

- `RecoveryTab.tsx`
  - Calendar/grid view of recovery scores
  - Metrics: HRV, RHR, SPO2, skin temp
  - Strain vs Recovery correlation chart

- `StrainTab.tsx`
  - Daily strain scores chart
  - Time in heart rate zones
  - Calories, distance, steps

- `WorkoutsTab.tsx`
  - List of Whoop-tracked workouts
  - Metrics: strain, avg HR, max HR, calories
  - Duration, zone distribution

## Posthog Events

| Event | Properties |
|-------|------------|
| `whoop_connect_initiated` | `{ userId }` |
| `whoop_connected` | `{ userId }` |
| `whoop_connect_failed` | `{ userId, error }` |
| `whoop_disconnected` | `{ userId }` |
| `whoop_sync_started` | `{ userId }` |
| `whoop_sync_completed` | `{ userId, dataTypes, recordCount }` |
| `whoop_sync_failed` | `{ userId, error }` |
| `whoop_webhook_received` | `{ userId, eventType }` |
| `whoop_webhook_duplicate` | `{ eventId, eventType }` |
| `whoop_health_viewed` | `{ userId, tab }` |
| `whoop_metric_clicked` | `{ userId, metric, value }` |

## Implementation Order

### Phase 1: Foundation
1. [ ] Add Whoop tables + indexes to `src/lib/db/schema.ts` (including `whoop_webhook_events`)
2. [ ] Create `src/lib/whoop/` directory structure
3. [ ] Implement `crypto.ts` - AES-GCM token encryption/decryption via WebCrypto
4. [ ] Implement `types.ts` - Whoop API type definitions + Zod validation schemas
5. [ ] Implement `repository.ts` - Database operations (including sync lock + webhook event persistence)
6. [ ] Implement `api.ts` - Whoop API client with internal token refresh, pagination, rate limiting

### Phase 2: OAuth Flow
7. [ ] Create `src/routes/api/integrations.whoop.connect.ts` (PKCE + state cookie)
8. [ ] Create `src/routes/api/integrations.whoop.callback.ts` (state validation + token encryption)
9. [ ] Create `src/routes/api/integrations.whoop.status.ts`
10. [ ] Test OAuth flow in dev

### Phase 3: Sync Engine
11. [ ] Implement sync logic with lookback window + cursor pagination
12. [ ] Create `src/routes/api/integrations.whoop.sync.ts` (with sync lock)
13. [ ] Create `src/routes/api/webhooks.whoop.ts` (signature via raw body + timingSafeEqual, idempotency, ctx.waitUntil)
14. [ ] Create `src/routes/api/integrations.whoop.disconnect.ts`
15. [ ] Add Posthog tracking throughout

### Phase 4: Frontend
16. [ ] Add Health nav item to Header
17. [ ] Create `src/routes/health.tsx` layout
18. [ ] Create `HealthHeader.tsx` component
19. [ ] Create `HealthOverview.tsx` component
20. [ ] Create detailed tab components (SleepTab, RecoveryTab, StrainTab, WorkoutsTab)

### Phase 5: Testing
21. [ ] Unit tests: token encryption/decryption roundtrip
22. [ ] Unit tests: PKCE generation + state cookie handling
23. [ ] Unit tests: webhook signature verification (known secret + payload)
24. [ ] Unit tests: pagination loop (mock multi-page responses)
25. [ ] Unit tests: Zod validation of Whoop API responses
26. [ ] Integration tests: sync handles 401 → marks connection revoked
27. [ ] Integration tests: sync handles 429 → backoff/retry
28. [ ] Integration tests: concurrent sync lock prevents double-sync
29. [ ] E2E: connect button initiates redirect (stubbed Whoop endpoints)
30. [ ] E2E: sync button triggers data fetch + UI update
31. [ ] E2E: disconnect clears connection

## Webhook Configuration

**Events to subscribe:**
- `daily.data.updated` - New daily metrics
- `workout.completed` - Workout finished
- `sleep.completed` - Sleep session completed

**Endpoint:** `POST /api/webhooks/whoop`
**Validation:** HMAC SHA-256 signature using `WHOOP_WEBHOOK_SECRET` with raw request body + `timingSafeEqual`

**Idempotency:** Insert event ID into `whoop_webhook_events` before processing. If duplicate (unique constraint conflict), return 200 immediately without reprocessing.

**Background processing:** Use `ctx.waitUntil()` to process sync after returning 200. Event is persisted first so crashes don't lose data.

## Sync Strategy

- **Lookback window**: Always re-fetch the last 7 days of data on each sync, plus any new data since `last_sync_at`. This handles Whoop backfilling/updating past records.
- **Pagination**: All list endpoints return paginated results. Loop until `next_token` is null.
- **Concurrency**: Per-user sync lock via atomic D1 update on `sync_in_progress`. Stale locks (> 5 min) can be taken over.
- **Rate limiting**: Honor `429` + `Retry-After`, exponential backoff, max 3 retries per request.
- **Error recovery**: `401` → mark connection `revoked` (token invalid), `5xx` → retry with backoff.

## Important Notes

- **No historical backfill on connect**: Start fresh, user must manually sync
- **No offline access**: Health data requires online connection
- **No data retention limits**: Store all available historical data
- **Detailed view only**: Skip summary-only approach, go straight to full detailed views
- **Domain-aware webhooks**: URL adapts to deployment environment (dev/staging/prod)
- **Token refresh is internal**: No public refresh endpoint — handled by API client during sync/webhook processing
- **Raw JSON stored**: Each entity stores its full Whoop API response for debugging and future-proofing against schema drift

## Whoop API Reference

### OAuth URLs
| Purpose | URL |
|---------|-----|
| Authorization | `https://api.prod.whoop.com/oauth/oauth2/auth` |
| Token | `https://api.prod.whoop.com/oauth/oauth2/token` |

### Endpoints to Implement (v2 API)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/developer/v2/user/profile/basic` | Get authenticated user profile |
| GET | `/developer/v2/cycle` | Get daily cycles (strain) |
| GET | `/developer/v2/recovery` | Get recovery data |
| GET | `/developer/v2/activity/sleep` | Get sleep data |
| GET | `/developer/v2/activity/workout` | Get workouts |
| DELETE | `/developer/v2/user/access` | Revoke OAuth access |

### OAuth Scopes
```
read:recovery
read:cycles
read:sleeps
read:workout
offline
```

## Success Criteria

- [ ] User can connect Whoop account via OAuth (PKCE + state validation)
- [ ] Tokens encrypted at rest in D1
- [ ] User can disconnect Whoop account
- [ ] Manual sync fetches all new data (with 7-day lookback)
- [ ] Sync handles pagination, rate limiting, and error recovery
- [ ] Concurrent syncs prevented by per-user lock
- [ ] Webhooks validated via HMAC + timingSafeEqual on raw body
- [ ] Webhook deduplication via event ID
- [ ] All Whoop data stored in D1 (with raw JSON)
- [ ] Health page displays all metrics in detailed view
- [ ] Posthog tracks all connection/sync events
- [ ] Health nav item appears in header when connected
- [ ] Automated tests cover crypto, signatures, pagination, error handling
