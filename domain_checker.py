import whois
import time
from functools import lru_cache
from typing import Optional
from urllib.parse import quote

# Estimated prices per TLD (first year registration)
TLD_PRICES = {
    ".com": 10.98,
    ".io": 32.98,
    ".ai": 79.98,
    ".co": 11.98,
    ".net": 12.98,
    ".org": 12.98,
    ".dev": 14.98,
    ".app": 14.98,
    ".tech": 9.98,
    ".xyz": 2.98,
    ".me": 8.98,
    ".cc": 12.98,
    ".gg": 24.98,
    ".sh": 29.98,
    ".ly": 39.98,
}


# Cache WHOIS results for 1 hour (3600 seconds)
@lru_cache(maxsize=1000)
def _cached_whois_lookup(domain: str, cache_time: int) -> bool:
    """
    Check if a domain is available via WHOIS lookup.
    cache_time is used to invalidate cache (pass hour timestamp).
    Returns True if available, False if taken.
    """
    try:
        w = whois.whois(domain)
        # If domain_name is None or empty, domain is likely available
        if w.domain_name is None:
            return True
        # Some registrars return the domain name if registered
        return False
    except whois.parser.PywhoisError:
        # WHOIS lookup failed - domain likely available
        return True
    except Exception:
        # On error, assume taken to be safe
        return False


def check_domain_available(domain: str) -> bool:
    """
    Check if a domain is available.
    Results are cached per hour to avoid excessive lookups.
    """
    # Use hour timestamp for cache invalidation
    cache_time = int(time.time() // 3600)
    return _cached_whois_lookup(domain, cache_time)


def check_domains_batch(domains: list[str], delay: float = 1.0) -> dict[str, bool]:
    """
    Check availability of multiple domains with rate limiting.
    Returns dict mapping domain -> available (True/False).
    """
    results = {}
    for domain in domains:
        results[domain] = check_domain_available(domain)
        # Rate limit to avoid getting blocked
        if len(domains) > 1:
            time.sleep(delay)
    return results


def normalize_domain(domain: str) -> str:
    """Normalize domain name (lowercase, strip whitespace)."""
    domain = domain.lower().strip()
    # Remove protocol if present
    if domain.startswith("http://"):
        domain = domain[7:]
    if domain.startswith("https://"):
        domain = domain[8:]
    # Remove trailing slash
    domain = domain.rstrip("/")
    # Remove www. prefix
    if domain.startswith("www."):
        domain = domain[4:]
    return domain


def is_valid_domain(domain: str) -> bool:
    """Basic validation for domain format."""
    domain = normalize_domain(domain)
    if not domain:
        return False
    # Must have at least one dot
    if "." not in domain:
        return False
    parts = domain.split(".")
    # Check each part
    for part in parts:
        if not part:
            return False
        if not part.replace("-", "").isalnum():
            return False
        if part.startswith("-") or part.endswith("-"):
            return False
    return True


def get_tld(domain: str) -> str:
    """Extract TLD from domain."""
    domain = normalize_domain(domain)
    if "." in domain:
        return "." + domain.split(".")[-1]
    return ""


def get_price(domain: str) -> float:
    """Get estimated price for a domain based on TLD."""
    tld = get_tld(domain)
    return TLD_PRICES.get(tld, 14.98)  # Default price if TLD not in list


def get_purchase_links(domain: str) -> dict:
    """Generate purchase links for various registrars."""
    encoded = quote(domain)
    return {
        "namecheap": f"https://www.namecheap.com/domains/registration/results/?domain={encoded}",
        "godaddy": f"https://www.godaddy.com/domainsearch/find?domainToCheck={encoded}",
        "porkbun": f"https://porkbun.com/checkout/search?q={encoded}",
    }


def get_domain_info(domain: str) -> dict:
    """Get full domain info including availability, price, and links."""
    available = check_domain_available(domain)
    return {
        "domain": domain,
        "available": available,
        "price": get_price(domain),
        "tld": get_tld(domain),
        "links": get_purchase_links(domain) if available else {},
    }
