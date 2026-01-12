import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { generateDomains } from '$lib/server/agent';
import { getAllSettings, addSuggestion, expireOldSuggestions } from '$lib/server/db';
import { getPrice, getPurchaseLinks } from '$lib/server/rdap';

export const POST: RequestHandler = async ({ platform }) => {
	try {
		const apiKey = platform?.env?.ANTHROPIC_API_KEY;
		if (!apiKey) {
			return json({ error: 'API key not configured' }, { status: 500 });
		}

		const db = platform?.env?.DB;
		if (!db) {
			return json({ error: 'Database not configured' }, { status: 500 });
		}

		// Get settings
		const settings = await getAllSettings(db);
		const count = parseInt(settings.daily_count) || 25;

		// Expire old suggestions
		await expireOldSuggestions(db);

		// Generate new domains
		const { suggestions: generated, usage } = await generateDomains(
			apiKey,
			settings.description,
			count,
			settings.tlds,
			true, // check availability
			db
		);

		// Store in database and build response
		const suggestions = [];
		for (const item of generated) {
			const id = await addSuggestion(db, item.domain, item.reason, item.available);
			suggestions.push({
				id,
				domain: item.domain,
				reason: item.reason,
				price: getPrice(item.domain),
				links: getPurchaseLinks(item.domain),
				status: 'pending',
				available: item.available
			});
		}

		return json({ suggestions, usage });
	} catch (error) {
		console.error('Generate error:', error);
		return json(
			{ error: `Error generating suggestions: ${error instanceof Error ? error.message : 'Unknown error'}` },
			{ status: 500 }
		);
	}
};
