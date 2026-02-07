# Offline-First Architecture

## Data Flow
1. Client creates data → stored in IndexedDB (Dexie)
2. Data marked as `syncStatus: 'pending'`
3. When online → sync to remote D1
4. Conflict resolution → uses last-write-wins with timestamp

## Key Files
- `src/lib/db/local-db.ts` - IndexedDB wrapper and schema
- `src/lib/db/local-repository.ts` - Offline CRUD operations
- `src/lib/sync/sync-engine.ts` - Sync logic and conflict resolution

## Important Patterns
- Never write directly to D1 when offline
- Always check `syncStatus` before operations
- Use `localId` for offline records, `id` for synced records
