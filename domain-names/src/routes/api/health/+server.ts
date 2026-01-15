import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ platform }) => {
	const whoisApiUrl = (platform?.env as Record<string, string>)?.WHOIS_API_URL || '';

	if (!whoisApiUrl) {
		return json({ python: false, error: 'WHOIS_API_URL not configured' });
	}

	try {
		const res = await fetch(`${whoisApiUrl}/api/health`, {
			signal: AbortSignal.timeout(3000)
		});

		if (res.ok) {
			const data = await res.json();
			return json({ python: true, ...data });
		}
		return json({ python: false, error: `Status ${res.status}` });
	} catch (e) {
		return json({ python: false, error: String(e) });
	}
};
