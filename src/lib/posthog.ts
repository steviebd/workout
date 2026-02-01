let posthogClientPromise: Promise<{ trackEvent: (event: string, properties?: Record<string, unknown>) => Promise<void> }> | null = null;

function createPosthogClient(): Promise<{ trackEvent: (event: string, properties?: Record<string, unknown>) => Promise<void> }> {
  return new Promise((resolve) => {
    resolve({
      async trackEvent(event: string, properties?: Record<string, unknown>): Promise<void> {
        try {
          await fetch('/api/analytics/track', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              event,
              properties,
              distinctId: 'anonymous',
            }),
          });
        } catch {
          // Silently fail - analytics is non-critical
        }
      },
    });
  });
}

function getPosthogClient(): Promise<{ trackEvent: (event: string, properties?: Record<string, unknown>) => Promise<void> }> {
  posthogClientPromise ??= createPosthogClient();
  return posthogClientPromise;
}

export async function trackEvent(
  event: string,
  properties?: Record<string, unknown>,
  options?: { distinctId?: string }
): Promise<void> {
  const client = await getPosthogClient();
  await client.trackEvent(event, { ...properties, _options: options });
}

export async function identifyUser(
  _userId: string,
  _properties?: Record<string, unknown>
): Promise<void> {
  // Handled via trackEvent or server-side
}

export async function capturePageView(
  _url: string,
  _properties?: Record<string, unknown>
): Promise<void> {
  // Handled automatically by PostHog's auto-capture
}


