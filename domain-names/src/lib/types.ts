export interface Suggestion {
	id: number;
	domain: string;
	reason: string;
	created_at: string;
	status: 'pending' | 'liked' | 'disliked' | 'expired';
	available: boolean | null;
	price?: number;
	links?: {
		namecheap: string;
		godaddy: string;
		porkbun: string;
	};
}

export interface Preference {
	id: number;
	domain: string;
	liked: boolean;
	reason: string | null;
	created_at: string;
}

export interface Settings {
	daily_count: string;
	description: string;
	tlds: string;
}

export interface Usage {
	input_tokens: number;
	output_tokens: number;
	total_tokens: number;
	cost_usd: number;
}

export interface GenerateRequest {
	description: string;
	count?: number;
	tlds?: string;
	check_availability?: boolean;
}

export interface GenerateResponse {
	suggestions: Suggestion[];
	usage: Usage;
}
