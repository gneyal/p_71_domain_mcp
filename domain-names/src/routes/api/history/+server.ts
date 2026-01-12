import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getPreferences } from '$lib/server/db';

export const GET: RequestHandler = async ({ platform }) => {
	try {
		const db = platform?.env?.DB;
		if (!db) {
			return json({ history: [] });
		}

		const history = await getPreferences(db, 100);
		return json({ history });
	} catch (error) {
		console.error('Get history error:', error);
		return json({ error: 'Failed to get history' }, { status: 500 });
	}
};
