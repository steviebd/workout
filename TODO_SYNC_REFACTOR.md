# Sync Engine Refactor Plan

**Priority:** Critical - must complete before production use  
**Estimated Effort:** 1-2 days

## Current State

The offline-first sync architecture has fundamental bugs that prevent reliable data synchronization.

---

## Phase 1: Critical Fixes (Day 1)

### 1.1 Fix Entity Coverage for Child Entities

**Problem:** `workout_exercise` and `workout_set` are not mapped in sync engine.

**Files:** `src/lib/sync/sync-engine.ts`

```typescript
// Current (broken)
private getTableName(entity: string): TableType | null {
  const tableMap: Record<string, TableType> = {
    exercise: 'exercises',
    template: 'templates',
    workout: 'workouts',
  };
  return tableMap[entity] ?? null;
}

// Fixed
type TableType = 'exercises' | 'templates' | 'workouts' | 'workoutExercises' | 'workoutSets';

private getTableName(entity: string): TableType | null {
  const tableMap: Record<string, TableType> = {
    exercise: 'exercises',
    template: 'templates',
    workout: 'workouts',
    workout_exercise: 'workoutExercises',
    workout_set: 'workoutSets',
  };
  return tableMap[entity] ?? null;
}

private getTable(tableName: TableType) {
  const tables = {
    exercises: localDB.exercises,
    templates: localDB.templates,
    workouts: localDB.workouts,
    workoutExercises: localDB.workoutExercises,
    workoutSets: localDB.workoutSets,
  };
  return tables[tableName];
}
```

---

### 1.2 Fix Broken URL Construction

**Problem:** URLs use undefined fields and local IDs instead of server IDs.

**File:** `src/lib/sync/sync-engine.ts` - `executeOperation()`

**Current bugs:**
- `workout_set`: Uses `op.data.setId` which doesn't exist → `/api/workouts/sets/undefined`
- `workout_exercise`: Uses `op.data.workoutId` which is localId, not serverId

**Solution:** Use localId in body, let server resolve via upsert pattern:

```typescript
async executeOperation(op: OfflineOperation): Promise<boolean> {
  // For all operations, include localId in body
  // Server should upsert by (workosId, localId)
  
  const baseUrls: Record<string, string> = {
    exercise: '/api/exercises',
    template: '/api/templates',
    workout: '/api/workouts',
    workout_exercise: '/api/workout-exercises',
    workout_set: '/api/workout-sets',
  };
  
  const url = baseUrls[op.entity];
  if (!url) return false;
  
  // Always include localId for server to resolve
  const body = { ...op.data, localId: op.localId };
  
  // ... rest of fetch logic
}
```

---

### 1.3 Mark Entities Synced on Update/Delete Success

**Problem:** Only `create` calls `storeServerId()`. Updates/deletes leave entities as `pending` forever.

**File:** `src/lib/sync/sync-engine.ts` - `executeOperation()`

```typescript
// After successful update or delete:
if (op.type === 'update') {
  await this.markEntitySynced(op.entity, op.localId);
}

if (op.type === 'delete') {
  await this.removeLocalEntity(op.entity, op.localId);
}

private async markEntitySynced(entity: string, localId: string): Promise<void> {
  const tableName = this.getTableName(entity);
  if (!tableName) return;
  
  const table = this.getTable(tableName);
  const item = await table.where('localId').equals(localId).first();
  if (item?.id !== undefined) {
    await table.update(item.id, {
      syncStatus: 'synced',
      needsSync: false,
    });
  }
}

private async removeLocalEntity(entity: string, localId: string): Promise<void> {
  const tableName = this.getTableName(entity);
  if (!tableName) return;
  
  const table = this.getTable(tableName);
  await table.where('localId').equals(localId).delete();
}
```

---

### 1.4 Fix Retry Logic (No Infinite Loop)

**Problem:** Operations retry forever, never reach terminal failed state.

**File:** `src/lib/sync/sync-engine.ts`

```typescript
private async pushPendingOperations(_workosId: string, result: SyncResult): Promise<void> {
  const operations = await getPendingOperations();

  for (const op of operations) {
    if (op.id === undefined) {
      result.errors++;
      continue;
    }
    
    // Skip operations that have exhausted retries
    if (op.retryCount >= op.maxRetries) {
      result.errors++;
      continue; // Don't attempt, just count as error
    }
    
    try {
      const success = await this.executeOperation(op);
      if (success) {
        await removeOperation(op.id);
        result.pushed++;
      } else {
        await incrementRetry(op.id);
        // Only count as error if this was the last retry
        if (op.retryCount + 1 >= op.maxRetries) {
          result.errors++;
        }
      }
    } catch (error) {
      console.error(`Failed to execute operation ${op.operationId}:`, error);
      await incrementRetry(op.id);
      if (op.retryCount + 1 >= op.maxRetries) {
        result.errors++;
      }
    }
  }
}
```

---

## Phase 2: Pull Sync Fixes (Day 1-2)

### 2.1 Fix Pull to Actually Insert Missing Data

**Problem:** `mergeEntity()` returns early if local item doesn't exist.

**File:** `src/lib/sync/sync-engine.ts`

```typescript
async mergeEntity(
  tableName: TableType,
  serverData: ServerEntity & Record<string, unknown>
): Promise<void> {
  const table = this.getTable(tableName);

  const searchId = serverData.localId ?? serverData.id;
  const localItem = await table.where('localId').equals(searchId).first();

  if (!localItem) {
    // INSERT new entity from server
    await table.add({
      ...serverData,
      localId: searchId,
      serverId: serverData.id,
      serverUpdatedAt: new Date(serverData.updatedAt),
      syncStatus: 'synced',
      needsSync: false,
    });
    return;
  }

  // Only update if server is newer AND local has no pending changes
  if (localItem.needsSync) {
    // Local has pending changes - skip (or implement conflict resolution)
    return;
  }

  const serverUpdatedAt = new Date(serverData.updatedAt).getTime();
  const localUpdatedAt = localItem.serverUpdatedAt?.getTime() ?? 0;

  if (serverUpdatedAt > localUpdatedAt && localItem.id !== undefined) {
    // Apply server data to local
    await table.update(localItem.id, {
      ...serverData,
      serverId: serverData.id,
      serverUpdatedAt: new Date(serverData.updatedAt),
      syncStatus: 'synced',
      needsSync: false,
    });
  }
}
```

---

### 2.2 Expand /api/sync to Include All Entities

**Problem:** Missing workout_exercises, workout_sets, template_exercises.

**File:** `src/routes/api/sync.ts`

Add to response:
- `workoutExercises` - with filter by user's workouts
- `workoutSets` - with filter by user's workout exercises
- `templateExercises` - with filter by user's templates

Also:
- Support `?since=` query param for incremental sync
- Return `lastSync` timestamp from server

---

### 2.3 Handle Deletions (Tombstones)

**Problem:** Server has `isDeleted` but client ignores it.

**Options:**
1. **Simple:** Client deletes local row when server says `isDeleted: true`
2. **Better:** Add `isDeleted` to local schema for consistency

```typescript
// In mergeEntity()
if (serverData.isDeleted) {
  const localItem = await table.where('localId').equals(searchId).first();
  if (localItem?.id !== undefined) {
    await table.delete(localItem.id);
  }
  return;
}
```

---

## Phase 3: Dependency Ordering (Day 2)

### 3.1 Sort Operations by Entity Type Before Push

Workouts must sync before workout_exercises, which must sync before workout_sets.

```typescript
private async pushPendingOperations(workosId: string, result: SyncResult): Promise<void> {
  const operations = await getPendingOperations();
  
  // Sort by entity priority
  const priority: Record<string, number> = {
    exercise: 0,
    template: 1,
    workout: 2,
    workout_exercise: 3,
    workout_set: 4,
  };
  
  operations.sort((a, b) => {
    const aPriority = priority[a.entity] ?? 99;
    const bPriority = priority[b.entity] ?? 99;
    if (aPriority !== bPriority) return aPriority - bPriority;
    return a.timestamp.getTime() - b.timestamp.getTime();
  });
  
  // ... process in order
}
```

---

### 3.2 Translate Local IDs to Server IDs Before Push

When pushing `workout_exercise`, look up server IDs for:
- `workoutId` → find workout by localId, use serverId
- `exerciseId` → find exercise by localId, use serverId

```typescript
private async resolveServerIds(op: OfflineOperation): Promise<Record<string, unknown>> {
  const data = { ...op.data };
  
  if (op.entity === 'workout_exercise') {
    const workout = await localDB.workouts.where('localId').equals(data.workoutId as string).first();
    const exercise = await localDB.exercises.where('localId').equals(data.exerciseId as string).first();
    data.workoutId = workout?.serverId ?? data.workoutId;
    data.exerciseId = exercise?.serverId ?? data.exerciseId;
  }
  
  if (op.entity === 'workout_set') {
    const we = await localDB.workoutExercises.where('localId').equals(data.workoutExerciseId as string).first();
    data.workoutExerciseId = we?.serverId ?? data.workoutExerciseId;
  }
  
  return data;
}
```

---

## Testing Checklist

- [ ] Create exercise offline → comes online → exercise synced to server
- [ ] Create workout with exercises and sets offline → all sync correctly
- [ ] Edit exercise offline → syncs and marked as synced
- [ ] Delete exercise offline → syncs and removed from local DB
- [ ] Login on new device → all data pulls from server
- [ ] Edit same item on two devices → conflict resolution works
- [ ] Failed sync retries correctly → stops after max retries
- [ ] Sync in progress → second sync call waits/returns same result

---

## Server API Changes Required

### New Endpoints Needed

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/workout-exercises` | POST/PUT/DELETE | CRUD for workout exercises |
| `/api/workout-sets` | POST/PUT/DELETE | CRUD for workout sets |

### Existing Endpoint Updates

| Endpoint | Change |
|----------|--------|
| `/api/sync` | Add `since` param, include all entity types |
| All CRUD endpoints | Accept `localId` in body, return `id` + `updatedAt` |

---

## Alternative: Simplified Upsert Pattern

Instead of separate create/update endpoints, use a single upsert pattern:

```typescript
// Server endpoint
POST /api/sync/push
Body: { operations: OfflineOperation[] }
Response: { 
  results: Array<{ localId: string; serverId: string; updatedAt: string }>,
  errors: Array<{ localId: string; error: string }>
}
```

This allows:
- Batch push in single request
- Server handles ordering/dependencies
- Atomic success/failure per batch
- Simpler client logic

---

## Files to Modify

1. `src/lib/sync/sync-engine.ts` - Main sync logic fixes
2. `src/lib/db/local-db.ts` - Add `isDeleted` to local types if needed
3. `src/lib/db/local-repository.ts` - Update delete logic
4. `src/routes/api/sync.ts` - Expand to include all entities
5. `src/routes/api/workout-exercises.ts` - New endpoint (create)
6. `src/routes/api/workout-sets.ts` - New endpoint (create)
7. `tests/unit/sync-engine.spec.ts` - Update tests for new behavior
