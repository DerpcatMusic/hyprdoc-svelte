<script lang="ts">
  import { cn } from "$lib/utils";
  import { Input } from "$lib/components/ui/input";
  import { useEventListener } from "runed";

  interface Props {
    value: number;
    label: string;
    onChange: (value: number) => void;
    min?: number;
    max?: number;
    step?: number;
    unitDisplay?: string;
    isFloat?: boolean;
    className?: string;
  }

  let { 
    value, 
    label, 
    onChange, 
    min = 0, 
    max = 2000, 
    step = 1, 
    unitDisplay = "", 
    isFloat = false,
    className = ""
  }: Props = $props();

  // UI State
  let isDragging = $state(false);
  let isEditing = $state(false);
  let isHolding = $state(false);
  let dragDelta = $state(0);
  
  // Independent visual state for gradients
  let leftWidth = $state(0);
  let rightWidth = $state(0);
  let activeDirection = $state<'left' | 'right' | null>(null);

  let editValue = $state("");
  let inputRef = $state<HTMLInputElement>();
  
  // Drag tracking (non-reactive)
  let startX = 0;
  let startValue = 0;
  let lastX = 0;
  let directionStartX = 0;
  let dragTimer: ReturnType<typeof setTimeout> | null = null;

  // Computed values
  const displayValue = $derived(isFloat ? value.toFixed(2) : Math.round(value).toString());
  
  // Limit detection
  const isAtMin = $derived(value <= min);
  const isAtMax = $derived(value >= max);
  const isAtLimit = $derived(isDragging && ((activeDirection === 'left' && isAtMin) || (activeDirection === 'right' && isAtMax)));

  function handlePointerDown(e: PointerEvent) {
    if (isEditing) return;
    if (e.button !== 0) return;
    
    startX = e.clientX;
    lastX = e.clientX;
    directionStartX = e.clientX;
    
    // Reset active direction but keep widths for fade out
    activeDirection = null;
    
    startValue = value;
    
    dragTimer = setTimeout(() => {
      isHolding = true;
      document.body.style.cursor = "ew-resize";
    }, 100);

    window.addEventListener("pointerup", cleanupTimer, { once: true });
  }

  function cleanupTimer() {
    if (dragTimer) {
      clearTimeout(dragTimer);
      dragTimer = null;
    }
  }

  useEventListener(globalThis, "pointermove", (e: Event) => {
    if (!isHolding) return;
    
    const me = e as PointerEvent;
    const currentX = me.clientX;
    
    if (!isDragging && Math.abs(currentX - startX) > 2) {
      isDragging = true;
    }
    
    if (!isDragging) return;
    
    // Track instantaneous direction & Update independent widths
    const moveDelta = currentX - lastX;
    
    if (moveDelta < -0.5) { // Sensitivity threshold
      if (activeDirection !== 'left') {
        activeDirection = 'left';
        directionStartX = currentX;
      }
      const dist = Math.abs(currentX - directionStartX);
      leftWidth = Math.min(dist / 30 * 50, 50);
    } else if (moveDelta > 0.5) {
      if (activeDirection !== 'right') {
        activeDirection = 'right';
        directionStartX = currentX;
      }
      const dist = Math.abs(currentX - directionStartX);
      rightWidth = Math.min(dist / 30 * 50, 50);
    }
    
    lastX = currentX;
    
    // Cumulative delta for value calculation
    const deltaX = currentX - startX;
    dragDelta = deltaX;
    
    const multiplier = me.shiftKey ? 10 : (me.altKey ? 0.1 : 1);
    const rawChange = (deltaX * step * multiplier) / 2;
    
    let newValue = startValue + rawChange;
    
    if (!isFloat) {
      newValue = Math.round(newValue);
    } else {
      newValue = Math.round(newValue * 100) / 100;
    }
    
    newValue = Math.min(Math.max(newValue, min), max);
    
    if (newValue !== value) {
      onChange(newValue);
    }
  });

  useEventListener(globalThis, "pointerup", () => {
    cleanupTimer();
    if (isDragging || isHolding) {
      isDragging = false;
      isHolding = false;
      dragDelta = 0;
      activeDirection = null;
      document.body.style.cursor = "";
    }
  });

  function handleDoubleClick() {
    isEditing = true;
    editValue = displayValue;
    setTimeout(() => {
      if (inputRef) {
        inputRef.focus();
        inputRef.select();
      }
    }, 0);
  }

  function handleBlur() {
    isEditing = false;
    const parsed = parseFloat(editValue);
    if (!isNaN(parsed)) {
      onChange(Math.min(Math.max(parsed, min), max));
    }
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === "Enter") {
      isEditing = false;
      const parsed = parseFloat(editValue);
      if (!isNaN(parsed)) {
        onChange(Math.min(Math.max(parsed, min), max));
      }
    }
    if (e.key === "Escape") {
      isEditing = false;
    }
  }
</script>

<div class={cn("flex flex-col gap-1 w-full", className)}>
  <div class="flex items-center justify-between px-0.5">
     <span class="text-[10px] uppercase font-bold tracking-widest text-muted-foreground/60 select-none">{label}</span>
  </div>

  <div
    role="button"
    tabindex="0"
    class={cn(
      "relative w-full h-8 border border-border/40 rounded-md flex items-center bg-background/50 overflow-hidden group cursor-pointer hover:bg-background/80 hover:border-primary/30 shadow-sm transition-all duration-200",
      isDragging && "cursor-ew-resize border-primary/40 bg-primary/5",
      isHolding && !isDragging && "shadow-inner scale-[0.98] border-primary/30 bg-primary/5",
      isEditing && "ring-1 ring-primary border-primary bg-background cursor-text",
      isAtLimit && "border-red-500/60 ring-1 ring-red-500/30"
    )}
    onpointerdown={handlePointerDown}
    ondblclick={handleDoubleClick}
  >
    {#if isEditing}
      <Input
        bind:ref={inputRef}
        type="number"
        class="h-full w-full border-none text-left font-mono text-[10px] px-2 py-0 focus-visible:ring-0 bg-transparent"
        bind:value={editValue}
        onblur={handleBlur}
        onkeydown={handleKeyDown}
        {step}
        {min}
        {max}
      />
    {:else}
      <!-- Scrub Indicator -->
      <div class={cn(
        "flex items-center justify-center px-1.5 h-full border-r border-transparent flex-shrink-0 transition-colors",
        "text-muted-foreground/25 group-hover:text-muted-foreground/50",
        (isHolding || isDragging) && "text-primary border-primary/10 bg-primary/5",
        isAtLimit && "text-red-500"
      )}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M8 12H16" />
          <path d="M5 12L8 9M5 12L8 15" />
          <path d="M19 12L16 9M19 12L16 15" />
        </svg>
      </div>

      <div class="flex-1 flex items-center justify-between px-2 select-none z-30 pointer-events-none">
        <span class={cn(
          "font-mono text-[10px] font-bold tabular-nums transition-colors duration-200",
          isAtLimit ? "text-red-500" : "text-foreground/90 group-hover:text-primary"
        )}>
          {displayValue}
        </span>
        {#if unitDisplay}
          <span class={cn(
            "text-[9px] font-bold uppercase transition-colors duration-200",
            isAtLimit ? "text-red-500/60" : "text-muted-foreground/40"
          )}>{unitDisplay}</span>
        {/if}
      </div>

      <div class="absolute inset-0 pointer-events-none z-10 overflow-hidden">
        <!-- Left Gradient (Blue) - Width instant, opacity fades -->
        <div 
          class="absolute inset-y-0 left-0 transition-opacity duration-300 ease-out"
          style:width="{leftWidth}%"
          style:opacity={activeDirection === 'left' && !isAtLimit ? 1 : 0}
          style:background="linear-gradient(to right, rgba(37, 99, 235, 0.5), transparent)"
        ></div>

        <!-- Right Gradient (Blue) - Width instant, opacity fades -->
        <div 
          class="absolute inset-y-0 right-0 transition-opacity duration-300 ease-out"
          style:width="{rightWidth}%"
          style:opacity={activeDirection === 'right' && !isAtLimit ? 1 : 0}
          style:background="linear-gradient(to left, rgba(37, 99, 235, 0.5), transparent)"
        ></div>

        <!-- Limit Gradient (Red) -->
        <div 
          class={cn(
            "absolute inset-0 transition-opacity duration-300 ease-out",
            isAtLimit && "animate-pulse"
          )}
          style:opacity={isAtLimit ? 1 : 0}
          style:background={activeDirection === 'left' 
            ? "linear-gradient(to right, rgba(239, 68, 68, 0.5), transparent 60%)" 
            : "linear-gradient(to left, rgba(239, 68, 68, 0.5), transparent 60%)"}
        ></div>
      </div>

      <!-- Scrubbing Tooltip -->
      {#if isDragging}
        <div class={cn(
          "absolute left-1/2 -top-10 -translate-x-1/2 px-2 py-1 text-[10px] font-mono font-bold rounded shadow-xl z-50 whitespace-nowrap animate-in zoom-in-95 fade-in duration-200",
          isAtLimit ? "bg-red-500 text-white" : "bg-foreground text-background"
        )}>
          {displayValue} <span class="opacity-50 ml-0.5">{unitDisplay}</span>
          {#if isAtLimit}
            <span class="ml-1 text-[8px] opacity-75">{isAtMin ? "MIN" : "MAX"}</span>
          {/if}
        </div>
      {/if}
    {/if}
  </div>
</div>
