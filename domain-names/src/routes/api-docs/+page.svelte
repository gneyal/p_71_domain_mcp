<script>
</script>

<div class="max-w-3xl mx-auto px-6 py-16">
	<a href="/" class="text-gray-500 hover:text-gray-900 text-sm mb-8 inline-block">&larr; Back to Domain AI Agent</a>

	<h1 class="text-3xl font-semibold text-gray-900 tracking-tight mb-4">REST API</h1>
	<p class="text-gray-500 mb-8">Generate domain names programmatically for your applications.</p>

	<section class="mb-12">
		<h2 class="text-xl font-semibold text-gray-900 mb-4">Generate Names</h2>

		<div class="bg-gray-900 text-white rounded-xl p-4 font-mono text-sm overflow-x-auto mb-4">
			<pre>POST https://domains.autobirds.com/api/v1/generate</pre>
		</div>

		<h3 class="font-medium text-gray-900 mb-3">Request Body</h3>
		<div class="bg-gray-900 text-white rounded-xl p-4 font-mono text-sm overflow-x-auto mb-4">
<pre>{`{
  "description": "Modern fintech startup",
  "count": 10,
  "tlds": ".com,.dev,.ai",
  "check_availability": false
}`}</pre>
		</div>

		<h3 class="font-medium text-gray-900 mb-3">Parameters</h3>
		<div class="space-y-3 mb-6">
			<div class="border-b border-gray-100 pb-3">
				<div class="flex items-center gap-2 mb-1">
					<code class="text-sm font-mono bg-gray-100 px-2 py-0.5 rounded">description</code>
					<span class="text-xs text-red-500 font-medium">required</span>
					<span class="text-xs text-gray-500">string</span>
				</div>
				<p class="text-sm text-gray-600">What kind of names you're looking for.</p>
			</div>

			<div class="border-b border-gray-100 pb-3">
				<div class="flex items-center gap-2 mb-1">
					<code class="text-sm font-mono bg-gray-100 px-2 py-0.5 rounded">count</code>
					<span class="text-xs text-gray-500">integer, default: 10</span>
				</div>
				<p class="text-sm text-gray-600">Number of suggestions (max: 50).</p>
			</div>

			<div class="border-b border-gray-100 pb-3">
				<div class="flex items-center gap-2 mb-1">
					<code class="text-sm font-mono bg-gray-100 px-2 py-0.5 rounded">tlds</code>
					<span class="text-xs text-gray-500">string, default: ".com,.dev,.ai"</span>
				</div>
				<p class="text-sm text-gray-600">Comma-separated list of TLDs.</p>
			</div>

			<div>
				<div class="flex items-center gap-2 mb-1">
					<code class="text-sm font-mono bg-gray-100 px-2 py-0.5 rounded">check_availability</code>
					<span class="text-xs text-gray-500">boolean, default: true</span>
				</div>
				<p class="text-sm text-gray-600">Check domain availability via RDAP (slower but accurate).</p>
			</div>
		</div>

		<h3 class="font-medium text-gray-900 mb-3">Response</h3>
		<div class="bg-gray-900 text-white rounded-xl p-4 font-mono text-sm overflow-x-auto">
<pre>{`{
  "suggestions": [
    {
      "name": "finova",
      "domain": "finova.io",
      "reason": "Combines finance and innovation",
      "available": true,
      "price": 32.98,
      "links": {
        "namecheap": "https://...",
        "godaddy": "https://...",
        "porkbun": "https://..."
      }
    }
  ],
  "usage": {
    "input_tokens": 239,
    "output_tokens": 599,
    "total_tokens": 838,
    "cost_usd": 0.0097
  }
}`}</pre>
		</div>
	</section>

	<section class="mb-12">
		<h2 class="text-xl font-semibold text-gray-900 mb-4">Example with curl</h2>
		<div class="bg-gray-900 text-white rounded-xl p-4 font-mono text-sm overflow-x-auto">
<pre>{`curl -X POST https://domains.autobirds.com/api/v1/generate \\
  -H "Content-Type: application/json" \\
  -d '{
    "description": "AI productivity tool",
    "count": 5,
    "tlds": ".ai,.io",
    "check_availability": false
  }'`}</pre>
		</div>
	</section>

	<div class="mt-12 pt-8 border-t border-gray-200 text-center text-xs text-gray-500">
		<p class="mb-2">
			<a href="/mcp-docs" class="underline hover:text-gray-900">MCP Server</a>
			<span class="mx-2">·</span>
			<a href="/privacy" class="underline hover:text-gray-900">Privacy & Terms</a>
		</p>
		<p>Made by <a href="https://autobirds.com" target="_blank" class="font-semibold text-gray-900 hover:underline">AutoBirds</a></p>
	</div>
</div>
