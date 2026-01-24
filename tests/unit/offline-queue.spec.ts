import { describe, expect, it, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { localDB } from '../../src/lib/db/local-db';
import {
  getPendingOperations,
  removeOperation,
  incrementRetry,
  queueOperationOp,
} from '../../src/lib/db/local-repository';

describe('Offline Queue Operations', () => {
  beforeEach(async () => {
    await localDB.offlineQueue.clear();
  });

  describe('queueOperationOp', () => {
    it('should add operation to queue with correct fields', async () => {
      await queueOperationOp('create', 'exercise', 'local-1', { name: 'Test' });

      const ops = await getPendingOperations();
      expect(ops).toHaveLength(1);
      expect(ops[0]?.type).toBe('create');
      expect(ops[0]?.entity).toBe('exercise');
      expect(ops[0]?.localId).toBe('local-1');
      expect(ops[0]?.retryCount).toBe(0);
      expect(ops[0]?.maxRetries).toBe(3);
      expect(ops[0]?.operationId).toMatch(/^[0-9a-f-]{36}$/);
    });

    it('should support all operation types', async () => {
      await queueOperationOp('create', 'exercise', 'local-1', {});
      await queueOperationOp('update', 'exercise', 'local-2', {});
      await queueOperationOp('delete', 'exercise', 'local-3', {});

      const ops = await getPendingOperations();
      expect(ops).toHaveLength(3);
      expect(ops.map(op => op.type)).toEqual(['create', 'update', 'delete']);
    });

    it('should support all entity types', async () => {
      await queueOperationOp('create', 'exercise', 'local-1', {});
      await queueOperationOp('create', 'template', 'local-2', {});
      await queueOperationOp('create', 'workout', 'local-3', {});
      await queueOperationOp('create', 'workout_exercise', 'local-4', {});
      await queueOperationOp('create', 'workout_set', 'local-5', {});

      const ops = await getPendingOperations();
      expect(ops).toHaveLength(5);
      expect(ops.map(op => op.entity)).toEqual([
        'exercise', 'template', 'workout', 'workout_exercise', 'workout_set'
      ]);
    });

    it('should store data payload correctly', async () => {
      const data = { name: 'Bench Press', muscleGroup: 'Chest', weight: 225 };
      await queueOperationOp('create', 'exercise', 'local-1', data);

      const ops = await getPendingOperations();
      expect(ops[0]?.data).toEqual(data);
    });

    it('should generate unique operationId for each operation', async () => {
      await queueOperationOp('create', 'exercise', 'local-1', {});
      await queueOperationOp('create', 'exercise', 'local-2', {});

      const ops = await getPendingOperations();
      expect(ops[0]?.operationId).not.toBe(ops[1]?.operationId);
    });

    it('should set timestamp to current time', async () => {
      const before = new Date();
      await queueOperationOp('create', 'exercise', 'local-1', {});
      const after = new Date();

      const ops = await getPendingOperations();
      expect(ops[0]?.timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(ops[0]?.timestamp.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('should add multiple operations to queue', async () => {
      for (let i = 1; i <= 10; i++) {
        await queueOperationOp('create', 'exercise', `local-${i}`, { index: i });
      }

      const ops = await getPendingOperations();
      expect(ops).toHaveLength(10);
    });
  });

  describe('getPendingOperations', () => {
    it('should return operations ordered by timestamp', async () => {
      await queueOperationOp('create', 'exercise', 'local-1', {});
      await new Promise<void>((resolve) => { setTimeout(resolve, 10); });
      await queueOperationOp('create', 'exercise', 'local-2', {});
      await new Promise<void>((resolve) => { setTimeout(resolve, 10); });
      await queueOperationOp('create', 'exercise', 'local-3', {});

      const ops = await getPendingOperations();
      expect(ops[0]?.localId).toBe('local-1');
      expect(ops[1]?.localId).toBe('local-2');
      expect(ops[2]?.localId).toBe('local-3');
    });

    it('should return empty array when queue is empty', async () => {
      const ops = await getPendingOperations();
      expect(ops).toHaveLength(0);
    });

    it('should return all pending operations', async () => {
      await queueOperationOp('create', 'exercise', 'local-1', {});
      await queueOperationOp('update', 'template', 'local-2', {});
      await queueOperationOp('delete', 'workout', 'local-3', {});

      const ops = await getPendingOperations();
      expect(ops).toHaveLength(3);
    });

    it('should return operations with all fields populated', async () => {
      await queueOperationOp('create', 'exercise', 'local-1', { name: 'Test' });

      const ops = await getPendingOperations();
      expect(ops[0]?.id).toBeDefined();
      expect(ops[0]?.operationId).toBeDefined();
      expect(ops[0]?.type).toBeDefined();
      expect(ops[0]?.entity).toBeDefined();
      expect(ops[0]?.localId).toBeDefined();
      expect(ops[0]?.data).toBeDefined();
      expect(ops[0]?.timestamp).toBeDefined();
      expect(ops[0]?.retryCount).toBeDefined();
      expect(ops[0]?.maxRetries).toBeDefined();
    });
  });

  describe('removeOperation', () => {
    it('should remove operation from queue', async () => {
      await queueOperationOp('create', 'exercise', 'local-1', {});
      const ops = await getPendingOperations();
      expect(ops).toHaveLength(1);

      const opId = ops[0]?.id;
      if (opId !== undefined) {
        await removeOperation(opId);
      }

      const remainingOps = await getPendingOperations();
      expect(remainingOps).toHaveLength(0);
    });

    it('should remove specific operation while keeping others', async () => {
      await queueOperationOp('create', 'exercise', 'local-1', {});
      await queueOperationOp('create', 'exercise', 'local-2', {});
      await queueOperationOp('create', 'exercise', 'local-3', {});

      const ops = await getPendingOperations();
      const opId = ops[1]?.id;
      if (opId !== undefined) {
        await removeOperation(opId);
      }

      const remainingOps = await getPendingOperations();
      expect(remainingOps).toHaveLength(2);
      expect(remainingOps.map(op => op.localId)).toEqual(['local-1', 'local-3']);
    });

    it('should not affect other operations when removing non-existent id', async () => {
      await queueOperationOp('create', 'exercise', 'local-1', {});
      await queueOperationOp('create', 'exercise', 'local-2', {});

      await removeOperation(99999);

      const ops = await getPendingOperations();
      expect(ops).toHaveLength(2);
    });

    it('should not throw when removing non-existent operation', async () => {
      await queueOperationOp('create', 'exercise', 'local-1', {});
      
      await expect(removeOperation(99999)).resolves.not.toThrow();
    });

    it('should remove operation and allow adding new ones', async () => {
      await queueOperationOp('create', 'exercise', 'local-1', {});
      const ops = await getPendingOperations();
      const opId = ops[0]?.id;
      if (opId !== undefined) {
        await removeOperation(opId);
      }

      await queueOperationOp('create', 'exercise', 'local-2', {});
      const newOps = await getPendingOperations();
      expect(newOps).toHaveLength(1);
      expect(newOps[0]?.localId).toBe('local-2');
    });
  });

  describe('incrementRetry', () => {
    it('should increment retryCount', async () => {
      await queueOperationOp('create', 'exercise', 'local-1', {});
      const ops = await getPendingOperations();
      expect(ops[0]?.retryCount).toBe(0);

      const opId = ops[0]?.id;
      if (opId !== undefined) {
        await incrementRetry(opId);
      }

      const updatedOps = await getPendingOperations();
      expect(updatedOps[0]?.retryCount).toBe(1);
    });

    it('should increment retryCount multiple times', async () => {
      await queueOperationOp('create', 'exercise', 'local-1', {});
      const ops = await getPendingOperations();
      const opId = ops[0]?.id;

      if (opId !== undefined) {
        await incrementRetry(opId);
        await incrementRetry(opId);
        await incrementRetry(opId);
      }

      const updatedOps = await getPendingOperations();
      expect(updatedOps[0]?.retryCount).toBe(3);
    });

    it('should not affect other operations when incrementing', async () => {
      await queueOperationOp('create', 'exercise', 'local-1', {});
      await queueOperationOp('create', 'exercise', 'local-2', {});
      
      const ops = await getPendingOperations();
      const opId = ops[0]?.id;
      if (opId !== undefined) {
        await incrementRetry(opId);
      }

      const updatedOps = await getPendingOperations();
      expect(updatedOps[0]?.retryCount).toBe(1);
      expect(updatedOps[1]?.retryCount).toBe(0);
    });

    it('should not throw when incrementing non-existent operation', async () => {
      await expect(incrementRetry(99999)).resolves.not.toThrow();
    });

    it('should preserve other fields when incrementing retry', async () => {
      await queueOperationOp('create', 'exercise', 'local-1', { name: 'Test' });
      const ops = await getPendingOperations();
      const originalId = ops[0]?.id;
      const originalOperationId = ops[0]?.operationId;
      const originalData = ops[0]?.data;
      const opId = ops[0]?.id;

      if (opId !== undefined) {
        await incrementRetry(opId);
      }

      const updatedOps = await getPendingOperations();
      expect(updatedOps[0]?.id).toBe(originalId);
      expect(updatedOps[0]?.operationId).toBe(originalOperationId);
      expect(updatedOps[0]?.data).toEqual(originalData);
      expect(updatedOps[0]?.type).toBe('create');
      expect(updatedOps[0]?.entity).toBe('exercise');
      expect(updatedOps[0]?.localId).toBe('local-1');
    });
  });

  describe('retry filtering', () => {
    it('should filter out exhausted retries', async () => {
      await queueOperationOp('create', 'exercise', 'local-1', {});
      await queueOperationOp('create', 'exercise', 'local-2', {});
      
      const ops = await getPendingOperations();
      const opId = ops[0]?.id;
      
      if (opId !== undefined) {
        await incrementRetry(opId);
        await incrementRetry(opId);
        await incrementRetry(opId);
      }

      const allOps = await getPendingOperations();
      const pendingOps = allOps.filter(op => op.retryCount < op.maxRetries);

      expect(allOps).toHaveLength(2);
      expect(pendingOps).toHaveLength(1);
      expect(pendingOps[0]?.localId).toBe('local-2');
    });

    it('should identify operations at max retries', async () => {
      await queueOperationOp('create', 'exercise', 'local-1', {});
      await queueOperationOp('create', 'exercise', 'local-2', {});
      
      const ops = await getPendingOperations();
      const opId = ops[0]?.id;
      
      if (opId !== undefined) {
        for (let i = 0; i < 3; i++) {
          await incrementRetry(opId);
        }
      }

      const allOps = await getPendingOperations();
      const exhaustedOps = allOps.filter(op => op.retryCount >= op.maxRetries);

      expect(exhaustedOps).toHaveLength(1);
      expect(exhaustedOps[0]?.localId).toBe('local-1');
    });

    it('should calculate remaining retries correctly', async () => {
      await queueOperationOp('create', 'exercise', 'local-1', {});
      
      const ops = await getPendingOperations();
      const remainingBefore = (ops[0]?.maxRetries ?? 0) - (ops[0]?.retryCount ?? 0);
      expect(remainingBefore).toBe(3);

      const opId = ops[0]?.id;
      if (opId !== undefined) {
        await incrementRetry(opId);
      }
      
      const updatedOps = await getPendingOperations();
      const remainingAfter = (updatedOps[0]?.maxRetries ?? 0) - (updatedOps[0]?.retryCount ?? 0);
      expect(remainingAfter).toBe(2);
    });
  });

  describe('queue operations with retry', () => {
    it('should track retry state across multiple operations', async () => {
      await queueOperationOp('create', 'exercise', 'local-1', {});
      await queueOperationOp('update', 'template', 'local-2', {});
      await queueOperationOp('delete', 'workout', 'local-3', {});
      
      let ops = await getPendingOperations();
      const id1 = ops[0]?.id;
      const id2 = ops[1]?.id;
      
      if (id1 !== undefined) await incrementRetry(id1);
      if (id2 !== undefined) {
        await incrementRetry(id2);
        await incrementRetry(id2);
      }
      
      ops = await getPendingOperations();
      expect(ops[0]?.retryCount).toBe(1);
      expect(ops[1]?.retryCount).toBe(2);
      expect(ops[2]?.retryCount).toBe(0);
    });

    it('should maintain order after removing and adding operations', async () => {
      await queueOperationOp('create', 'exercise', 'local-1', {});
      await new Promise<void>((resolve) => { setTimeout(resolve, 10); });
      await queueOperationOp('create', 'exercise', 'local-2', {});
      
      let ops = await getPendingOperations();
      const id1 = ops[0]?.id;
      if (id1 !== undefined) {
        await removeOperation(id1);
      }
      
      await new Promise<void>((resolve) => { setTimeout(resolve, 10); });
      await queueOperationOp('create', 'exercise', 'local-3', {});
      
      ops = await getPendingOperations();
      expect(ops).toHaveLength(2);
      expect(ops[0]?.localId).toBe('local-2');
      expect(ops[1]?.localId).toBe('local-3');
    });

    it('should handle mixed entity operations correctly', async () => {
      await queueOperationOp('create', 'exercise', 'local-1', {});
      await queueOperationOp('update', 'workout', 'local-2', {});
      await queueOperationOp('delete', 'template', 'local-3', {});
      await queueOperationOp('create', 'workout_exercise', 'local-4', {});
      await queueOperationOp('update', 'workout_set', 'local-5', {});
      
      const ops = await getPendingOperations();
      expect(ops).toHaveLength(5);
      
      const id3 = ops[2]?.id;
      if (id3 !== undefined) {
        await incrementRetry(id3);
      }
      
      const updatedOps = await getPendingOperations();
      expect(updatedOps[2]?.retryCount).toBe(1);
      expect(updatedOps[2]?.type).toBe('delete');
      expect(updatedOps[2]?.entity).toBe('template');
    });
  });
});
