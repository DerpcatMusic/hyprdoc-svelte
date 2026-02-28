<script lang="ts">
  import { Popover as BitsPopover } from "bits-ui";
  import { scale } from "svelte/transition";
  import { Button } from "$lib/components/ui/button";
  import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
  } from "$lib/components/ui/tooltip";
  import { cn } from "$lib/utils";
  import SpectrumPicker from "./SpectrumPicker.svelte";
  import {
    EDITOR_HIGHLIGHT_PRESETS,
    HYPR_DEFAULT_TEXT_COLOR,
  } from "$lib/styles/ui-palette";

  interface Props {
    value: string | undefined;
    onColorSelect: (color: string | undefined) => void;
    label: string;
    iconClass: string;
    className?: string;
    onInteractionChange?: (interacting: boolean) => void;
  }

  let {
    value,
    onColorSelect,
    label,
    iconClass,
    className,
    onInteractionChange,
  }: Props = $props();

  const presets = EDITOR_HIGHLIGHT_PRESETS;

  let isOpen = $state(false);
  let mode = $state<"presets" | "spectrum">("presets");
  let longPressTimer: ReturnType<typeof setTimeout> | null = null;
  let isLongPress = $state(false);

  function handlePresetDown(color: string) {
    isLongPress = false;
    longPressTimer = setTimeout(() => {
      isLongPress = true;
      onColorSelect(color); // Select the color so spectrum sees it
      mode = "spectrum";
    }, 500);
  }

  function handlePresetUp(color: string) {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      longPressTimer = null;
    }

    if (!isLongPress) {
      // Normal tap
      onColorSelect(color);
      isOpen = false;
    }
    // If it was a long press, we already switched mode and selected color, so do nothing else.
  }

  function resetState() {
    // Reset to presets on close
    setTimeout(() => (mode = "presets"), 200);
  }
</script>

<BitsPopover.Root
  bind:open={isOpen}
  onOpenChange={(open: boolean) => {
		onInteractionChange?.(open);
		if (!open) resetState();
	}}
>
  <TooltipProvider delayDuration={400}>
    <Tooltip>
      <TooltipTrigger asChild>
        {#snippet child({ props: tooltipProps })}
          <span {...tooltipProps} class="inline-flex">
            <BitsPopover.Trigger asChild>
              {#snippet child({ props: popoverProps })}
                <button
                  {...popoverProps}
                  type="button"
                  class={cn(
                    "relative flex items-center justify-center shrink-0 w-8 h-8 rounded-md transition-all duration-200 outline-none select-none",
                    value ? 'bg-secondary text-secondary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                    className
                  )}
                >
                  <span class={iconClass}></span>
                  {#if value}
                    <div
                      class="absolute bottom-1 right-1 w-2 h-2 rounded-full border border-background shadow-sm"
                      style:background-color={value}
                    ></div>
                  {/if}
                </button>
              {/snippet}
            </BitsPopover.Trigger>
          </span>
        {/snippet}
      </TooltipTrigger>
      <TooltipContent side="bottom" class="text-xs font-medium px-2 py-1">
        {label}
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>

  <BitsPopover.Content
    side="top"
    sideOffset={15}
    align="center"
    class="w-auto p-3 gap-2 flex flex-col items-center bg-card border border-border/60 shadow-xl z-[70] rounded-xl animate-in fade-in zoom-in-95 duration-200 focus:outline-none"
  >
    {#if mode === 'presets'}
      <div
        class="grid grid-cols-4 gap-2"
        in:scale={{ start: 0.95, duration: 200 }}
      >
        {#each presets as item}
          <button
            type="button"
            class="w-8 h-8 rounded-full border border-border/20 shadow-sm transition-all hover:scale-110 active:scale-90"
            style:background-color={item.color}
            onmousedown={() => handlePresetDown(item.color)}
            onmouseup={() => handlePresetUp(item.color)}
            onmouseleave={() => {
							// Cancel long press if mouse leaves button
							if (longPressTimer) {
								clearTimeout(longPressTimer);
								longPressTimer = null;
							}
						}}
            ontouchstart={() => handlePresetDown(item.color)}
            ontouchend={(e: TouchEvent) => {
							e.preventDefault(); // Prevent mouse emulation
							handlePresetUp(item.color);
						}}
            title={item.name}
          ></button>
        {/each}
      </div>

      <div class="w-full h-px bg-border/50 my-1"></div>

      <Button
        variant="ghost"
        size="sm"
        class="h-6 w-full text-[10px] text-muted-foreground hover:text-destructive"
        onclick={() => {
					onColorSelect(undefined);
					isOpen = false;
				}}
      >
        Clear Highlight
      </Button>
    {:else}
      <div in:scale={{ start: 0.95, duration: 200 }}>
        <SpectrumPicker
          value={value || HYPR_DEFAULT_TEXT_COLOR}
          onChange={(c) => onColorSelect(c)}
          autoStartDrag={isLongPress}
        />
        <div class="pt-2 flex justify-center">
          <Button
            variant="ghost"
            size="sm"
            class="h-6 text-[10px] text-muted-foreground"
            onclick={() => mode = 'presets'}
          >
            Back to Presets
          </Button>
        </div>
      </div>
    {/if}
  </BitsPopover.Content>
</BitsPopover.Root>
