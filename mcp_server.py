#!/usr/bin/env python3
"""
MCP Server for Domain/Brand Name Generation.

This server exposes the name generation functionality via the Model Context Protocol,
allowing AI assistants to generate creative domain and brand names.
"""

import json
import sys
from typing import Any

# Add the project directory to path
sys.path.insert(0, __file__.rsplit("/", 1)[0])

from dotenv import load_dotenv
load_dotenv()

from agent import generate_domains_with_params
from domain_checker import get_price, get_purchase_links


def send_response(response: dict):
    """Send a JSON-RPC response."""
    print(json.dumps(response), flush=True)


def handle_initialize(request_id: Any, params: dict) -> dict:
    """Handle the initialize request."""
    return {
        "jsonrpc": "2.0",
        "id": request_id,
        "result": {
            "protocolVersion": "2024-11-05",
            "capabilities": {
                "tools": {}
            },
            "serverInfo": {
                "name": "domain-name-generator",
                "version": "1.0.0"
            }
        }
    }


def handle_tools_list(request_id: Any) -> dict:
    """Handle tools/list request."""
    return {
        "jsonrpc": "2.0",
        "id": request_id,
        "result": {
            "tools": [
                {
                    "name": "generate_names",
                    "description": "Generate creative domain and brand name suggestions using AI. Perfect for naming startups, products, projects, or any creative endeavor.",
                    "inputSchema": {
                        "type": "object",
                        "properties": {
                            "description": {
                                "type": "string",
                                "description": "Describe what kind of names you're looking for. Be specific about the tone, industry, and style you want."
                            },
                            "count": {
                                "type": "integer",
                                "description": "Number of name suggestions to generate (default: 10, max: 50)",
                                "default": 10
                            },
                            "tlds": {
                                "type": "string",
                                "description": "Comma-separated TLDs like '.com,.io,.ai' (default: '.com,.io,.ai')",
                                "default": ".com,.io,.ai"
                            },
                            "check_availability": {
                                "type": "boolean",
                                "description": "Whether to check domain availability via WHOIS. Set to false for faster results.",
                                "default": False
                            }
                        },
                        "required": ["description"]
                    }
                }
            ]
        }
    }


def handle_tool_call(request_id: Any, params: dict) -> dict:
    """Handle tools/call request."""
    tool_name = params.get("name")
    arguments = params.get("arguments", {})

    if tool_name != "generate_names":
        return {
            "jsonrpc": "2.0",
            "id": request_id,
            "error": {
                "code": -32601,
                "message": f"Unknown tool: {tool_name}"
            }
        }

    try:
        description = arguments.get("description", "")
        count = arguments.get("count", 10)
        tlds = arguments.get("tlds", ".com,.io,.ai")
        check_availability = arguments.get("check_availability", False)

        if not description:
            return {
                "jsonrpc": "2.0",
                "id": request_id,
                "error": {
                    "code": -32602,
                    "message": "description is required"
                }
            }

        # Generate names
        suggestions, usage = generate_domains_with_params(
            description=description,
            count=min(count, 50),
            tlds=tlds,
            check_availability=check_availability
        )

        # Add pricing and links
        for s in suggestions:
            s["price"] = get_price(s["domain"])
            s["links"] = get_purchase_links(s["domain"])

        # Format result as readable text
        result_lines = [f"Generated {len(suggestions)} name suggestions:\n"]
        for i, s in enumerate(suggestions, 1):
            avail = "✓ Available" if s.get("available") else "? Unknown" if s.get("available") is None else "✗ Taken"
            result_lines.append(f"{i}. **{s['name']}** ({s['domain']}) - ${s['price']:.0f}/yr")
            result_lines.append(f"   {s['reason']}")
            result_lines.append(f"   {avail}")
            result_lines.append("")

        result_lines.append(f"\n_API Usage: {usage['total_tokens']} tokens (${usage['cost_usd']:.4f})_")

        return {
            "jsonrpc": "2.0",
            "id": request_id,
            "result": {
                "content": [
                    {
                        "type": "text",
                        "text": "\n".join(result_lines)
                    }
                ]
            }
        }

    except Exception as e:
        return {
            "jsonrpc": "2.0",
            "id": request_id,
            "error": {
                "code": -32603,
                "message": str(e)
            }
        }


def main():
    """Main MCP server loop."""
    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue

        try:
            request = json.loads(line)
        except json.JSONDecodeError:
            continue

        request_id = request.get("id")
        method = request.get("method", "")
        params = request.get("params", {})

        if method == "initialize":
            send_response(handle_initialize(request_id, params))
        elif method == "notifications/initialized":
            # No response needed for notifications
            pass
        elif method == "tools/list":
            send_response(handle_tools_list(request_id))
        elif method == "tools/call":
            send_response(handle_tool_call(request_id, params))
        else:
            # Unknown method
            if request_id is not None:
                send_response({
                    "jsonrpc": "2.0",
                    "id": request_id,
                    "error": {
                        "code": -32601,
                        "message": f"Method not found: {method}"
                    }
                })


if __name__ == "__main__":
    main()
