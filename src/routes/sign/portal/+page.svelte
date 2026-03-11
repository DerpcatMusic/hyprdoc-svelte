<script lang="ts">
  import { page } from '$app/stores';
  import { SigningView } from '$lib/components/editor/signing';

  // Get the access token from URL params
  const accessToken = $derived($page.url.searchParams.get('token') ?? '');
</script>

<svelte:head>
  <title>Sign Document | HyprSign</title>
  <meta name="robots" content="noindex, nofollow" />
</svelte:head>

{#if accessToken}
  <SigningView {accessToken} />
{:else}
  <div class="min-h-screen flex items-center justify-center bg-background">
    <div class="text-center space-y-4">
      <h1 class="text-2xl font-bold text-foreground">Invalid Signing Link</h1>
      <p class="text-muted-foreground">
        This signing link is invalid or has expired. Please check your email for the correct link.
      </p>
    </div>
  </div>
{/if}
