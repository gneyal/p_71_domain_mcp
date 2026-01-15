import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { generateDomains } from '$lib/server/agent';
import { trackApiCall } from '$lib/server/posthog';

export const POST: RequestHandler = async ({ request, platform, getClientAddress }) => {
	const startTime = Date.now();
	let success = false;
	let suggestionCount = 0;

	try {
		const body = await request.json();
		const { description, count = 10, tlds = '.com,.dev,.ai', check_availability = true, wordCount = null, wordStyle = null } = body;

		if (!description) {
			return json({ error: 'description is required' }, { status: 400 });
		}

		const apiKey = platform?.env?.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY;
		if (!apiKey) {
			return json({ error: 'API key not configured' }, { status: 500 });
		}

		const db = platform?.env?.DB;
		const whoisApiUrl = (platform?.env as Record<string, string>)?.WHOIS_API_URL || '';

		const { suggestions, usage } = await generateDomains(
			apiKey,
			description,
			Math.min(count, 50),
			tlds,
			check_availability,
			db,
			whoisApiUrl,
			{ wordCount, wordStyle }
		);

		success = true;
		suggestionCount = suggestions.length;

		// Track API usage
		trackApiCall('/api/v1/generate', {
			success: true,
			suggestion_count: suggestionCount,
			tlds,
			count,
			duration_ms: Date.now() - startTime,
			source: 'external_api'
		});

		return json({ suggestions, usage });
	} catch (error) {
		console.error('Generate error:', error);

		// Track failed API call
		trackApiCall('/api/v1/generate', {
			success: false,
			error: error instanceof Error ? error.message : 'Unknown error',
			duration_ms: Date.now() - startTime,
			source: 'external_api'
		});

		return json(
			{ error: `Error generating suggestions: ${error instanceof Error ? error.message : 'Unknown error'}` },
			{ status: 500 }
		);
	}
};
