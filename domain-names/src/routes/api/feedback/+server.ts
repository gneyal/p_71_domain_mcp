import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { updateSuggestionStatus, addPreference, getPendingSuggestions } from '$lib/server/db';

export const POST: RequestHandler = async ({ request, platform }) => {
	try {
		const body = await request.json();
		const { suggestion_id, liked, reason } = body;

		if (suggestion_id === undefined || liked === undefined) {
			return json({ error: 'suggestion_id and liked are required' }, { status: 400 });
		}

		const db = platform?.env?.DB;
		if (!db) {
			return json({ error: 'Database not configured' }, { status: 500 });
		}

		// Get the domain for this suggestion
		const suggestions = await getPendingSuggestions(db);
		const suggestion = suggestions.find((s) => s.id === suggestion_id);

		if (suggestion) {
			// Update suggestion status
			await updateSuggestionStatus(db, suggestion_id, liked ? 'liked' : 'disliked');

			// Add to preferences for learning
			await addPreference(db, suggestion.domain, liked, reason);
		}

		return json({ success: true });
	} catch (error) {
		console.error('Feedback error:', error);
		return json({ error: 'Failed to save feedback' }, { status: 500 });
	}
};
