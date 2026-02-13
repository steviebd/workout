# Whoop Sync Fixes

## Issues

### 1. Limited 30-Day Window
**Location:** `src/routes/api/integrations.whoop.sync.ts:38`

The sync only pulls the last 30 days of data. Users with extensive history won't get their full data on first sync.

```typescript
const startDate = formatDate(addDays(now, -30));
```

### 2. Pagination Limit is Conservative
**Location:** `src/lib/whoop/api.ts:171,199,227,255`

The code hardcodes 25 items per page. Increasing to 50 reduces API calls.

```typescript
limit: '25',  // Change to '50'
```

### 3. No Initial Full Sync Option
There's no way to trigger a full historical sync. The sync should detect when it's the first sync and pull all available data.

## Fixes

### Fix 1: Increase pagination limit

In `src/lib/whoop/api.ts`, change all pagination methods:

```typescript
// getCyclesWithPagination (line 171)
limit: '50',

// getSleepsWithPagination (line 199)
limit: '50',

// getRecoveriesWithPagination (line 227)
limit: '50',

// getWorkoutsWithPagination (line 255)
limit: '50',
```

### Fix 2: Add full history sync capability

Modify `src/routes/api/integrations.whoop.sync.ts`:

1. Add `forceFullSync` query parameter
2. Check `lastSyncAt` - if null, fetch all available data
3. Use a far-past date (e.g., 2015-01-01) for initial sync

```typescript
// In POST handler, extract query params
const url = new URL(request.url);
const forceFullSync = url.searchParams.get('forceFullSync') === 'true';

// Determine start date
const startDate = forceFullSync
  ? '2015-01-01T00:00:00Z'
  : lastSyncAt 
    ? lastSyncAt 
    : formatDate(addDays(now, -30));
```

### Fix 3: Fetch user's account creation date (optional)

For a more precise initial sync, fetch the user's oldest cycle/sleep to determine the actual start date:

```typescript
async getAccountStartDate(): Promise<string> {
  // Fetch oldest cycle to get account creation date
  const response = await this.fetchWithAuth('/developer/v2/cycle?limit=1&sort=asc');
  return response.records[0]?.start || '2015-01-01T00:00:00Z';
}
```

## Testing

After implementing fixes:
1. Test with `?forceFullSync=true` to pull all history
2. Verify pagination works correctly with new limit
3. Ensure subsequent syncs only pull new data

## Notes

- Whoop API documentation: https://developer.whoop.com
- Rate limit handling (429) already implemented in `fetchWithAuth`
- Lock mechanism prevents concurrent syncs
