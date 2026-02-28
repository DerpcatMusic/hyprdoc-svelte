<script lang="ts">
  import type { ComponentType } from "svelte";
  import { Button } from "$lib/components/ui/button";
  import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
    TooltipProvider,
  } from "$lib/components/ui/tooltip";
  import { cn } from "$lib/utils";

  interface Props {
    onclick: () => void;
    isActive: boolean;
    disabled?: boolean;
    icon: ComponentType;
    label: string;
  }

  const {
    onclick,
    isActive,
    disabled = false,
    icon: Icon,
    label,
  }: Props = $props();
</script>

<TooltipProvider delayDuration={400}>
  <Tooltip>
    <TooltipTrigger asChild>
      {#snippet child({ props })}
        <Button
          {...props}
          variant="ghost"
          size="icon"
          {disabled}
          {onclick}
          class={cn(
					"h-8 w-8",
					isActive && "bg-muted text-foreground shadow-sm"
				)}
        >
          <Icon class="size-4" />
        </Button>
      {/snippet}
    </TooltipTrigger>
    <TooltipContent side="bottom">
      <p>{label}</p>
    </TooltipContent>
  </Tooltip>
</TooltipProvider>

