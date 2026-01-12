import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAllSettings, updateSetting } from '$lib/server/db';

export const GET: RequestHandler = async ({ platform }) => {
	try {
		const db = platform?.env?.DB;
		if (!db) {
			return json({
				settings: {
					daily_count: '25',
					description: 'Short, memorable, brandable domain names for a tech startup',
					tlds: '.com,.io,.ai,.co'
				}
			});
		}

		const settings = await getAllSettings(db);
		return json({ settings });
	} catch (error) {
		console.error('Get settings error:', error);
		return json({ error: 'Failed to get settings' }, { status: 500 });
	}
};

export const POST: RequestHandler = async ({ request, platform }) => {
	try {
		const body = await request.json();
		const { daily_count, description, tlds } = body;

		const db = platform?.env?.DB;
		if (!db) {
			return json({ error: 'Database not configured' }, { status: 500 });
		}

		if (daily_count !== undefined) {
			await updateSetting(db, 'daily_count', String(daily_count));
		}
		if (description !== undefined) {
			await updateSetting(db, 'description', description);
		}
		if (tlds !== undefined) {
			await updateSetting(db, 'tlds', tlds);
		}

		const settings = await getAllSettings(db);
		return json({ success: true, settings });
	} catch (error) {
		console.error('Update settings error:', error);
		return json({ error: 'Failed to update settings' }, { status: 500 });
	}
};
