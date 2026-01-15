import Anthropic from '@anthropic-ai/sdk';
import type { D1Database } from '@cloudflare/workers-types';
import type { Usage } from '$lib/types';
import { getLikedDomains, getDislikedDomains } from './db';
import {
	checkAvailabilityBatch,
	getPrice,
	getPurchaseLinks,
	isValidDomain,
	normalizeDomain
} from './rdap';

interface ParsedDomain {
	domain: string;
	reason: string;
}

interface GeneratedDomain {
	name: string;
	domain: string;
	reason: string;
	available: boolean | null;
	price: number;
	links: Record<string, string>;
}

interface StyleOptions {
	wordCount?: string | null; // 'one' | 'two' | 'three' | null
	wordStyle?: string | null; // 'real' | 'minor-error' | 'invented' | null
}

function buildPrompt(
	description: string,
	tlds: string[],
	count: number,
	liked: string[],
	disliked: string[],
	styleOptions?: StyleOptions
): string {
	let likedSection = '';
	if (liked.length > 0) {
		likedSection = `\nThe user has LIKED these domains in the past (generate similar styles):\n${liked.slice(0, 10).join(', ')}\n`;
	}

	let dislikedSection = '';
	if (disliked.length > 0) {
		dislikedSection = `\nThe user has DISLIKED these domains (avoid similar patterns):\n${disliked.slice(0, 10).join(', ')}\n`;
	}

	// Build style constraints based on picker selections
	let styleConstraints = '';
	if (styleOptions?.wordCount) {
		const wordCountMap: Record<string, string> = {
			'one': '- IMPORTANT: Use only single-word domain names (one word before the TLD)',
			'two': '- IMPORTANT: Use two-word compound domain names (two words combined before the TLD)',
			'three': '- IMPORTANT: Use three or more words combined in domain names'
		};
		styleConstraints += (wordCountMap[styleOptions.wordCount] || '') + '\n';
	}

	if (styleOptions?.wordStyle) {
		const wordStyleMap: Record<string, string> = {
			'real': '- IMPORTANT: Use only real, correctly spelled English words (no made-up words or misspellings)',
			'minor-error': '- IMPORTANT: Use creative misspellings of real words (like "lyft", "tumblr", "fiverr" - drop vowels or swap letters)',
			'invented': '- IMPORTANT: Use completely invented/made-up words that sound good but are not real words'
		};
		styleConstraints += (wordStyleMap[styleOptions.wordStyle] || '') + '\n';
	}

	const tldsStr = tlds.length > 0 ? tlds.join(', ') : '.com, .dev, .ai';

	return `Generate ${count * 6} creative domain name suggestions based on this description:

"${description}"

Requirements:
- Use these TLDs: ${tldsStr}
- Names should be short (ideally under 12 characters before TLD)
- Names should be memorable and brandable
${styleConstraints}- Each domain should be unique and creative
- IMPORTANT: Prefer unusual words that are likely to be AVAILABLE (not registered)
- Avoid common English words or obvious tech terms that are likely taken
${likedSection}${dislikedSection}
For each domain, provide a brief reason why it's a good fit (10-15 words max).

Output format (one per line):
domain.tld | reason why it's a good fit

Example:
zephyra.io | Evokes speed and air, sounds modern and tech-forward
brandify.com | Suggests transformation and branding, easy to remember
nexvault.ai | Combines "next" and "vault", implies secure future tech`;
}

function parseDomains(responseText: string): ParsedDomain[] {
	const lines = responseText.trim().split('\n');
	const results: ParsedDomain[] = [];
	const seen = new Set<string>();

	for (let line of lines) {
		line = line.trim();
		if (!line) continue;

		// Remove numbering (1. domain.com -> domain.com)
		line = line.replace(/^\d+[\.\)]\s*/, '');
		// Remove markdown formatting
		line = line.replace(/[`*_]/g, '');

		let domain: string;
		let reason: string;

		if (line.includes('|')) {
			const parts = line.split('|', 2);
			domain = parts[0].trim();
			reason = parts[1]?.trim() ?? '';
		} else {
			domain = line;
			reason = '';
		}

		domain = normalizeDomain(domain);

		if (isValidDomain(domain) && !seen.has(domain)) {
			seen.add(domain);
			results.push({ domain, reason });
		}
	}

	return results;
}

export async function generateDomains(
	apiKey: string,
	description: string,
	count: number,
	tlds: string,
	checkAvailability: boolean,
	db?: D1Database,
	whoisApiUrl?: string,
	styleOptions?: StyleOptions
): Promise<{ suggestions: GeneratedDomain[]; usage: Usage }> {
	const tldsList = tlds.split(',').map((t) => t.trim());

	// Get user preferences if db available
	let liked: string[] = [];
	let disliked: string[] = [];
	if (db) {
		liked = await getLikedDomains(db, 20);
		disliked = await getDislikedDomains(db, 20);
	}

	const prompt = buildPrompt(description, tldsList, count, liked, disliked, styleOptions);

	const client = new Anthropic({ apiKey });
	const message = await client.messages.create({
		model: 'claude-3-5-haiku-20241022',
		max_tokens: 2048,
		messages: [{ role: 'user', content: prompt }]
	});

	// Calculate usage and cost (Claude Haiku pricing: $0.25/M input, $1.25/M output)
	const inputTokens = message.usage.input_tokens;
	const outputTokens = message.usage.output_tokens;
	const inputCost = (inputTokens / 1_000_000) * 0.25;
	const outputCost = (outputTokens / 1_000_000) * 1.25;
	const totalCost = inputCost + outputCost;

	const usage: Usage = {
		input_tokens: inputTokens,
		output_tokens: outputTokens,
		total_tokens: inputTokens + outputTokens,
		cost_usd: Math.round(totalCost * 10000) / 10000
	};

	// Parse response
	const responseText = message.content[0].type === 'text' ? message.content[0].text : '';
	const candidateDomains = parseDomains(responseText);

	// Check availability if requested
	let availability = new Map<string, boolean | null>();
	if (checkAvailability) {
		const allDomains = candidateDomains.map((d) => d.domain);
		availability = await checkAvailabilityBatch(allDomains, whoisApiUrl);
	}

	// Build results (only show available domains when checking availability)
	const suggestions: GeneratedDomain[] = [];
	for (const item of candidateDomains) {
		if (suggestions.length >= count) break;

		const isAvailable = availability.get(item.domain);

		// Skip taken domains when availability checking is enabled
		if (checkAvailability && isAvailable === false) {
			continue;
		}

		const name = item.domain.split('.')[0];

		suggestions.push({
			name,
			domain: item.domain,
			reason: item.reason,
			available: checkAvailability ? isAvailable ?? null : null,
			price: getPrice(item.domain),
			links: getPurchaseLinks(item.domain)
		});
	}

	return { suggestions, usage };
}
