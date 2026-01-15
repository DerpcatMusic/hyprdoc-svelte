<script lang="ts">
  /**
   * EditorBranding - Document Logo Overlay
   *
   * Overlays the user's brand logo on the document paper.
   * Supports dynamic color tinting via CSS masks and reactive positioning.
   */
  import { useQuery } from "convex-svelte";
  import { fade } from "svelte/transition";
  import { api } from "@/convex/_generated/api";
  import { cn } from "$lib/utils";

  // Fetch user branding info reactively
  const userQuery = useQuery(api.users.queries.me, {});
  const user = $derived(userQuery.data);

  // Derived logic for branding visibility and styles
  const branding = $derived.by(() => {
    if (!(user?.brandEnabled && user?.brandLogoUrl)) return null;

    return {
      url: user.brandLogoUrl,
      color: user.brandLogoColor,
      position: user.brandLogoPosition || "center",
    };
  });

  // CSS Mask Styles for tinted logos
  const maskStyles = $derived(
    branding?.color
      ? `
		background-color: ${branding.color};
		mask-image: url(${branding.url});
		-webkit-mask-image: url(${branding.url});
		mask-size: contain;
		-webkit-mask-size: contain;
		mask-repeat: no-repeat;
		mask-position: center;
	`
      : ""
  );
</script>

{#if branding}
  <div
    class={cn(
			"pointer-events-none absolute top-12 z-40 opacity-70 transition-all duration-700 ease-in-out",
			branding.position === 'left' && "left-16",
			branding.position === 'right' && "right-16",
			branding.position === 'center' && "left-1/2 -translate-x-1/2"
		)}
    transition:fade={{ duration: 400 }}
  >
    <div class="relative h-20 w-48">
      {#if branding.color}
        <!-- Tinted Logo via Mask -->
        <div class="absolute inset-0 h-full w-full" style={maskStyles}></div>
      {:else}
        <!-- Original Colored Logo -->
        <img
          src={branding.url}
          alt="Brand Logo"
          class="h-full w-full object-contain mix-blend-multiply dark:mix-blend-screen"
        >
      {/if}
    </div>
  </div>
{/if}
