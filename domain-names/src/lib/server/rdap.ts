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

/**
 * Check domain availability using RDAP (HTTP-based WHOIS replacement)
 * Returns: true = available, false = taken, null = unknown
 */
export async function checkAvailability(domain: string): Promise<boolean | null> {
	try {
		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), 5000);

		const res = await fetch(`https://rdap.org/domain/${domain}`, {
			signal: controller.signal,
			headers: { Accept: 'application/rdap+json' }
		});

		clearTimeout(timeout);

		// 404 = domain not found = available
		if (res.status === 404) return true;
		// 200 = domain found = taken
		if (res.status === 200) return false;
		// Other status = unknown
		return null;
	} catch {
		return null;
	}
}

/**
 * Check multiple domains in parallel
 */
export async function checkAvailabilityBatch(
	domains: string[]
): Promise<Map<string, boolean | null>> {
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
