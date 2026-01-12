<script>
</script>

<div class="max-w-3xl mx-auto px-6 py-16">
	<a href="/" class="text-gray-500 hover:text-gray-900 text-sm mb-8 inline-block">&larr; Back to Domain AI Agent</a>

	<h1 class="text-3xl font-semibold text-gray-900 tracking-tight mb-4">MCP Server</h1>
	<p class="text-gray-500 mb-8">Use the name generator directly in Claude Desktop or Claude Code.</p>

	<section class="mb-12">
		<h2 class="text-xl font-semibold text-gray-900 mb-4">What is MCP?</h2>
		<p class="text-gray-700 leading-relaxed mb-4">
			The <a href="https://modelcontextprotocol.io" target="_blank" class="text-blue-600 hover:underline">Model Context Protocol (MCP)</a>
			is an open standard that allows AI assistants to use external tools and services.
			By adding our MCP server, you can generate creative names directly in your AI conversations.
		</p>
	</section>

	<section class="mb-12">
		<h2 class="text-xl font-semibold text-gray-900 mb-4">Installation</h2>

		<div class="space-y-6">
			<div>
				<h3 class="font-medium text-gray-900 mb-3">1. Clone the repository</h3>
				<div class="bg-gray-900 text-white rounded-xl p-4 font-mono text-sm overflow-x-auto">
<pre>git clone git@github.com:gneyal/p_71_domain_mcp.git
cd p_71_domain_mcp
pip install -r requirements.txt</pre>
				</div>
			</div>

			<div>
				<h3 class="font-medium text-gray-900 mb-3">2. Set up your API key</h3>
				<p class="text-gray-600 text-sm mb-2">Create a <code class="bg-gray-100 px-1 rounded">.env</code> file:</p>
				<div class="bg-gray-900 text-white rounded-xl p-4 font-mono text-sm overflow-x-auto">
<pre>cp .env.example .env
# Edit .env and add your Anthropic API key
ANTHROPIC_API_KEY=sk-ant-...</pre>
				</div>
			</div>

			<div>
				<h3 class="font-medium text-gray-900 mb-3">3. Add to Claude Desktop</h3>
				<p class="text-gray-600 text-sm mb-2">Edit your config file:</p>
				<ul class="text-sm text-gray-600 mb-3 space-y-1">
					<li><strong>macOS:</strong> <code class="bg-gray-100 px-1 rounded">~/Library/Application Support/Claude/claude_desktop_config.json</code></li>
					<li><strong>Windows:</strong> <code class="bg-gray-100 px-1 rounded">%APPDATA%\Claude\claude_desktop_config.json</code></li>
				</ul>
				<div class="bg-gray-900 text-white rounded-xl p-4 font-mono text-sm overflow-x-auto">
<pre>{`{
  "mcpServers": {
    "domain-name-generator": {
      "command": "python",
      "args": ["/path/to/p_71_domain_mcp/mcp_server.py"]
    }
  }
}`}</pre>
				</div>
			</div>

			<div>
				<h3 class="font-medium text-gray-900 mb-3">4. Or add to Claude Code</h3>
				<div class="bg-gray-900 text-white rounded-xl p-4 font-mono text-sm overflow-x-auto">
<pre>claude mcp add domain-name-generator python /path/to/p_71_domain_mcp/mcp_server.py</pre>
				</div>
			</div>
		</div>
	</section>

	<section class="mb-12">
		<h2 class="text-xl font-semibold text-gray-900 mb-4">Usage</h2>
		<p class="text-gray-700 mb-4">Once installed, ask Claude naturally:</p>

		<div class="bg-gray-100 rounded-xl p-5">
			<p class="text-gray-600 text-sm mb-2">Example prompts:</p>
			<ul class="space-y-2 text-gray-800">
				<li>"Generate 10 name ideas for a fintech startup"</li>
				<li>"I need creative brand names for a sustainable fashion company"</li>
				<li>"Give me domain suggestions for an AI writing tool, use .ai and .io"</li>
				<li>"Find me available .com domains for a pet care app"</li>
			</ul>
		</div>
	</section>

	<div class="mt-12 pt-8 border-t border-gray-200 text-center text-xs text-gray-500">
		<p class="mb-2">
			<a href="/api-docs" class="underline hover:text-gray-900">REST API</a>
			<span class="mx-2">·</span>
			<a href="/privacy" class="underline hover:text-gray-900">Privacy & Terms</a>
		</p>
		<p>Made by <a href="https://autobirds.com" target="_blank" class="font-semibold text-gray-900 hover:underline">AutoBirds</a></p>
	</div>
</div>
