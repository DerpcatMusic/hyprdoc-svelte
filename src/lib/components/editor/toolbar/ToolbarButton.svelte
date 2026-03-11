<script lang="ts">
  import type { Snippet } from "svelte";
  import { Button } from "$lib/components/ui/button";
  import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
  } from "$lib/components/ui/tooltip";
  import { cn } from "$lib/utils";

  interface Props {
    onclick: () => void;
    isActive?: boolean;
    disabled?: boolean;
    iconClass?: string; // UnoCSS icon class (e.g., "i-lucide-bold")
    label: string;
    shortcut?: string;
    className?: string;
    children?: Snippet;
  }

  let {
    onclick,
    isActive = false,
    disabled = false,
    iconClass,
    label,
    shortcut,
    className,
    children,
  }: Props = $props();
</script>

<TooltipProvider delayDuration={400}>
  <Tooltip>
    <TooltipTrigger asChild>
      {#snippet child({ props })}
        <button
          {...props}
          type="button"
          {onclick}
          {disabled}
          class={cn(
						"flex items-center justify-center shrink-0 w-8 h-8 rounded-md transition-all duration-200 outline-none",
						isActive 
							? 'bg-secondary text-secondary-foreground shadow-sm' 
							: 'text-muted-foreground hover:bg-muted hover:text-foreground active:scale-95 disabled:opacity-30 disabled:pointer-events-none',
						className
					)}
        >
          {#if iconClass}
            <span class={iconClass}></span>
          {:else if children}
            {@render children()}
          {/if}
        </button>
      {/snippet}
    </TooltipTrigger>
    <TooltipContent
      side="bottom"
      class="flex items-center gap-2 px-2 py-1 select-none"
    >
      <span class="text-xs font-medium">{label}</span>
      {#if shortcut}
        <kbd
          class="font-mono text-[10px] font-medium bg-muted px-1 rounded border border-border/50 text-muted-foreground"
        >
          {shortcut}
        </kbd>
      {/if}
    </TooltipContent>
  </Tooltip>
</TooltipProvider>
