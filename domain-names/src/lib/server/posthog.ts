import { PostHog } from 'posthog-node';

let posthogClient: PostHog | null = null;

export function getPostHog(): PostHog {
	if (!posthogClient) {
		posthogClient = new PostHog('phc_QAE6zbab92ajTeCR7m9fNNh1H3aWzG7f7Goqm7roAg2', {
			host: 'https://us.i.posthog.com',
			flushAt: 1,
			flushInterval: 0
		});
	}
	return posthogClient;
}

export function trackApiCall(
	endpoint: string,
	properties: Record<string, unknown> = {},
	distinctId?: string
) {
	const posthog = getPostHog();
	posthog.capture({
		distinctId: distinctId || 'anonymous-api-user',
		event: 'api_call',
		properties: {
			endpoint,
			...properties
		}
	});
}
