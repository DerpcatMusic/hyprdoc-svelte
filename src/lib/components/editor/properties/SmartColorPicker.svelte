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
  import SpectrumPicker from "$lib/components/editor/toolbar/SpectrumPicker.svelte";
  import {
    EDITOR_COLOR_PRESETS,
    HYPR_DEFAULT_TEXT_COLOR,
  } from "$lib/styles/ui-palette";

  interface Props {
    value: string | undefined;
    onColorSelect: (color: string | undefined) => void;
    label: string;
    className?: string;
  }

  let {
    value,
    onColorSelect,
    label,
    className,
  }: Props = $props();

  const presets = EDITOR_COLOR_PRESETS;

  let isOpen = $state(false);
  let mode = $state<"presets" | "spectrum">("presets");
  let longPressTimer: ReturnType<typeof setTimeout> | null = null;
  let isLongPress = $state(false);

  function handlePresetDown(color: string) {
    isLongPress = false;
    longPressTimer = setTimeout(() => {
      isLongPress = true;
      onColorSelect(color);
      mode = "spectrum";
    }, 500);
  }

  function handlePresetUp(color: string) {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      longPressTimer = null;
    }

    if (!isLongPress) {
      onColorSelect(color);
      isOpen = false;
    }
  }

  function resetState() {
    setTimeout(() => (mode = "presets"), 200);
  }
</script>

<BitsPopover.Root
  bind:open={isOpen}
  onOpenChange={(open: boolean) => {
    if (!open) resetState();
  }}
>
  <TooltipProvider delayDuration={400}>
    <Tooltip>
      <TooltipTrigger asChild>
        {#snippet child({ props: tooltipProps })}
          <div {...tooltipProps} class={cn("flex w-full", className)}>
            <BitsPopover.Trigger asChild>
              {#snippet child({ props: popoverProps })}
                <button
                  {...popoverProps}
                  type="button"
                  class="relative flex-1 rounded-md border border-border shadow-sm transition-all duration-200 outline-none select-none overflow-hidden h-9"
                  style:background-color={value || 'transparent'}
                >
                  {#if !value}
                    <div class="absolute inset-0 flex items-center justify-center">
                       <div class="w-full h-px bg-red-500 rotate-45"></div>
                    </div>
                  {/if}
                </button>
              {/snippet}
            </BitsPopover.Trigger>
          </div>
        {/snippet}
      </TooltipTrigger>
      <TooltipContent side="bottom" class="text-xs font-medium px-2 py-1">
        {label}
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>

  <BitsPopover.Content
    side="top"
    sideOffset={10}
    align="start"
    class="w-auto p-3 gap-2 flex flex-col items-center bg-card border border-border/60 shadow-xl z-[70] rounded-xl animate-in fade-in zoom-in-95 duration-200 focus:outline-none"
  >
    {#if mode === 'presets'}
      <div
        class="grid grid-cols-4 gap-2"
        in:scale={{ start: 0.95, duration: 200 }}
      >
        {#each presets as item (item.color)}
          <button
            type="button"
            class="w-6 h-6 rounded-full border border-border/20 shadow-sm transition-all hover:scale-110 active:scale-90"
            style:background-color={item.color}
            onmousedown={() => handlePresetDown(item.color)}
            onmouseup={() => handlePresetUp(item.color)}
            onmouseleave={() => {
              if (longPressTimer) {
                clearTimeout(longPressTimer);
                longPressTimer = null;
              }
            }}
            ontouchstart={() => handlePresetDown(item.color)}
            ontouchend={(e: TouchEvent) => {
              e.preventDefault();
              handlePresetUp(item.color);
            }}
            title={item.name}
            aria-label={item.name}
          ></button>
        {/each}
      </div>

      <div class="w-full h-px bg-border/50 my-1"></div>

      <div class="flex items-center justify-between w-full gap-2">
        <Button
            variant="ghost"
            size="sm"
            class="h-6 flex-1 text-[10px] text-muted-foreground hover:text-primary"
            onclick={() => mode = 'spectrum'}
        >
            Custom...
        </Button>
        <Button
            variant="ghost"
            size="sm"
            class="h-6 flex-1 text-[10px] text-muted-foreground hover:text-destructive"
            onclick={() => {
                onColorSelect(undefined);
                isOpen = false;
            }}
        >
            Clear
        </Button>
      </div>
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
