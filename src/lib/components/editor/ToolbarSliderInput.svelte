<script lang="ts">
  import { tick, untrack } from "svelte";
  import { Slider } from "$lib/components/ui/slider";
  import { cn } from "$lib/utils";

  interface Props {
    label: string;
    value: number;
    onValueChange: (val: number) => void;
    min: number;
    max: number;
    step?: number;
    unit?: string;
    className?: string;
    placeholder?: string;
    onInteractionChange?: (interacting: boolean) => void;
  }

  let {
    label,
    value,
    onValueChange,
    min,
    max,
    step = 1,
    unit = "",
    className,
    placeholder = "",
    onInteractionChange,
  }: Props = $props();

  let isEditing = $state(false);
  let localValue = $state(untrack(() => value.toString()));
  let inputRef: HTMLInputElement | undefined = $state();

  async function handleDoubleClick() {
    isEditing = true;
    localValue = value.toString();
    await tick();
    inputRef?.focus();
    inputRef?.select();
  }

  function handleInputBlur() {
    commitValue();
    isEditing = false;
    onInteractionChange?.(false);
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === "Enter") {
      commitValue();
      isEditing = false;
    } else if (e.key === "Escape") {
      localValue = value.toString();
      isEditing = false;
    }
  }

  function commitValue() {
    const parsed = Number.parseInt(localValue, 10);
    if (isNaN(parsed)) {
      localValue = value.toString();
    } else {
      const clamped = Math.max(min, Math.min(max, parsed));
      onValueChange(clamped);
    }
  }

  function handleSliderChange(val: number[]) {
    onValueChange(val[0]);
  }

  function handlePointerDown() {
    onInteractionChange?.(true);
    window.addEventListener("pointerup", handlePointerUp, { once: true });
  }

  function handlePointerUp() {
    onInteractionChange?.(false);
  }

  $effect(() => {
    if (!isEditing) {
      localValue = value.toString();
    }
  });
</script>

<div class={cn("flex items-center gap-2 pr-2", className)}>
  <div class="flex flex-col items-start gap-0">
    <span
      class="text-[10px] text-muted-foreground uppercase leading-none select-none"
      >{label}</span
    >
    <div
      role="textbox"
      aria-label={label}
      tabindex="0"
      class="h-6 min-w-10 px-1 flex items-center justify-center rounded-md border border-border bg-muted cursor-text select-none font-mono text-xs tabular-nums transition-colors hover:border-border-foreground"
      ondblclick={handleDoubleClick}
      onkeydown={(e: KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          handleDoubleClick();
        }
      }}
    >
      {#if isEditing}
        <input
          bind:this={inputRef}
          type="text"
          class="h-full w-full bg-transparent text-center outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          onblur={handleInputBlur}
          onkeydown={handleKeyDown}
          bind:value={localValue}
        >
      {:else}
        <span class="flex items-center justify-center">
          {value || placeholder}
          {unit}
        </span>
      {/if}
    </div>
  </div>
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="w-14 md:w-16 pt-3" onpointerdown={handlePointerDown}>
    <Slider
      value={[value]}
      {min}
      {max}
      {step}
      onValueChange={handleSliderChange}
      class="h-4"
    />
  </div>
</div>
