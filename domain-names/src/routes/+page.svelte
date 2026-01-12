<script lang="ts">
	import { onMount } from 'svelte';

	interface Suggestion {
		id: number;
		domain: string;
		reason: string;
		price: number;
		links: { namecheap: string; godaddy: string; porkbun: string };
		available: boolean | null;
	}

	interface HistoryItem {
		domain: string;
		liked: boolean;
		created_at: string;
	}

	interface Usage {
		input_tokens: number;
		output_tokens: number;
		total_tokens: number;
		cost_usd: number;
	}

	let description = $state('');
	let tlds = $state('.com,.io,.ai');
	let count = $state(25);
	let suggestions = $state<Suggestion[]>([]);
	let history = $state<HistoryItem[]>([]);
	let usage = $state<Usage | null>(null);
	let loading = $state(false);
	let currentTab = $state<'suggestions' | 'history'>('suggestions');
	let hasUsedBefore = $state(false);
	let email = $state('');
	let subscribing = $state(false);

	onMount(() => {
		hasUsedBefore = localStorage.getItem('domain_ai_has_used') === 'true';
		loadFromStorage();
	});

	function loadFromStorage() {
		const saved = localStorage.getItem('domain_ai_settings');
		if (saved) {
			const s = JSON.parse(saved);
			description = s.description || '';
			tlds = s.tlds || '.com,.io,.ai';
			count = s.count || 25;
		}
		const savedHistory = localStorage.getItem('domain_ai_history');
		if (savedHistory) {
			history = JSON.parse(savedHistory);
		}
	}

	function saveToStorage() {
		localStorage.setItem('domain_ai_settings', JSON.stringify({ description, tlds, count }));
	}

	async function generate() {
		if (!description.trim()) return;

		loading = true;
		hasUsedBefore = true;
		localStorage.setItem('domain_ai_has_used', 'true');
		saveToStorage();

		try {
			const res = await fetch('/api/suggestions/generate', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ description, tlds, count })
			});
			const data = await res.json();

			if (data.error) {
				alert(data.error);
			} else {
				suggestions = data.suggestions || [];
				usage = data.usage || null;
			}
		} catch (err) {
			alert('Failed to generate suggestions');
			console.error(err);
		} finally {
			loading = false;
		}
	}

	async function submitFeedback(suggestion: Suggestion, liked: boolean) {
		try {
			await fetch('/api/feedback', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ suggestion_id: suggestion.id, liked })
			});

			// Add to local history
			history = [{ domain: suggestion.domain, liked, created_at: new Date().toISOString() }, ...history].slice(0, 100);
			localStorage.setItem('domain_ai_history', JSON.stringify(history));

			// Remove from suggestions
			suggestions = suggestions.filter((s) => s.id !== suggestion.id);
		} catch (err) {
			console.error('Feedback error:', err);
		}
	}

	async function subscribe() {
		if (!email.trim() || !email.includes('@')) return;
		subscribing = true;
		try {
			const res = await fetch('/api/subscribe', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email })
			});
			const data = await res.json();
			alert(data.message || 'Subscribed!');
			email = '';
		} catch {
			alert('Failed to subscribe');
		} finally {
			subscribing = false;
		}
	}
</script>

<div class="min-h-screen bg-white text-gray-900 antialiased">
	<!-- News Banner -->
	<div class="bg-gray-900 text-white py-3 px-4">
		<div class="max-w-4xl mx-auto flex items-center justify-between gap-4 flex-wrap">
			<span class="text-sm">Get daily domain recommendations in your inbox</span>
			<form onsubmit={(e) => { e.preventDefault(); subscribe(); }} class="flex gap-2">
				<input
					type="email"
					bind:value={email}
					placeholder="you@email.com"
					class="px-3 py-1.5 rounded-lg text-sm bg-gray-800 border border-gray-700 focus:outline-none focus:border-gray-500 w-48"
				/>
				<button
					type="submit"
					disabled={subscribing}
					class="px-4 py-1.5 bg-white text-gray-900 rounded-lg text-sm font-medium hover:bg-gray-100 disabled:opacity-50"
				>
					{subscribing ? '...' : 'Subscribe'}
				</button>
			</form>
		</div>
	</div>

	<!-- Main Content -->
	<div class={`max-w-6xl mx-auto px-6 py-12 transition-all duration-500 ${hasUsedBefore && suggestions.length > 0 ? 'grid grid-cols-1 lg:grid-cols-2 gap-12' : ''}`}>
		<!-- Search Panel -->
		<div class={`${!hasUsedBefore || suggestions.length === 0 ? 'max-w-xl mx-auto' : ''}`}>
			<h1 class={`font-semibold text-gray-900 tracking-tight mb-2 ${!hasUsedBefore || suggestions.length === 0 ? 'text-4xl text-center' : 'text-2xl'}`}>
				Domain AI Agent
			</h1>
			<p class={`text-gray-apple mb-8 ${!hasUsedBefore || suggestions.length === 0 ? 'text-center' : ''}`}>
				Find the perfect name for your next project
			</p>

			<div class="space-y-4">
				<div>
					<label for="description" class="block text-sm font-medium text-gray-700 mb-1">
						Describe what you're looking for
					</label>
					<textarea
						id="description"
						bind:value={description}
						onblur={saveToStorage}
						placeholder="A modern fintech startup focused on payments..."
						rows="4"
						class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent resize-none"
					></textarea>
				</div>

				<div class="grid grid-cols-2 gap-4">
					<div>
						<label for="tlds" class="block text-sm font-medium text-gray-700 mb-1">TLDs</label>
						<input
							id="tlds"
							type="text"
							bind:value={tlds}
							onblur={saveToStorage}
							placeholder=".com,.io,.ai"
							class="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
						/>
					</div>
					<div>
						<label for="count" class="block text-sm font-medium text-gray-700 mb-1">Results</label>
						<input
							id="count"
							type="number"
							bind:value={count}
							onblur={saveToStorage}
							min="1"
							max="50"
							class="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
						/>
					</div>
				</div>

				<button
					onclick={generate}
					disabled={loading || !description.trim()}
					class="w-full py-3 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
				>
					{#if loading}
						<span class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
						Generating...
					{:else}
						Generate Domains
					{/if}
				</button>
			</div>

			{#if usage}
				<div class="mt-4 text-xs text-gray-apple text-center">
					{usage.total_tokens} tokens · ${usage.cost_usd.toFixed(4)}
				</div>
			{/if}
		</div>

		<!-- Results Panel -->
		{#if hasUsedBefore && suggestions.length > 0}
			<div>
				<!-- Tabs -->
				<div class="flex gap-4 mb-6 border-b border-gray-200">
					<button
						onclick={() => currentTab = 'suggestions'}
						class={`pb-2 text-sm font-medium border-b-2 -mb-px transition-colors ${currentTab === 'suggestions' ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-apple hover:text-gray-600'}`}
					>
						Suggestions ({suggestions.length})
					</button>
					<button
						onclick={() => currentTab = 'history'}
						class={`pb-2 text-sm font-medium border-b-2 -mb-px transition-colors ${currentTab === 'history' ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-apple hover:text-gray-600'}`}
					>
						History ({history.length})
					</button>
				</div>

				<!-- Suggestions -->
				{#if currentTab === 'suggestions'}
					<div class="space-y-3">
						{#each suggestions as suggestion, i}
							<div
								class="group p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors animate-fade-in-up"
								style="animation-delay: {i * 0.05}s"
							>
								<div class="flex items-start justify-between gap-4">
									<div class="flex-1 min-w-0">
										<div class="flex items-baseline gap-2">
											<span class="font-medium text-gray-900">{suggestion.domain}</span>
											<span class="text-sm text-gray-apple">${suggestion.price}/yr</span>
										</div>
										<p class="text-sm text-gray-600 mt-0.5">{suggestion.reason}</p>
										<!-- Purchase links (show on hover) -->
										<div class="flex gap-2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
											<a href={suggestion.links.namecheap} target="_blank" class="text-xs text-blue-600 hover:underline">Namecheap</a>
											<a href={suggestion.links.porkbun} target="_blank" class="text-xs text-blue-600 hover:underline">Porkbun</a>
										</div>
									</div>
									<!-- Feedback buttons -->
									<div class="flex gap-1">
										<button
											onclick={() => submitFeedback(suggestion, true)}
											class="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
											title="Like"
										>
											<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5"/>
											</svg>
										</button>
										<button
											onclick={() => submitFeedback(suggestion, false)}
											class="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
											title="Dislike"
										>
											<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.485.06l3.76.94m-7 10v5a2 2 0 002 2h.096c.5 0 .905-.405.905-.904 0-.715.211-1.413.608-2.008L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5"/>
											</svg>
										</button>
									</div>
								</div>
							</div>
						{/each}
					</div>
				{/if}

				<!-- History -->
				{#if currentTab === 'history'}
					<div class="space-y-2">
						{#each history as item}
							<div class="flex items-center justify-between py-2 border-b border-gray-100">
								<span class="font-medium text-gray-900">{item.domain}</span>
								<span class={`text-xs px-2 py-0.5 rounded-full ${item.liked ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
									{item.liked ? 'Liked' : 'Disliked'}
								</span>
							</div>
						{/each}
						{#if history.length === 0}
							<p class="text-gray-apple text-sm">No history yet. Like or dislike domains to build your preferences.</p>
						{/if}
					</div>
				{/if}
			</div>
		{/if}
	</div>

	<!-- Footer -->
	<footer class="max-w-6xl mx-auto px-6 py-8 border-t border-gray-200">
		<div class="flex items-center justify-between text-xs text-gray-apple">
			<div class="flex gap-4">
				<a href="/privacy" class="hover:text-gray-900">Privacy & Terms</a>
				<a href="/api-docs" class="hover:text-gray-900">API</a>
				<a href="/mcp-docs" class="hover:text-gray-900">MCP</a>
			</div>
			<div>
				Made by <a href="https://autobirds.com" target="_blank" class="font-semibold text-gray-900 hover:underline">AutoBirds</a>
			</div>
		</div>
	</footer>
</div>
