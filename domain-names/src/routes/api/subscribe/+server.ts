import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { addSubscriber } from '$lib/server/db';

export const POST: RequestHandler = async ({ request, platform }) => {
	try {
		const body = await request.json();
		const { email } = body;

		if (!email || !email.includes('@')) {
			return json({ error: 'Valid email is required' }, { status: 400 });
		}

		const db = platform?.env?.DB;
		if (!db) {
			return json({ error: 'Database not configured' }, { status: 500 });
		}

		const added = await addSubscriber(db, email.toLowerCase().trim());

		if (added) {
			// Optionally send welcome email via Resend
			const resendKey = platform?.env?.RESEND_API_KEY;
			if (resendKey) {
				try {
					// Dynamic import to avoid issues if resend isn't available
					const { Resend } = await import('resend');
					const resend = new Resend(resendKey);
					await resend.emails.send({
						from: 'Domain AI Agent <hello@autobirds.com>',
						to: email,
						subject: 'Welcome to Domain AI Agent!',
						html: `
							<h1>Welcome!</h1>
							<p>Thanks for subscribing to Domain AI Agent. You'll receive daily domain name suggestions based on your preferences.</p>
							<p>Visit <a href="https://domains.autobirds.com">domains.autobirds.com</a> to generate custom suggestions anytime.</p>
						`
					});
				} catch (emailError) {
					console.error('Email send error:', emailError);
					// Don't fail the request if email fails
				}
			}

			return json({ success: true, message: 'Subscribed successfully!' });
		} else {
			return json({ success: true, message: 'You are already subscribed!' });
		}
	} catch (error) {
		console.error('Subscribe error:', error);
		return json({ error: 'Failed to subscribe' }, { status: 500 });
	}
};
