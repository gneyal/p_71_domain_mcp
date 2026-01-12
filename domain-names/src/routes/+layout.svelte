<script>
	import '../app.css';
	let { children } = $props();
</script>

<svelte:head>
	<title>Domain AI Agent</title>
	<meta name="description" content="AI-powered domain name and brand name generator" />
</svelte:head>

{@render children()}
