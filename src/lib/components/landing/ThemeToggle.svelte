<script lang="ts">
  /**
   * ThemeToggle - Synced with global uiStore
   */
  import { Moon, Sun } from "lucide-svelte";
  import { modeToggle } from "$lib/stores/ui-store.svelte";

  const { isDark, toggleTheme } = modeToggle;
</script>

<button
  type="button"
  onclick={toggleTheme}
  class="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background/50 transition-all hover:bg-muted/50 active:scale-95"
  title="Toggle Theme"
>
  {#if isDark}
    <Sun class="h-5 w-5" />
  {:else}
    <Moon class="h-5 w-5" />
  {/if}
</button>
