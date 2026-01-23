import { useCallback, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { syncEngine, type SyncResult } from '@/lib/sync/sync-engine';
import { useAuth } from '@/routes/__root';

interface SyncState {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  lastSyncTime: Date | null;
  error: string | null;
}

export function useOfflineSync() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [syncState, setSyncState] = useState<SyncState>({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isSyncing: false,
    pendingCount: 0,
    lastSyncTime: null,
    error: null,
  });

  const updatePendingCount = useCallback(async () => {
    if (!user) return;
    const count = await syncEngine.getPendingCount();
    setSyncState(prev => ({ ...prev, pendingCount: count }));
  }, [user]);

  const sync = useCallback(async (): Promise<SyncResult> => {
    if (!user) {
      return { success: false, pushed: 0, pulled: 0, errors: 0 };
    }

    setSyncState(prev => ({ ...prev, isSyncing: true, error: null }));

    try {
      const result = await syncEngine.sync(user.id);
      await updatePendingCount();
      setSyncState(prev => ({
        ...prev,
        isSyncing: false,
        lastSyncTime: new Date(),
        error: result.errors > 0 ? `${result.errors} errors occurred during sync` : null,
      }));
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setSyncState(prev => ({
        ...prev,
        isSyncing: false,
        error: errorMessage,
      }));
      return { success: false, pushed: 0, pulled: 0, errors: 1 };
    }
  }, [user, updatePendingCount]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    void updatePendingCount();
  }, [updatePendingCount]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnline = () => {
      setSyncState(prev => ({ ...prev, isOnline: true }));
    };

    const handleOffline = () => {
      setSyncState(prev => ({ ...prev, isOnline: false }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!user) return;

    const handleSyncRequest = () => {
      void sync().then(() => updatePendingCount());
    };

    window.addEventListener('sw-sync-request', handleSyncRequest);

    return () => {
      window.removeEventListener('sw-sync-request', handleSyncRequest);
    };
  }, [user, sync, updatePendingCount]);

  return {
    ...syncState,
    sync,
    invalidateQueries: () => {
      if (typeof window !== 'undefined') {
        void queryClient.invalidateQueries();
      }
    },
  };
}
