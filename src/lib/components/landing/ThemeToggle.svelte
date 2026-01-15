<script lang="ts">
  /**
   * ThemeToggle - Minimal Svelte 5 Placeholder
   */
  import { Moon, Sun } from "lucide-svelte";

  let isDark = $state(false);

  function toggleTheme() {
    isDark = !isDark;
    if (typeof document !== "undefined") {
      document.documentElement.classList.toggle("dark", isDark);
    }
  }
</script>

<button
  onclick={toggleTheme}
  class="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background/50 transition-all hover:bg-muted/50 active:scale-95"
>
  {#if isDark}
    <Sun class="h-5 w-5" />
  {:else}
    <Moon class="h-5 w-5" />
  {/if}
</button>
