import { PostHog } from 'posthog-node';

interface PostHogClientInterface {
  capture(options: { event: string; distinctId: string; properties?: Record<string, unknown> }): void;
  identify(options: { distinctId: string; properties: { $set: Record<string, unknown> } }): void;
  disable(): Promise<void>;
}

let posthogClient: PostHogClientInterface | null = null;

function getPostHogClient(): PostHogClientInterface {
  if (!posthogClient) {
    const apiKey = process.env.POSTHOG_API_KEY;
    const projectUrl = process.env.POSTHOG_PROJECT_URL;

    if (!apiKey || !projectUrl) {
      const dummyClient = new PostHog('dummy-key', {
        host: 'https://dummy-host',
      });
      void dummyClient.disable();
      posthogClient = dummyClient;
    } else {
      posthogClient = new PostHog(apiKey, {
        host: projectUrl,
      });
    }
  }

  return posthogClient as PostHogClientInterface;
}

export function trackEvent(
  event: string,
  properties?: Record<string, unknown>,
  distinctId = 'anonymous'
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
      $set: properties ?? {},
    },
  });
}


