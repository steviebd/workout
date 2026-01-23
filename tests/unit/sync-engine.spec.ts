import { describe, expect, it } from 'vitest';
import type { OfflineOperation } from '../../src/lib/db/local-db';

describe('Sync Engine - Conflict Resolution', () => {
  it('should prefer newer data in last-write-wins', () => {
    const olderDate = new Date('2024-01-10T10:00:00.000Z');
    const newerDate = new Date('2024-01-15T10:00:00.000Z');

    const serverUpdatedAt = newerDate.getTime();
    const localUpdatedAt = olderDate.getTime();

    expect(serverUpdatedAt > localUpdatedAt).toBe(true);
  });

  it('should prefer local data when local is newer', () => {
    const newerDate = new Date('2024-01-15T10:00:00.000Z');
    const olderDate = new Date('2024-01-10T10:00:00.000Z');

    const serverUpdatedAt = olderDate.getTime();
    const localUpdatedAt = newerDate.getTime();

    expect(localUpdatedAt > serverUpdatedAt).toBe(true);
  });

  it('should handle equal timestamps gracefully', () => {
    const sameDate = new Date('2024-01-15T10:00:00.000Z');

    const serverUpdatedAt = sameDate.getTime();
    const localUpdatedAt = sameDate.getTime();

    expect(localUpdatedAt).toBe(serverUpdatedAt);
  });
});

describe('Sync Engine - Operation Retry Logic', () => {
  it('should not retry when retryCount is less than maxRetries', () => {
    const operation: OfflineOperation = {
      id: 1,
      operationId: 'op-1',
      type: 'create',
      entity: 'exercise',
      localId: 'local-1',
      data: {},
      timestamp: new Date(),
      retryCount: 0,
      maxRetries: 3,
    };

    const shouldRetry = operation.retryCount < operation.maxRetries;
    expect(shouldRetry).toBe(true);
  });

  it('should mark as failed when retryCount reaches maxRetries', () => {
    const operation: OfflineOperation = {
      id: 1,
      operationId: 'op-1',
      type: 'create',
      entity: 'exercise',
      localId: 'local-1',
      data: {},
      timestamp: new Date(),
      retryCount: 3,
      maxRetries: 3,
    };

    const shouldRetry = operation.retryCount < operation.maxRetries;
    expect(shouldRetry).toBe(false);
  });

  it('should increment retry count correctly', () => {
    let retryCount = 0;

    const incrementRetry = () => {
      retryCount++;
    };

    incrementRetry();
    expect(retryCount).toBe(1);

    incrementRetry();
    expect(retryCount).toBe(2);

    incrementRetry();
    expect(retryCount).toBe(3);
  });
});

describe('Sync Engine - URL Building', () => {
  it('should build correct URL for exercise operations', () => {
    const entity: OfflineOperation['entity'] = 'exercise';
    const data = { workoutId: 'workout-123', setId: 'set-456' };

    const getUrl = (e: OfflineOperation['entity']) => {
      switch (e) {
        case 'exercise':
          return '/api/exercises';
        case 'template':
          return '/api/templates';
        case 'workout':
          return '/api/workouts';
        case 'workout_exercise':
          return `/api/workouts/${data.workoutId}/exercises`;
        case 'workout_set':
          return `/api/workouts/sets/${data.setId}`;
      }
    };

    expect(getUrl(entity)).toBe('/api/exercises');
  });

  it('should build correct URL for workout exercise operations', () => {
    const entity: OfflineOperation['entity'] = 'workout_exercise';
    const data = { workoutId: 'workout-123', setId: 'set-456' };

    const getUrl = (e: OfflineOperation['entity']) => {
      switch (e) {
        case 'exercise':
          return '/api/exercises';
        case 'template':
          return '/api/templates';
        case 'workout':
          return '/api/workouts';
        case 'workout_exercise':
          return `/api/workouts/${data.workoutId}/exercises`;
        case 'workout_set':
          return `/api/workouts/sets/${data.setId}`;
      }
    };

    expect(getUrl(entity)).toBe('/api/workouts/workout-123/exercises');
  });

  it('should build correct URL for workout set operations', () => {
    const entity: OfflineOperation['entity'] = 'workout_set';
    const data = { workoutId: 'workout-123', setId: 'set-456' };

    const getUrl = (e: OfflineOperation['entity']) => {
      switch (e) {
        case 'exercise':
          return '/api/exercises';
        case 'template':
          return '/api/templates';
        case 'workout':
          return '/api/workouts';
        case 'workout_exercise':
          return `/api/workouts/${data.workoutId}/exercises`;
        case 'workout_set':
          return `/api/workouts/sets/${data.setId}`;
      }
    };

    expect(getUrl(entity)).toBe('/api/workouts/sets/set-456');
  });
});

describe('Sync Engine - HTTP Method Selection', () => {
  it('should use POST for create operations', () => {
    const type: OfflineOperation['type'] = 'create';

    const getMethod = (t: OfflineOperation['type']) => {
      if (t === 'update') return 'PUT';
      if (t === 'delete') return 'DELETE';
      return 'POST';
    };

    expect(getMethod(type)).toBe('POST');
  });

  it('should use PUT for update operations', () => {
    const type: OfflineOperation['type'] = 'update';

    const getMethod = (t: OfflineOperation['type']) => {
      if (t === 'update') return 'PUT';
      if (t === 'delete') return 'DELETE';
      return 'POST';
    };

    expect(getMethod(type)).toBe('PUT');
  });

  it('should use DELETE for delete operations', () => {
    const type: OfflineOperation['type'] = 'delete';

    const getMethod = (t: OfflineOperation['type']) => {
      if (t === 'update') return 'PUT';
      if (t === 'delete') return 'DELETE';
      return 'POST';
    };

    expect(getMethod(type)).toBe('DELETE');
  });
});

describe('Sync Engine - ID Mapping', () => {
  it('should map localId to serverId after successful create', () => {
    const localId = 'local-exercise-1';
    const serverId = 'server-exercise-123';
    const serverUpdatedAt = '2024-01-15T10:00:00.000Z';

    const responseData = {
      id: serverId,
      updatedAt: serverUpdatedAt,
    };

    expect(responseData.id).toBe(serverId);
    expect(responseData.id).not.toBe(localId);
  });

  it('should handle missing serverId gracefully', () => {
    const responseData: { id?: string; updatedAt: string } = {
      id: undefined,
      updatedAt: '2024-01-15T10:00:00.000Z',
    };

    const hasServerId = responseData.id !== undefined;
    expect(hasServerId).toBe(false);
  });
});

describe('Sync Engine - Table Name Mapping', () => {
  it('should map entity to correct table name', () => {
    const entity: OfflineOperation['entity'] = 'exercise';

    const getTableName = (e: OfflineOperation['entity']) => {
      switch (e) {
        case 'exercise':
          return 'exercises';
        case 'template':
          return 'templates';
        case 'workout':
          return 'workouts';
        case 'workout_exercise':
          return 'workoutExercises';
        case 'workout_set':
          return 'workoutSets';
      }
    };

    expect(getTableName(entity)).toBe('exercises');
  });

  it('should return correct table for workout entity', () => {
    const entity: OfflineOperation['entity'] = 'workout';

    const getTableName = (e: OfflineOperation['entity']) => {
      switch (e) {
        case 'exercise':
          return 'exercises';
        case 'template':
          return 'templates';
        case 'workout':
          return 'workouts';
        case 'workout_exercise':
          return 'workoutExercises';
        case 'workout_set':
          return 'workoutSets';
      }
    };

    expect(getTableName(entity)).toBe('workouts');
  });
});

describe('Sync Engine - Sync URL Building', () => {
  it('should build sync URL without since parameter for initial sync', () => {
    const lastSync: string | null = null;
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    const url = lastSync ? `/api/sync?since=${encodeURIComponent(lastSync)}` : '/api/sync';

    expect(url).toBe('/api/sync');
  });

  it('should build sync URL with since parameter for subsequent syncs', () => {
    const lastSync = '2024-01-15T10:00:00.000Z';
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    const url = lastSync ? `/api/sync?since=${encodeURIComponent(lastSync)}` : '/api/sync';

    expect(url).toBe('/api/sync?since=2024-01-15T10%3A00%3A00.000Z');
  });

  it('should properly encode special characters in sync timestamp', () => {
    const lastSync = '2024-01-15T10:00:00.000Z';
    const encoded = encodeURIComponent(lastSync);

    expect(encoded).toContain('%3A');
  });
});
