<script lang="ts">
  import { ConvexClient } from "convex/browser";
  import { PUBLIC_CONVEX_URL } from "$env/static/public";
  import favicon from "$lib/assets/favicon.svg";
  import "virtual:uno.css";
  import "../app.css";
  import "$lib/styles/editor.css";
  import { ModeWatcher } from "mode-watcher";
  import { Toaster } from "svelte-sonner";
  import LiquidGlassFilters from "$lib/components/ui/LiquidGlassFilters.svelte";
  import { authState } from "$lib/auth/AuthState.svelte";
  import ConvexClientProvider from "$lib/components/ConvexClientProvider.svelte";
  import { setNavState } from "$lib/stores/nav-state.svelte";

  const { children, data } = $props();

  // Initialize Auth State with Server Data (runs once)
  $effect(() => {
    authState.setAuth(data.user, data.accessToken);
  });

  // Create Convex Client (singleton)
  const client = new ConvexClient(PUBLIC_CONVEX_URL);
  
  // Initialize Global Nav State
  setNavState();
</script>

<svelte:head>
  <link rel="icon" href={favicon}>
  <title>HyprDoc</title>
  <meta name="description" content="The God-tier contract platform">
</svelte:head>

<ModeWatcher />
<Toaster />

<ConvexClientProvider {client} accessToken={data.accessToken}>
  <LiquidGlassFilters />
  {@render children()}
</ConvexClientProvider>

