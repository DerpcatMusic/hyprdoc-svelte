<script lang="ts">
	import type { ConvexClient } from 'convex/browser';
	import { setConvexClientContext } from 'convex-svelte';
	import { browser } from '$app/environment';

	interface Props {
		client: ConvexClient;
		accessToken?: string | null;
		children?: import('svelte').Snippet;
	}

	const { client, accessToken, children }: Props = $props();

	// Set context for convex-svelte hooks - must be synchronous at init time
	// Svelte warning about initial capture is expected - client won't change
	// svelte-ignore state_referenced_locally
	setConvexClientContext(client);

	// Configure auth using SSR-hydrated token - NO network request needed!
	$effect(() => {
		if (!browser) return;

		const currentToken = accessToken;
		const currentClient = client;
		// Use the token passed from SSR directly
		currentClient.setAuth(async () => currentToken ?? null);
	});
</script>

{@render children?.()}

