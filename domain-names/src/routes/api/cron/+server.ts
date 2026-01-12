import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ platform, url }) => {
	// Verify cron secret to prevent unauthorized access
	const secret = url.searchParams.get('secret');
	const expectedSecret = platform?.env?.CRON_SECRET || 'domains-cron-2026';
	if (secret !== expectedSecret) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const db = platform?.env?.DB;
		const resendKey = platform?.env?.RESEND_API_KEY;

		if (!db || !resendKey) {
			return json({ error: 'Missing configuration' }, { status: 500 });
		}

		// Get stats
		const subscriberCount = await db.prepare('SELECT COUNT(*) as count FROM subscribers').first();
		const suggestionCount = await db.prepare('SELECT COUNT(*) as count FROM suggestions').first();
		const preferenceCount = await db.prepare('SELECT COUNT(*) as count FROM preferences').first();

		// Send email
		const { Resend } = await import('resend');
		const resend = new Resend(resendKey);

		await resend.emails.send({
			from: 'Domain AI Agent <eyal@brickbear.ai>',
			to: 'gneyal@gmail.com',
			subject: `Domain AI Agent - Daily Stats`,
			html: `
				<h2>Daily Stats - ${new Date().toLocaleDateString()}</h2>
				<ul>
					<li><strong>Subscribers:</strong> ${subscriberCount?.count || 0}</li>
					<li><strong>Suggestions generated:</strong> ${suggestionCount?.count || 0}</li>
					<li><strong>Feedback received:</strong> ${preferenceCount?.count || 0}</li>
				</ul>
				<p><a href="https://domains.autobirds.com">Visit Dashboard</a></p>
			`
		});

		return json({ success: true, stats: { subscriberCount, suggestionCount, preferenceCount } });
	} catch (error) {
		console.error('Cron error:', error);
		return json({ error: String(error) }, { status: 500 });
	}
};
