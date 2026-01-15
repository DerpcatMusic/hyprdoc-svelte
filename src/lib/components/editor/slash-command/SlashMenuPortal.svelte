<script lang="ts">
  import { useEventListener } from "runed";
  import { slashMenuState } from "./SlashMenuState.svelte";

  // Global keydown handler via RUNED
  useEventListener(
    () => document,
    "keydown",
    (event: KeyboardEvent) => {
      if (slashMenuState.isOpen) {
        if (slashMenuState.handleKeyDown(event)) {
          // If handled, prevent default for navigation keys
          if (["ArrowUp", "ArrowDown", "Enter", "Escape"].includes(event.key)) {
            event.preventDefault();
            event.stopPropagation();
          }
        }
      }
    },
    { capture: true }
  );

  let menuContainer = $state<HTMLDivElement>();

  // Use a resize observer or just reactivity to window height
  // Throttle resize events for better performance
  import { Throttled } from "runed";
  
  let innerHeight = $state(typeof window !== 'undefined' ? window.innerHeight : 1000);
  let resizeTrigger = $state(0);
  
  if (typeof window !== 'undefined') {
    const throttledResize = new Throttled(() => resizeTrigger, 100);
    
    $effect(() => {
      // Update innerHeight when throttled resize fires
      throttledResize.current;
      innerHeight = window.innerHeight;
    });
    
    useEventListener(() => window, "resize", () => {
      resizeTrigger++;
    });
  }

  $effect(() => {
    if (menuContainer && slashMenuState.isOpen && slashMenuState.filteredItems.length > 0) {
      const selectedItem = menuContainer.querySelector(`[data-index="${slashMenuState.selectedIndex}"]`);
      selectedItem?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  });

  const positionStyle = $derived.by(() => {
    const { x, y, placement } = slashMenuState.position;
    if (placement === 'above') {
      return `left: ${x}px; bottom: ${innerHeight - y}px;`;
    }
    return `left: ${x}px; top: ${y}px;`;
  });
</script>

{#if slashMenuState.isOpen}
  <div
    class="fixed z-[10000] pointer-events-auto"
    style={positionStyle}
  >
    <div
      bind:this={menuContainer}
      class="max-h-[320px] w-[280px] overflow-hidden overflow-y-auto scroll-smooth rounded-xl border border-border/40 bg-popover/95 backdrop-blur-md text-popover-foreground shadow-2xl animate-in fade-in zoom-in-95 duration-200"
    >
      <div class="sticky top-0 z-10 border-b border-border/20 bg-muted/80 px-3 py-2 font-bold text-muted-foreground text-[10px] uppercase tracking-widest">
        Actions
      </div>

      {#if slashMenuState.filteredItems.length > 0}
        <div class="p-1.5">
          {#each slashMenuState.filteredItems as item, index (item.type + '-' + item.title)}
            <button
              type="button"
              data-index={index}
              class="flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-all rounded-lg cursor-pointer
                {index === slashMenuState.selectedIndex 
                  ? 'bg-primary text-primary-foreground shadow-lg scale-[1.02]' 
                  : 'text-popover-foreground hover:bg-muted'}"
              onclick={() => slashMenuState.selectItem(item)}
              onmouseenter={() => slashMenuState.selectedIndex = index}
            >
              <div class="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border
                {index === slashMenuState.selectedIndex 
                  ? 'border-white/20 bg-white/10' 
                  : 'border-border bg-muted/50 text-muted-foreground'}">
                <span class="{item.icon} size-3.5"></span>
              </div>

              <div class="flex flex-col gap-0 overflow-hidden">
                <span class="font-semibold text-xs truncate">{item.title}</span>
                <span class="text-[10px] opacity-70 truncate line-clamp-1">{item.description}</span>
              </div>
            </button>
          {/each}
        </div>
      {:else}
        <div class="px-4 py-8 text-center text-xs text-muted-foreground italic">
          No matches found
        </div>
      {/if}
    </div>
  </div>
{/if}
