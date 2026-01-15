<script lang="ts">
  import { colord, extend } from "colord";
  import namesPlugin from "colord/plugins/names";
  import { untrack } from "svelte";
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import * as Popover from "$lib/components/ui/popover";
  import * as Tabs from "$lib/components/ui/tabs";
  import { cn } from "$lib/utils";

  extend([namesPlugin]);

  interface Props {
    value?: string;
    onValueChange?: (value: string) => void;
    onValueChangeEnd?: (value: string) => void;
    className?: string;
    placeholder?: string;
    onClear?: () => void;
  }

  let {
    value = $bindable(""),
    onValueChange,
    onValueChangeEnd,
    className,
    placeholder = "Pick a color",
    onClear,
  }: Props = $props();

  let isOpen = $state(false);
  let internalColor = $state(value);

  $effect(() => {
    if (value !== internalColor) {
      internalColor = value;
    }
  });

  const presets = [
    "#000000",
    "#ffffff",
    "#ef4444",
    "#f97316",
    "#f59e0b",
    "#84cc16",
    "#22c55e",
    "#10b981",
    "#06b6d4",
    "#0ea5e9",
    "#3b82f6",
    "#6366f1",
    "#8b5cf6",
    "#d946ef",
    "#f43f5e",
    "#808080",
    "#525252",
    "#171717",
  ];

  function handleChange(newColor: string) {
    internalColor = newColor;
    value = newColor;
    onValueChange?.(newColor);
  }

  function handleHexInput(e: Event) {
    const target = e.target as HTMLInputElement;
    const val = target.value;
    if (colord(val).isValid()) {
      handleChange(val);
      onValueChangeEnd?.(val);
    }
  }
</script>

<Popover.Root bind:open={isOpen}>
  <Popover.Trigger>
    {#snippet child({ props })}
      <Button
        {...props}
        variant="outline"
        class={cn(
					'relative flex h-9 w-full items-center justify-start gap-2 px-2 text-left font-normal transition-all hover:bg-muted/50',
					!value && 'border-dashed text-muted-foreground',
					className
				)}
      >
        <div
          class="h-4 w-4 shrink-0 overflow-hidden rounded-full border border-border shadow-sm"
        >
          {#if value}
            <div class="h-full w-full" style="background-color: {value}"></div>
          {:else}
            <div
              class="h-full w-full bg-[length:6px_6px] bg-[linear-gradient(45deg,transparent_25%,#e5e5e5_25%,#e5e5e5_50%,transparent_50%,transparent_75%,#e5e5e5_75%,#e5e5e5_100%)]"
            ></div>
          {/if}
        </div>
        <span
          class="flex-1 truncate font-mono text-[10px] uppercase tracking-wider"
        >
          {value || placeholder}
        </span>
      </Button>
    {/snippet}
  </Popover.Trigger>
  <Popover.Content class="w-[280px] p-3 shadow-xl" align="start">
    {#if onClear}
      <div class="mb-3 flex justify-end px-1">
        <Button
          variant="ghost"
          size="sm"
          onclick={() => {
						handleChange('');
						onValueChangeEnd?.('');
						onClear?.();
						isOpen = false;
					}}
          class="h-6 gap-1 px-2 text-[10px] text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
        >
          <span class="i-lucide-rotate-ccw w-2.5 h-2.5"></span>
          Reset to Auto
        </Button>
      </div>
    {/if}

    <Tabs.Root value="presets" class="w-full">
      <Tabs.List class="mb-3 grid h-8 w-full grid-cols-2">
        <Tabs.Trigger
          value="presets"
          class="text-[10px] uppercase tracking-widest font-bold"
        >
          Presets
        </Tabs.Trigger>
        <Tabs.Trigger
          value="custom"
          class="text-[10px] uppercase tracking-widest font-bold"
        >
          Custom
        </Tabs.Trigger>
      </Tabs.List>

      <Tabs.Content value="presets" class="mt-0">
        <div class="grid grid-cols-6 gap-2">
          {#each presets as color}
            <button
              type="button"
              aria-label="Color {color}"
              class={cn(
								'h-8 w-8 rounded-md border border-border/50 shadow-sm transition-transform hover:scale-105 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 active:scale-95',
								value === color && 'border-transparent ring-2 ring-ring ring-offset-1'
							)}
              style="background-color: {color}"
              onclick={() => {
								handleChange(color);
								onValueChangeEnd?.(color);
							}}
            ></button>
          {/each}
        </div>
      </Tabs.Content>

      <Tabs.Content value="custom" class="mt-0 space-y-3">
        <div class="flex items-center gap-2">
          <div
            class="h-8 w-8 shrink-0 rounded-md border"
            style="background-color: {internalColor || '#fff'}"
          ></div>
          <Input
            value={internalColor}
            oninput={handleHexInput}
            placeholder="#000000"
            class="h-8 font-mono text-xs"
          />
        </div>
        <p class="text-[10px] text-muted-foreground italic">
          Enter any valid HEX, RGB, or HSL color.
        </p>
      </Tabs.Content>
    </Tabs.Root>
  </Popover.Content>
</Popover.Root>
