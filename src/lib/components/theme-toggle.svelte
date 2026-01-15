<script lang="ts">
  import { Moon, Sun } from "lucide-svelte";
  import { toggleMode } from "mode-watcher";
  import { Button } from "$lib/components/ui/button";
  import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
  } from "$lib/components/ui/tooltip";
</script>

<Tooltip>
  <TooltipTrigger asChild>
    {#snippet child({ props })}
      <Button
        {...props}
        variant="ghost"
        size="icon"
        onclick={toggleMode}
        class="relative h-10 w-10 p-0 rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground shrink-0"
      >
        <Sun
          class="absolute inset-0 m-auto h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0"
        />
        <Moon
          class="absolute inset-0 m-auto h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100"
        />
        <span class="sr-only">Toggle theme</span>
      </Button>
    {/snippet}
  </TooltipTrigger>
  <TooltipContent>
    <p>Toggle theme</p>
  </TooltipContent>
</Tooltip>
