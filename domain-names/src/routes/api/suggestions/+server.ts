import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getPendingSuggestions } from '$lib/server/db';
import { getPrice, getPurchaseLinks } from '$lib/server/rdap';

export const GET: RequestHandler = async ({ platform }) => {
	try {
		const db = platform?.env?.DB;
		if (!db) {
			return json({ suggestions: [] });
		}

		const suggestions = await getPendingSuggestions(db);

		// Add price and links to each suggestion
		const enriched = suggestions.map((s) => ({
			...s,
			price: getPrice(s.domain),
			links: getPurchaseLinks(s.domain)
		}));

		return json({ suggestions: enriched });
	} catch (error) {
		console.error('Get suggestions error:', error);
		return json({ error: 'Failed to get suggestions' }, { status: 500 });
	}
};
