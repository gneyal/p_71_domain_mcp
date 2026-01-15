// TLD pricing (yearly estimates)
export const TLD_PRICES: Record<string, number> = {
	'.com': 10.98,
	'.io': 32.98,
	'.ai': 79.98,
	'.co': 11.98,
	'.net': 12.98,
	'.org': 12.98,
	'.dev': 14.98,
	'.app': 14.98,
	'.tech': 9.98,
	'.xyz': 2.98,
	'.me': 8.98,
	'.cc': 12.98,
	'.gg': 24.98,
	'.sh': 29.98,
	'.ly': 39.98
};

// FastAPI backend URL for WHOIS lookups (local development)
// Set via environment or passed to functions
let whoisApiUrl = '';

/**
 * Check domain availability using RDAP
 * Returns: true = available, false = taken, null = unknown
 */
export async function checkAvailability(domain: string): Promise<boolean | null> {
	try {
		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), 8000);

		const requestUrl = `https://rdap.org/domain/${domain}`;
		const res = await fetch(requestUrl, {
			signal: controller.signal,
			headers: { Accept: 'application/rdap+json' }
		});

		clearTimeout(timeout);

		// Check if we were redirected (means TLD is supported)
		const wasRedirected = res.url !== requestUrl;

		// If 404 without redirect, TLD not supported
		if (res.status === 404 && !wasRedirected) {
			console.log(`RDAP: ${domain} -> TLD not supported`);
			return null;
		}

		// 404 after redirect = available
		if (res.status === 404) {
			console.log(`RDAP: ${domain} -> available`);
			return true;
		}

		// 200 = taken
		if (res.status === 200) {
			console.log(`RDAP: ${domain} -> taken`);
			return false;
		}

		console.log(`RDAP: ${domain} -> unknown status ${res.status}`);
		return null;
	} catch (e) {
		console.log(`RDAP: ${domain} -> error: ${e}`);
		return null;
	}
}

/**
 * Set the WHOIS API URL for domain checking
 */
export function setWhoisApiUrl(url: string) {
	whoisApiUrl = url;
}

/**
 * Check multiple domains using FastAPI WHOIS backend
 */
async function checkAvailabilityViaWhois(
	domains: string[],
	apiUrl: string
): Promise<Map<string, boolean | null>> {
	const results = new Map<string, boolean | null>();

	try {
		const res = await fetch(`${apiUrl}/api/check-domains`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ domains })
		});

		if (!res.ok) {
			console.error(`WHOIS API error: ${res.status}`);
			// Fall back to null for all domains
			domains.forEach((d) => results.set(d, null));
			return results;
		}

		const data = await res.json();
		for (const [domain, available] of Object.entries(data.results)) {
			results.set(domain, available as boolean | null);
		}

		// Log results
		for (const [domain, available] of results) {
			const status = available === true ? 'available' : available === false ? 'taken' : 'unknown';
			console.log(`WHOIS: ${domain} -> ${status}`);
		}
	} catch (e) {
		console.error(`WHOIS API error: ${e}`);
		domains.forEach((d) => results.set(d, null));
	}

	return results;
}

/**
 * Check multiple domains in parallel (uses WHOIS if configured, otherwise RDAP)
 */
export async function checkAvailabilityBatch(
	domains: string[],
	whoisUrl?: string
): Promise<Map<string, boolean | null>> {
	// Use WHOIS API if provided or configured (local development)
	const apiUrl = whoisUrl || whoisApiUrl;
	if (apiUrl) {
		console.log(`Using WHOIS API at ${apiUrl}`);
		return checkAvailabilityViaWhois(domains, apiUrl);
	}

	// Fall back to RDAP
	const results = new Map<string, boolean | null>();

	const checks = domains.map(async (domain) => {
		const available = await checkAvailability(domain);
		results.set(domain, available);
	});

	await Promise.all(checks);
	return results;
}

/**
 * Get TLD from domain
 */
export function getTld(domain: string): string {
	const parts = domain.split('.');
	return parts.length > 1 ? '.' + parts[parts.length - 1] : '';
}

/**
 * Get price for domain based on TLD
 */
export function getPrice(domain: string): number {
	const tld = getTld(domain);
	return TLD_PRICES[tld] ?? 14.98;
}

/**
 * Generate purchase links for registrars
 */
export function getPurchaseLinks(domain: string): Record<string, string> {
	const encoded = encodeURIComponent(domain);
	return {
		namecheap: `https://www.namecheap.com/domains/registration/results/?domain=${encoded}`,
		godaddy: `https://www.godaddy.com/domainsearch/find?domainToCheck=${encoded}`,
		porkbun: `https://porkbun.com/checkout/search?q=${encoded}`
	};
}

/**
 * Validate domain format
 */
export function isValidDomain(domain: string): boolean {
	if (!domain || !domain.includes('.')) return false;
	const parts = domain.split('.');
	return parts.every(
		(part) =>
			part.length > 0 &&
			/^[a-z0-9-]+$/i.test(part) &&
			!part.startsWith('-') &&
			!part.endsWith('-')
	);
}

/**
 * Normalize domain (lowercase, trim)
 */
export function normalizeDomain(domain: string): string {
	return domain.toLowerCase().trim().replace(/^(https?:\/\/)?(www\.)?/, '').replace(/\/$/, '');
}
