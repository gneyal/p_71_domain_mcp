<script>
	import '../app.css';
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import posthog from 'posthog-js';

	let { children } = $props();

	let showBanner = $state(false);
	let isVisible = $state(false);

	onMount(() => {
		if (!browser) return;

		const gdprConsent = localStorage.getItem('gdpr-accepted');

		// Initialize PostHog
		if (!posthog.__loaded) {
			posthog.init('phc_QAE6zbab92ajTeCR7m9fNNh1H3aWzG7f7Goqm7roAg2', {
				api_host: 'https://us.i.posthog.com',
				ui_host: 'https://us.posthog.com',
				person_profiles: 'always',
				opt_out_capturing_by_default: gdprConsent === 'declined'
			});
		}

		if (gdprConsent === 'declined') {
			posthog.opt_out_capturing();
		} else if (gdprConsent === 'true') {
			posthog.opt_in_capturing();
		} else {
			showBanner = true;
			setTimeout(() => { isVisible = true; }, 100);
		}
	});

	function acceptCookies() {
		localStorage.setItem('gdpr-accepted', 'true');
		posthog.opt_in_capturing();
		isVisible = false;
		setTimeout(() => { showBanner = false; }, 300);
	}

	function declineCookies() {
		localStorage.setItem('gdpr-accepted', 'declined');
		posthog.opt_out_capturing();
		isVisible = false;
		setTimeout(() => { showBanner = false; }, 300);
	}
</script>

<svelte:head>
	<title>Domain AI Agent</title>
	<meta name="description" content="AI-powered domain name and brand name generator" />
</svelte:head>

{@render children()}

{#if showBanner}
	<div
		class="fixed bottom-0 left-0 right-0 z-50 bg-gray-900 text-white p-4 shadow-lg transition-transform duration-300 ease-in-out {isVisible ? 'translate-y-0' : 'translate-y-full'}"
	>
		<div class="max-w-4xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
			<p class="text-sm">
				We use cookies to improve your experience.
				<a href="/privacy" class="text-blue-300 hover:text-blue-200 underline ml-1">Privacy Policy</a>
			</p>
			<div class="flex gap-2">
				<button onclick={declineCookies} class="px-4 py-2 text-sm border border-gray-600 hover:border-gray-500 rounded-md">
					Decline
				</button>
				<button onclick={acceptCookies} class="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 rounded-md">
					Accept
				</button>
			</div>
		</div>
	</div>
{/if}
