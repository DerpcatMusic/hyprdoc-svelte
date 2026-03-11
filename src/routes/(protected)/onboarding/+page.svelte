<script lang="ts">
  import OnboardingWizard from "$lib/components/onboarding/OnboardingWizard.svelte";
  import { useUser } from "$lib/convex/hooks";
  import { invalidateAll, goto } from "$app/navigation";
  import { page } from "$app/state";

  let { data } = $props();
  
  // WorkOS User ID from load function (protected route)
  const userQuery = useUser(() => data.user.id);

  async function handleComplete() {
    await invalidateAll();
    await goto("/dashboard", { replaceState: true });
  }
</script>

<svelte:head>
  <title>Onboarding | HyprDoc</title>
</svelte:head>

{#if userQuery.isLoading}
  <div class="grid min-h-screen place-items-center bg-background">
    <div class="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
  </div>
{:else if userQuery.data}
  <OnboardingWizard user={userQuery.data} onComplete={handleComplete} />
{/if}
