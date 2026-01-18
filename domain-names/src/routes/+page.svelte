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

	interface Session {
		id: string;
		description: string;
		tlds: string;
		timestamp: string;
		domainCount: number;
		suggestions: Suggestion[];
	}

	let description = $state('');
	let sessions = $state<Session[]>([]);
	let tlds = $state('.com,.dev,.ai');
	let count = $state(25);
	let suggestions = $state<Suggestion[]>([]);
	let history = $state<HistoryItem[]>([]);
	let usage = $state<Usage | null>(null);
	let loading = $state(false);
	let currentTab = $state<'suggestions' | 'liked' | 'history'>('suggestions');
	let likedSuggestions = $state<Suggestion[]>([]);
	let hasUsedBefore = $state(false);
	let email = $state('');
	let subscribing = $state(false);
	let sendingLiked = $state(false);
	let likedEmail = $state('');
	let pythonStatus = $state<'checking' | 'online' | 'offline'>('checking');

	// Style pickers (toggleable)
	let wordCount = $state<string | null>(null); // 'one' | 'two' | 'three' | null
	let wordStyle = $state<string | null>(null); // 'real' | 'minor-error' | 'invented' | null

	const wordCountOptions = [
		{ value: 'one', label: 'One word' },
		{ value: 'two', label: 'Two words' },
		{ value: 'three', label: 'Three+' }
	];

	const wordStyleOptions = [
		{ value: 'real', label: 'Real words' },
		{ value: 'minor-error', label: 'Minor misspelling' },
		{ value: 'invented', label: 'Invented words' }
	];

	const tldOptions = [
		{ value: '.com', label: '.com' },
		{ value: '.io', label: '.io' },
		{ value: '.ai', label: '.ai' },
		{ value: '.dev', label: '.dev' },
		{ value: '.co', label: '.co' },
		{ value: '.app', label: '.app' },
		{ value: '.tech', label: '.tech' },
		{ value: '.xyz', label: '.xyz' }
	];

	const countOptions = [
		{ value: 10, label: '10' },
		{ value: 25, label: '25' },
		{ value: 50, label: '50' }
	];

	const triviaQuestions = [
		{ q: 'What was Google originally called?', a: 'BackRub', options: ['BackRub', 'SearchIt', 'PageRank', 'Googol'] },
		{ q: 'How much did the domain cars.com sell for?', a: '$872 million', options: ['$8.7 million', '$87 million', '$872 million', '$8.72 billion'] },
		{ q: 'What year was the first .com domain registered?', a: '1985', options: ['1983', '1985', '1989', '1991'] },
		{ q: 'Which company owns the most domain names?', a: 'Google', options: ['Google', 'Amazon', 'Microsoft', 'GoDaddy'] },
		{ q: 'What does TLD stand for?', a: 'Top Level Domain', options: ['Top Level Domain', 'Total Link Directory', 'Technical Link Data', 'Transfer Layer Domain'] },
		{ q: 'How many .com domains exist?', a: '150+ million', options: ['15 million', '50 million', '150+ million', '500 million'] },
		{ q: 'What was Twitter\'s original name idea?', a: 'twttr', options: ['twit', 'twttr', 'tweeter', 'birdie'] },
		{ q: 'Which TLD is for Montenegro?', a: '.me', options: ['.mn', '.me', '.mo', '.mt'] },
		{ q: 'What was Instagram called before launch?', a: 'Burbn', options: ['Picta', 'Burbn', 'InstaSnap', 'PhotoShare'] },
		{ q: 'How much did voice.com sell for?', a: '$30 million', options: ['$3 million', '$30 million', '$300 million', '$3 billion'] }
	];

	let currentTrivia = $state(0);
	let selectedAnswer = $state<string | null>(null);
	let showAnswer = $state(false);
	let triviaScore = $state(0);

	let selectedTlds = $state<string[]>(['.com', '.io', '.ai']);

	function togglePicker(type: 'wordCount' | 'wordStyle', value: string) {
		if (type === 'wordCount') {
			wordCount = wordCount === value ? null : value;
		} else {
			wordStyle = wordStyle === value ? null : value;
		}
		saveToStorage();
	}

	function toggleTld(tld: string) {
		if (selectedTlds.includes(tld)) {
			selectedTlds = selectedTlds.filter(t => t !== tld);
		} else {
			selectedTlds = [...selectedTlds, tld];
		}
		tlds = selectedTlds.join(',');
		saveToStorage();
	}

	function selectTriviaAnswer(answer: string) {
		if (showAnswer) return;
		selectedAnswer = answer;
		showAnswer = true;
		if (answer === triviaQuestions[currentTrivia].a) {
			triviaScore++;
		}
	}

	function nextTrivia() {
		currentTrivia = (currentTrivia + 1) % triviaQuestions.length;
		selectedAnswer = null;
		showAnswer = false;
	}

	function resetTrivia() {
		currentTrivia = Math.floor(Math.random() * triviaQuestions.length);
		selectedAnswer = null;
		showAnswer = false;
		triviaScore = 0;
	}

	onMount(() => {
		hasUsedBefore = localStorage.getItem('domain_ai_has_used') === 'true';
		loadFromStorage();
		checkPythonServer();
	});

	async function checkPythonServer() {
		try {
			const res = await fetch('/api/health');
			const data = await res.json();
			pythonStatus = data.python ? 'online' : 'offline';
		} catch {
			pythonStatus = 'offline';
		}
	}

	function loadFromStorage() {
		const saved = localStorage.getItem('domain_ai_settings');
		if (saved) {
			const s = JSON.parse(saved);
			description = s.description || '';
			tlds = s.tlds || '.com,.io,.ai';
			selectedTlds = tlds.split(',').filter((t: string) => t.trim());
			count = s.count || 25;
			wordCount = s.wordCount || null;
			wordStyle = s.wordStyle || null;
		}
		const savedHistory = localStorage.getItem('domain_ai_history');
		if (savedHistory) {
			history = JSON.parse(savedHistory);
		}
		const savedSessions = localStorage.getItem('domain_ai_sessions');
		if (savedSessions) {
			sessions = JSON.parse(savedSessions);
		}
		const savedLiked = localStorage.getItem('domain_ai_liked');
		if (savedLiked) {
			likedSuggestions = JSON.parse(savedLiked);
		}
	}

	function saveSession(desc: string, tldStr: string, sessionSuggestions: Suggestion[]) {
		const session: Session = {
			id: Date.now().toString(),
			description: desc.slice(0, 50) + (desc.length > 50 ? '...' : ''),
			tlds: tldStr,
			timestamp: new Date().toISOString(),
			domainCount: sessionSuggestions.length,
			suggestions: sessionSuggestions
		};
		sessions = [session, ...sessions].slice(0, 10); // Keep last 10 sessions
		localStorage.setItem('domain_ai_sessions', JSON.stringify(sessions));
	}

	function loadSession(session: Session) {
		description = session.description.replace('...', '');
		tlds = session.tlds;
		selectedTlds = tlds.split(',').filter((t: string) => t.trim());

		// Restore suggestions from session, filtering out those already voted on
		if (session.suggestions && session.suggestions.length > 0) {
			const votedDomains = new Set(history.map(h => h.domain));
			suggestions = session.suggestions.filter(s => !votedDomains.has(s.domain));
		}

		saveToStorage();
	}

	function saveToStorage() {
		localStorage.setItem('domain_ai_settings', JSON.stringify({ description, tlds, count, wordCount, wordStyle }));
	}

	async function generate() {
		if (!description.trim()) return;

		loading = true;
		hasUsedBefore = true;
		localStorage.setItem('domain_ai_has_used', 'true');
		saveToStorage();
		resetTrivia();

		try {
			const res = await fetch('/api/suggestions/generate', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ description, tlds, count, wordCount, wordStyle })
			});
			const data = await res.json();

			if (data.error) {
				alert(data.error);
			} else {
				suggestions = data.suggestions || [];
				usage = data.usage || null;
				// Save session
				if (suggestions.length > 0) {
					saveSession(description, tlds, suggestions);
				}
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

			if (liked) {
				// Add to liked suggestions if not already there
				if (!likedSuggestions.find(s => s.id === suggestion.id)) {
					likedSuggestions = [...likedSuggestions, suggestion];
					localStorage.setItem('domain_ai_liked', JSON.stringify(likedSuggestions));
				}
			} else {
				// Remove from suggestions if disliked
				suggestions = suggestions.filter((s) => s.id !== suggestion.id);
			}
		} catch (err) {
			console.error('Feedback error:', err);
		}
	}

	function copyAllLiked() {
		const domains = likedSuggestions.map(s => s.domain).join('\n');
		navigator.clipboard.writeText(domains);
		alert('Copied ' + likedSuggestions.length + ' domains to clipboard!');
	}

	function removeLiked(suggestion: Suggestion) {
		likedSuggestions = likedSuggestions.filter(s => s.id !== suggestion.id);
		localStorage.setItem('domain_ai_liked', JSON.stringify(likedSuggestions));
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

	async function sendLikedDomains() {
		if (!likedEmail.trim() || !likedEmail.includes('@')) {
			alert('Please enter a valid email');
			return;
		}
		const likedDomains = history.filter(h => h.liked).map(h => h.domain);
		if (likedDomains.length === 0) {
			alert('No liked domains to send');
			return;
		}
		sendingLiked = true;
		try {
			const res = await fetch('/api/send-liked', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email: likedEmail, domains: likedDomains })
			});
			const data = await res.json();
			if (data.error) {
				alert(data.error);
			} else {
				alert('Liked domains sent to your email!');
				likedEmail = '';
			}
		} catch {
			alert('Failed to send email');
		} finally {
			sendingLiked = false;
		}
	}

	let likedCount = $derived(history.filter(h => h.liked).length);
	let likedDomains = $derived(history.filter(h => h.liked));

	function downloadLikedJson() {
		const data = likedDomains.map(h => ({
			domain: h.domain,
			liked_at: h.created_at
		}));
		const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `liked-domains-${new Date().toISOString().split('T')[0]}.json`;
		a.click();
		URL.revokeObjectURL(url);
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
						What's your project about?
					</label>
					<textarea
						id="description"
						bind:value={description}
						onblur={saveToStorage}
						placeholder="e.g. An AI tool that helps developers write better code..."
						rows="4"
						class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent resize-none"
					></textarea>
				</div>

				<!-- Style Pickers -->
				<div class="space-y-3">
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-2">Word count</label>
						<div class="flex flex-wrap gap-2">
							{#each wordCountOptions as option}
								<button
									type="button"
									onclick={() => togglePicker('wordCount', option.value)}
									class={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
										wordCount === option.value
											? 'bg-gray-900 text-white border-gray-900'
											: 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
									}`}
								>
									{option.label}
								</button>
							{/each}
						</div>
					</div>
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-2">Word style</label>
						<div class="flex flex-wrap gap-2">
							{#each wordStyleOptions as option}
								<button
									type="button"
									onclick={() => togglePicker('wordStyle', option.value)}
									class={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
										wordStyle === option.value
											? 'bg-gray-900 text-white border-gray-900'
											: 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
									}`}
								>
									{option.label}
								</button>
							{/each}
						</div>
					</div>
				</div>

				<div>
					<label class="block text-sm font-medium text-gray-700 mb-2">TLDs</label>
					<div class="flex flex-wrap gap-2">
						{#each tldOptions as option}
							<button
								type="button"
								onclick={() => toggleTld(option.value)}
								class={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
									selectedTlds.includes(option.value)
										? 'bg-gray-900 text-white border-gray-900'
										: 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
								}`}
							>
								{option.label}
							</button>
						{/each}
					</div>
				</div>

				<div>
					<label class="block text-sm font-medium text-gray-700 mb-2">Results</label>
					<div class="flex flex-wrap gap-2">
						{#each countOptions as option}
							<button
								type="button"
								onclick={() => { count = option.value; saveToStorage(); }}
								class={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
									count === option.value
										? 'bg-gray-900 text-white border-gray-900'
										: 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
								}`}
							>
								{option.label}
							</button>
						{/each}
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

			<!-- Trivia Game while loading -->
			{#if loading}
				<div class="mt-6 p-5 bg-gray-50 rounded-xl border border-gray-200 animate-fade-in-up">
					<div class="flex items-center justify-between mb-3">
						<span class="text-xs font-medium text-gray-500 uppercase tracking-wide">While you wait...</span>
						<span class="text-xs text-gray-400">Score: {triviaScore}</span>
					</div>
					<p class="text-gray-900 font-medium mb-4">{triviaQuestions[currentTrivia].q}</p>
					<div class="grid grid-cols-2 gap-2">
						{#each triviaQuestions[currentTrivia].options as option}
							<button
								onclick={() => selectTriviaAnswer(option)}
								disabled={showAnswer}
								class={`p-2.5 text-sm rounded-lg border transition-all ${
									showAnswer
										? option === triviaQuestions[currentTrivia].a
											? 'bg-green-100 border-green-500 text-green-800'
											: selectedAnswer === option
												? 'bg-red-100 border-red-500 text-red-800'
												: 'bg-white border-gray-200 text-gray-500'
										: 'bg-white border-gray-200 text-gray-700 hover:border-gray-400 hover:bg-gray-50'
								}`}
							>
								{option}
							</button>
						{/each}
					</div>
					{#if showAnswer}
						<button
							onclick={nextTrivia}
							class="mt-3 w-full py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
						>
							Next question →
						</button>
					{/if}
				</div>
			{/if}

			{#if usage}
				<div class="mt-4 text-xs text-gray-apple text-center">
					{usage.total_tokens} tokens · ${usage.cost_usd.toFixed(4)}
				</div>
			{/if}

			<!-- Previous Sessions -->
			{#if sessions.length > 0}
				<div class="mt-6 pt-6 border-t border-gray-200">
					<h3 class="text-sm font-medium text-gray-700 mb-3">Previous Sessions</h3>
					<div class="space-y-2">
						{#each sessions.slice(0, 5) as session}
							<button
								onclick={() => loadSession(session)}
								class="w-full text-left p-2 rounded-lg hover:bg-gray-50 transition-colors group"
							>
								<div class="flex items-center justify-between">
									<span class="text-sm text-gray-900 truncate flex-1">{session.description}</span>
									<span class="text-xs text-gray-400 ml-2">{session.domainCount} results</span>
								</div>
								<div class="text-xs text-gray-400 mt-0.5">
									{session.tlds} · {new Date(session.timestamp).toLocaleDateString()}
								</div>
							</button>
						{/each}
					</div>
				</div>
			{/if}
		</div>

		<!-- Results Panel -->
		{#if hasUsedBefore && suggestions.length > 0}
			<div>
				<!-- Email/Download liked domains -->
				{#if likedCount > 0}
					<div class="mb-4 p-3 bg-gray-50 rounded-xl">
						<div class="flex items-center gap-2 flex-wrap">
							<span class="text-sm text-gray-700 font-medium">{likedCount} liked</span>
							<input
								type="email"
								bind:value={likedEmail}
								placeholder="your@email.com"
								class="flex-1 min-w-[150px] px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-900"
							/>
							<button
								onclick={sendLikedDomains}
								disabled={sendingLiked}
								class="px-3 py-1.5 text-sm bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50"
							>
								{sendingLiked ? 'Sending...' : 'Email'}
							</button>
							<button
								onclick={downloadLikedJson}
								class="px-3 py-1.5 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100"
								title="Download as JSON"
							>
								JSON
							</button>
						</div>
					</div>
				{/if}

				<!-- Tabs -->
				<div class="flex gap-4 mb-6 border-b border-gray-200">
					<button
						onclick={() => currentTab = 'suggestions'}
						class={`pb-2 text-sm font-medium border-b-2 -mb-px transition-colors ${currentTab === 'suggestions' ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-apple hover:text-gray-600'}`}
					>
						Suggestions ({suggestions.filter(s => s.available !== null).length})
					</button>
					<button
						onclick={() => currentTab = 'liked'}
						class={`pb-2 text-sm font-medium border-b-2 -mb-px transition-colors ${currentTab === 'liked' ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-apple hover:text-gray-600'}`}
					>
						Liked ({likedSuggestions.length})
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
						{#each suggestions.filter(s => s.available !== null) as suggestion, i}
							<div
								class="group p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors animate-fade-in-up"
								style="animation-delay: {i * 0.05}s"
							>
								<div class="flex items-start justify-between gap-4">
									<div class="flex-1 min-w-0">
										<div class="flex items-center gap-2">
											<span class="font-medium text-gray-900">{suggestion.domain}</span>
											{#if suggestion.available === true}
												<span class="text-xs px-1.5 py-0.5 rounded bg-green-100 text-green-700">Available</span>
											{:else if suggestion.available === false}
												<span class="text-xs px-1.5 py-0.5 rounded bg-red-100 text-red-700">Taken</span>
											{/if}
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

				<!-- Liked -->
				{#if currentTab === 'liked'}
					{#if likedSuggestions.length > 0}
						<div class="flex justify-end mb-4">
							<button
								onclick={copyAllLiked}
								class="px-3 py-1.5 text-sm bg-gray-900 text-white rounded-lg hover:bg-gray-800"
							>
								Copy all ({likedSuggestions.length})
							</button>
						</div>
					{/if}
					<div class="space-y-3">
						{#each likedSuggestions as suggestion}
							<div class="group p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors">
								<div class="flex items-start justify-between gap-4">
									<div class="flex-1 min-w-0">
										<div class="flex items-center gap-2">
											<span class="font-medium text-gray-900">{suggestion.domain}</span>
											{#if suggestion.available === true}
												<span class="text-xs px-1.5 py-0.5 rounded bg-green-100 text-green-700">Available</span>
											{:else if suggestion.available === false}
												<span class="text-xs px-1.5 py-0.5 rounded bg-red-100 text-red-700">Taken</span>
											{/if}
											<span class="text-sm text-gray-apple">${suggestion.price}/yr</span>
										</div>
										<p class="text-sm text-gray-600 mt-0.5">{suggestion.reason}</p>
										<div class="flex gap-2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
											<a href={suggestion.links.namecheap} target="_blank" class="text-xs text-blue-600 hover:underline">Namecheap</a>
											<a href={suggestion.links.porkbun} target="_blank" class="text-xs text-blue-600 hover:underline">Porkbun</a>
										</div>
									</div>
									<button
										onclick={() => removeLiked(suggestion)}
										class="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
										title="Remove"
									>
										<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
										</svg>
									</button>
								</div>
							</div>
						{/each}
					</div>
					{#if likedSuggestions.length === 0}
						<p class="text-gray-apple text-sm">No liked domains yet. Like domains from the suggestions to save them here.</p>
					{/if}
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

	<!-- Footer v2 -->
	<footer class="max-w-6xl mx-auto px-6 py-8 border-t border-gray-200">
		<div class="flex items-center justify-between text-xs text-gray-apple">
			<div class="flex gap-4">
				<a href="/privacy" class="hover:text-gray-900">Privacy & Terms</a>
				<a href="/api-docs" class="hover:text-gray-900">API</a>
				<a href="/mcp-docs" class="hover:text-gray-900">MCP</a>
			</div>
			<div class="flex items-center gap-4">
				<div class="flex items-center gap-1.5">
					<span class={`w-2 h-2 rounded-full ${pythonStatus === 'online' ? 'bg-green-500' : pythonStatus === 'offline' ? 'bg-red-500' : 'bg-yellow-500 animate-pulse'}`}></span>
					<span>{pythonStatus === 'checking' ? '...' : pythonStatus}</span>
				</div>
				<div>
					Made by <a href="https://autobirds.com" target="_blank" class="font-semibold text-gray-900 hover:underline">AutoBirds</a>
				</div>
			</div>
		</div>
	</footer>
</div>
