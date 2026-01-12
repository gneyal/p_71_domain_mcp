# Domain AI Agent

AI-powered domain name and brand name generator. Generate creative, memorable, brandable names for your startup, product, or project.

**Live at: [domain-names.autobirds.com](https://domain-names.autobirds.com)**

Built by [AutoBirds](https://autobirds.com).

## Features

- **AI-Powered Generation** - Uses Claude AI to generate creative, unique names
- **Domain Availability** - Checks WHOIS to find available domains
- **Multiple TLDs** - Support for .com, .io, .ai, .co, and more
- **Price Estimates** - Shows estimated yearly pricing for each domain
- **Purchase Links** - Direct links to Namecheap, GoDaddy, and Porkbun
- **Learning** - Remembers your likes/dislikes to improve suggestions
- **REST API** - Programmatic access for integrations
- **MCP Server** - Use directly in Claude Desktop or Claude Code

## Quick Start

### 1. Clone and Install

```bash
git clone git@github.com:gneyal/p_71_domain_mcp.git
cd p_71_domain_mcp
pip install -r requirements.txt
```

### 2. Configure

```bash
cp .env.example .env
# Edit .env and add your Anthropic API key
```

### 3. Run

```bash
python main.py
# Opens at http://127.0.0.1:8080
```

## Usage

### Web UI

Visit `http://127.0.0.1:8080` and describe what kind of names you're looking for. Click "Generate Domains" to get AI-powered suggestions.

### REST API

```bash
curl -X POST http://127.0.0.1:8080/api/v1/generate \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Modern fintech startup",
    "count": 10,
    "tlds": ".com,.io,.ai",
    "check_availability": false
  }'
```

**Parameters:**
- `description` (required) - What kind of names you want
- `count` - Number of suggestions (default: 10, max: 50)
- `tlds` - Comma-separated TLDs (default: ".com,.io,.ai")
- `check_availability` - Check domain availability (default: true)

### MCP Server

Add to Claude Desktop (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "domain-name-generator": {
      "command": "python",
      "args": ["/path/to/p_71_domain_mcp/mcp_server.py"]
    }
  }
}
```

Or add to Claude Code:

```bash
claude mcp add domain-name-generator python /path/to/p_71_domain_mcp/mcp_server.py
```

Then ask Claude: "Generate 10 name ideas for a fintech startup"

## Project Structure

```
├── main.py              # FastAPI web server
├── agent.py             # Claude AI integration
├── domain_checker.py    # WHOIS availability checking
├── database.py          # SQLite storage
├── scheduler.py         # Daily job scheduler
├── mcp_server.py        # MCP server for Claude
├── static/
│   └── app.js           # Frontend JavaScript
└── templates/
    ├── index.html       # Main web UI
    ├── api.html         # API documentation
    ├── mcp.html         # MCP documentation
    └── privacy.html     # Privacy & Terms
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | Yes | Your Anthropic API key |
| `RESEND_API_KEY` | No | For email subscriptions |
| `POSTHOG_API_KEY` | No | For analytics |

## Tech Stack

- **Backend**: Python, FastAPI
- **AI**: Anthropic Claude API
- **Frontend**: Tailwind CSS, Vanilla JS
- **Database**: SQLite
- **Domain Check**: python-whois

## License

MIT

## Links

- [Live App](https://domain-names.autobirds.com)
- [API Documentation](https://domain-names.autobirds.com/api)
- [MCP Documentation](https://domain-names.autobirds.com/mcp)
- [Privacy & Terms](https://domain-names.autobirds.com/privacy)
