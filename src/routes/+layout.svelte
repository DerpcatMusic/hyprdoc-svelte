<script lang="ts">
import { setupConvex, useConvexClient } from 'convex-svelte';
import { PUBLIC_CONVEX_URL } from '$env/static/public';
import favicon from '$lib/assets/favicon.svg';
import 'virtual:uno.css';
import '../app.css';
import { ModeWatcher } from 'mode-watcher';
import { Toaster } from 'svelte-sonner';
import { setAuthState } from '$lib/stores/auth-state.svelte';
import { setNavState } from '$lib/stores/nav-state.svelte';
import UserSync from '$lib/components/UserSync.svelte';
import LiquidGlassFilters from '$lib/components/ui/LiquidGlassFilters.svelte';
import { untrack } from 'svelte';

const { children, data } = $props();

// Global State Initialization
const authState = setAuthState(untrack(() => data.session));
const navState = setNavState();

// Derived values from data to avoid reactivity warnings
const session = $derived(data.session);
const hasSession = $derived(!!session?.accessToken);

// Setup Convex
// We call this once, but it can handle auth changes via client.setAuth
setupConvex(PUBLIC_CONVEX_URL, {
	expectAuth: untrack(() => hasSession) // Use initial value for config
});
const client = useConvexClient();

// Immediate Auth Set (for initial load speed & stability)
if (untrack(() => data.session?.accessToken)) {
	const token = untrack(() => data.session!.accessToken);
	client.setAuth(async () => {
		return token;
	});
}

// Reactive Auth Sync (for upgrades/updates)
$effect(() => {
	authState.setSession(session);
	const token = session?.accessToken;
	console.log('[ConvexAuth] Syncing auth state. Token present:', !!token);
	
	client.setAuth(async () => {
		if (token) console.debug('[ConvexAuth] Minting/Returning token for request');
		return token || null;
	});
});
</script>

<svelte:head>
	<link rel="icon" href={favicon}>
	<title>HyprDoc</title>
	<meta name="description" content="The God-tier contract platform">
</svelte:head>

<ModeWatcher />
<Toaster />

{#if authState.isLoading}
	<div class="flex h-screen w-full items-center justify-center">
		<div
			class="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"
		></div>
	</div>
{:else}
	{#if authState.isAuthenticated}
		<UserSync />
	{/if}
	<LiquidGlassFilters />
	{@render children()}
{/if}
