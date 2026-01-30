let serviceWorkerRegistration: ServiceWorkerRegistration | null = null;

export async function registerServiceWorker(): Promise<void> {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      });
      serviceWorkerRegistration = registration;

      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              window.dispatchEvent(new CustomEvent('sw-update-available'));
            }
          });
        }
      });

      console.log('Service Worker registered:', registration);
    } catch (error) {
      console.error('Service Worker registration failed:', error);
    }
  }
}

export async function unregisterServiceWorker(): Promise<boolean> {
  if (serviceWorkerRegistration) {
    return await serviceWorkerRegistration.unregister();
  }
  return false;
}

if (typeof window !== 'undefined') {
  navigator.serviceWorker.addEventListener('message', (event: MessageEvent) => {
    const data = event.data as { type?: string } | null;
    if (data?.type === 'SYNC_COMPLETE') {
      console.log('Background sync completed');
      window.dispatchEvent(new CustomEvent('workout-sync-complete'));
    }
  });
}

export async function requestBackgroundSync(): Promise<boolean> {
  if ('serviceWorker' in navigator && 'SyncManager' in window) {
    try {
      const registration = await navigator.serviceWorker.ready;
      await (registration as ServiceWorkerRegistration & { sync: { register: (tag: string) => Promise<void> } }).sync.register('sync-workout-data');
      return true;
    } catch (error) {
      console.error('Background sync registration failed:', error);
      return false;
    }
  }
  return false;
}
