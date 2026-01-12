import os
import re
from anthropic import Anthropic
import database
from domain_checker import check_domain_available, normalize_domain, is_valid_domain, get_price, get_purchase_links


def get_client() -> Anthropic:
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        raise ValueError("ANTHROPIC_API_KEY environment variable not set")
    return Anthropic(api_key=api_key)


def build_prompt(description: str, tlds: list[str], count: int, liked: list[str], disliked: list[str]) -> str:
    """Build the prompt for Claude to generate domain suggestions."""

    liked_section = ""
    if liked:
        liked_section = f"""
The user has LIKED these domains in the past (generate similar styles):
{', '.join(liked[:10])}
"""

    disliked_section = ""
    if disliked:
        disliked_section = f"""
The user has DISLIKED these domains (avoid similar patterns):
{', '.join(disliked[:10])}
"""

    tlds_str = ", ".join(tlds) if tlds else ".com, .io, .ai"

    prompt = f"""Generate {count * 6} creative domain name suggestions based on this description:

"{description}"

Requirements:
- Use these TLDs: {tlds_str}
- Names should be short (ideally under 12 characters before TLD)
- Names should be memorable and brandable
- Mix different styles: made-up words, compound words, clever abbreviations
- Each domain should be unique and creative
- IMPORTANT: Prefer unusual, invented words that are likely to be AVAILABLE (not registered)
- Avoid common English words or obvious tech terms that are likely taken
{liked_section}
{disliked_section}
For each domain, provide a brief reason why it's a good fit (10-15 words max).

Output format (one per line):
domain.tld | reason why it's a good fit

Example:
zephyra.io | Evokes speed and air, sounds modern and tech-forward
brandify.com | Suggests transformation and branding, easy to remember
nexvault.ai | Combines "next" and "vault", implies secure future tech"""

    return prompt


def parse_domains(response_text: str) -> list[dict]:
    """Parse domain names and reasons from Claude's response."""
    lines = response_text.strip().split("\n")
    results = []
    seen_domains = set()

    for line in lines:
        line = line.strip()
        # Skip empty lines
        if not line:
            continue
        # Remove any numbering (1. domain.com -> domain.com)
        line = re.sub(r"^\d+[\.\)]\s*", "", line)
        # Remove any markdown formatting
        line = line.strip("`*_")

        # Split domain and reason
        if "|" in line:
            parts = line.split("|", 1)
            domain_part = parts[0].strip()
            reason = parts[1].strip() if len(parts) > 1 else ""
        else:
            domain_part = line
            reason = ""

        # Normalize and validate
        domain = normalize_domain(domain_part)
        if is_valid_domain(domain) and domain not in seen_domains:
            seen_domains.add(domain)
            results.append({"domain": domain, "reason": reason})

    return results


def generate_domains(count: int = 25) -> tuple[list[dict], dict]:
    """
    Generate domain suggestions using Claude AI.
    Returns a tuple of (available domains with price/links, usage stats).
    """
    # Get settings
    settings = database.get_all_settings()
    description = settings.get("description", "tech startup domain")
    tlds_str = settings.get("tlds", ".com,.io,.ai")
    tlds = [t.strip() for t in tlds_str.split(",")]

    # Get user preferences for context
    liked = database.get_liked_domains(20)
    disliked = database.get_disliked_domains(20)

    # Build prompt and call Claude
    prompt = build_prompt(description, tlds, count, liked, disliked)

    client = get_client()
    message = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=2048,
        messages=[
            {"role": "user", "content": prompt}
        ]
    )

    # Calculate usage and cost (Claude Sonnet pricing: $3/M input, $15/M output)
    input_tokens = message.usage.input_tokens
    output_tokens = message.usage.output_tokens
    input_cost = (input_tokens / 1_000_000) * 3.0
    output_cost = (output_tokens / 1_000_000) * 15.0
    total_cost = input_cost + output_cost

    usage = {
        "input_tokens": input_tokens,
        "output_tokens": output_tokens,
        "total_tokens": input_tokens + output_tokens,
        "cost_usd": round(total_cost, 4),
    }

    # Parse response
    response_text = message.content[0].text
    candidate_domains = parse_domains(response_text)

    # Check availability and filter
    available_domains = []
    for item in candidate_domains:
        if len(available_domains) >= count:
            break
        if check_domain_available(item["domain"]):
            available_domains.append({
                "domain": item["domain"],
                "reason": item["reason"],
                "price": get_price(item["domain"]),
                "links": get_purchase_links(item["domain"]),
            })

    return available_domains, usage


def generate_domains_with_params(
    description: str,
    count: int = 10,
    tlds: str = ".com,.io,.ai",
    check_availability: bool = True
) -> tuple[list[dict], dict]:
    """
    Generate domain suggestions with explicit parameters (for API use).
    Returns a tuple of (domains list, usage stats).
    """
    tlds_list = [t.strip() for t in tlds.split(",")]

    # Build prompt and call Claude
    prompt = build_prompt(description, tlds_list, count, [], [])

    client = get_client()
    message = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=2048,
        messages=[
            {"role": "user", "content": prompt}
        ]
    )

    # Calculate usage and cost
    input_tokens = message.usage.input_tokens
    output_tokens = message.usage.output_tokens
    input_cost = (input_tokens / 1_000_000) * 3.0
    output_cost = (output_tokens / 1_000_000) * 15.0
    total_cost = input_cost + output_cost

    usage = {
        "input_tokens": input_tokens,
        "output_tokens": output_tokens,
        "total_tokens": input_tokens + output_tokens,
        "cost_usd": round(total_cost, 4),
    }

    # Parse response
    response_text = message.content[0].text
    candidate_domains = parse_domains(response_text)

    # Check availability if requested
    results = []
    for item in candidate_domains:
        if len(results) >= count:
            break

        domain = item["domain"]
        name = domain.rsplit(".", 1)[0]  # Get name without TLD

        if check_availability:
            if check_domain_available(domain):
                results.append({
                    "name": name,
                    "domain": domain,
                    "reason": item["reason"],
                    "available": True
                })
        else:
            results.append({
                "name": name,
                "domain": domain,
                "reason": item["reason"],
                "available": None  # Unknown
            })

    return results, usage


def generate_and_store_suggestions() -> dict:
    """
    Generate new domain suggestions and store them in the database.
    Returns dict with suggestions list and usage stats.
    """
    # Get desired count from settings
    count = int(database.get_setting("daily_count") or "25")

    # Expire old pending suggestions
    database.expire_old_suggestions()

    # Generate new domains
    domain_results, usage = generate_domains(count)

    # Store in database
    suggestions = []
    for item in domain_results:
        reason = item.get("reason", "")
        suggestion_id = database.add_suggestion(item["domain"], available=True, reason=reason)
        suggestions.append({
            "id": suggestion_id,
            "domain": item["domain"],
            "reason": reason,
            "price": item["price"],
            "links": item["links"],
            "status": "pending",
            "available": True
        })

    return {"suggestions": suggestions, "usage": usage}
