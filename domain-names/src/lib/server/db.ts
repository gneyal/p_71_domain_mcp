import type { D1Database } from '@cloudflare/workers-types';
import type { Settings, Suggestion, Preference } from '$lib/types';

// Settings operations
export async function getSetting(db: D1Database, key: string): Promise<string | null> {
	const result = await db.prepare('SELECT value FROM settings WHERE key = ?').bind(key).first();
	return result?.value as string | null;
}

export async function getAllSettings(db: D1Database): Promise<Settings> {
	const results = await db.prepare('SELECT key, value FROM settings').all();
	const settings: Record<string, string> = {};
	for (const row of results.results) {
		settings[row.key as string] = row.value as string;
	}
	return settings as Settings;
}

export async function updateSetting(db: D1Database, key: string, value: string): Promise<void> {
	await db
		.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)')
		.bind(key, value)
		.run();
}

// Suggestions operations
export async function addSuggestion(
	db: D1Database,
	domain: string,
	reason: string,
	available: boolean | null
): Promise<number> {
	const result = await db
		.prepare('INSERT INTO suggestions (domain, reason, available) VALUES (?, ?, ?)')
		.bind(domain, reason, available === null ? null : available ? 1 : 0)
		.run();
	return result.meta.last_row_id as number;
}

export async function getPendingSuggestions(db: D1Database): Promise<Suggestion[]> {
	const results = await db
		.prepare(
			"SELECT id, domain, reason, created_at, status, available FROM suggestions WHERE status = 'pending' ORDER BY created_at DESC"
		)
		.all();

	return results.results.map((row) => ({
		id: row.id as number,
		domain: row.domain as string,
		reason: row.reason as string,
		created_at: row.created_at as string,
		status: row.status as 'pending',
		available: row.available === null ? null : row.available === 1
	}));
}

export async function updateSuggestionStatus(
	db: D1Database,
	id: number,
	status: string
): Promise<void> {
	await db.prepare('UPDATE suggestions SET status = ? WHERE id = ?').bind(status, id).run();
}

export async function expireOldSuggestions(db: D1Database): Promise<void> {
	await db.prepare("UPDATE suggestions SET status = 'expired' WHERE status = 'pending'").run();
}

// Preferences operations
export async function addPreference(
	db: D1Database,
	domain: string,
	liked: boolean,
	reason?: string
): Promise<void> {
	await db
		.prepare('INSERT INTO preferences (domain, liked, reason) VALUES (?, ?, ?)')
		.bind(domain, liked ? 1 : 0, reason ?? null)
		.run();
}

export async function getPreferences(db: D1Database, limit = 50): Promise<Preference[]> {
	const results = await db
		.prepare(
			'SELECT id, domain, liked, reason, created_at FROM preferences ORDER BY created_at DESC LIMIT ?'
		)
		.bind(limit)
		.all();

	return results.results.map((row) => ({
		id: row.id as number,
		domain: row.domain as string,
		liked: row.liked === 1,
		reason: row.reason as string | null,
		created_at: row.created_at as string
	}));
}

export async function getLikedDomains(db: D1Database, limit = 20): Promise<string[]> {
	const results = await db
		.prepare('SELECT domain FROM preferences WHERE liked = 1 ORDER BY created_at DESC LIMIT ?')
		.bind(limit)
		.all();
	return results.results.map((row) => row.domain as string);
}

export async function getDislikedDomains(db: D1Database, limit = 20): Promise<string[]> {
	const results = await db
		.prepare('SELECT domain FROM preferences WHERE liked = 0 ORDER BY created_at DESC LIMIT ?')
		.bind(limit)
		.all();
	return results.results.map((row) => row.domain as string);
}

// Subscribers operations
export async function addSubscriber(db: D1Database, email: string): Promise<boolean> {
	try {
		await db.prepare('INSERT INTO subscribers (email) VALUES (?)').bind(email).run();
		return true;
	} catch {
		return false; // Email already exists
	}
}

export async function getSubscribers(db: D1Database): Promise<string[]> {
	const results = await db.prepare('SELECT email FROM subscribers WHERE active = 1').all();
	return results.results.map((row) => row.email as string);
}
