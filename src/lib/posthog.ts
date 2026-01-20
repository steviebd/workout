export async function trackEvent(
  event: string,
  properties?: Record<string, unknown>,
  options?: { distinctId?: string }
): Promise<void> {
  try {
    await fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        event,
        properties,
        distinctId: options?.distinctId ?? 'anonymous',
      }),
    });
  } catch {
    // Silently fail - analytics is non-critical
  }
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

export async function shutdownClient(): Promise<void> {
  // No-op on client side
}
