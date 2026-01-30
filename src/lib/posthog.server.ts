import { PostHog } from 'posthog-node';

let posthogClient: PostHog | null = null;

function getPostHogClient(): PostHog {
  if (!posthogClient) {
    const apiKey = process.env.POSTHOG_API_KEY;
    const projectUrl = process.env.POSTHOG_PROJECT_URL;

    if (!apiKey || !projectUrl) {
      posthogClient = new PostHog('dummy-key', {
        host: 'https://dummy-host',
      });
      void posthogClient.disable();
    } else {
      posthogClient = new PostHog(apiKey, {
        host: projectUrl,
      });
    }
  }
  return posthogClient;
}

export function trackEvent(
  event: string,
  properties?: Record<string, unknown>,
  distinctId: string = 'anonymous'
): void {
  const client = getPostHogClient();
  client.capture({
    event,
    distinctId,
    properties,
  });
}

export function identifyUser(
  userId: string,
  properties?: Record<string, unknown>
): void {
  const client = getPostHogClient();
  client.identify({
    distinctId: userId,
    properties: {
      $set: properties,
    },
  });
}

export async function shutdownClient(): Promise<void> {
  const client = getPostHogClient();
  await client.shutdown();
}
