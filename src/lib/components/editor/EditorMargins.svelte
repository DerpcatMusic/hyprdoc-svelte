<script lang="ts">
  import { useEventListener } from "runed";
  import { fade } from "svelte/transition";
  /**
   * EditorMargins - Interactive Document Margins
   *
   * Provides a high-fidelity overlay for dragging document margins.
   * Uses Svelte 5 runes and Runed useEventListener for performance.
   */
  import { useEditorBrain } from "$lib/editor/core/EditorBrain.svelte";
  import { cn } from "$lib/utils";

  // Context
  const brain = useEditorBrain();
  const settings = $derived(brain.settings);

  // Local Drag State
  type DragType = "h" | "v" | null;
  let activeDrag = $state<DragType>(null);
  let startPos = $state({ x: 0, y: 0 });
  let initialMargin = $state(0);

  // Start dragging
  function onMouseDown(e: MouseEvent, type: DragType) {
    e.preventDefault();
    e.stopPropagation();

    activeDrag = type;
    startPos = { x: e.clientX, y: e.clientY };
    initialMargin =
      type === "h" ? settings.marginHorizontal : settings.marginVertical;
  }

  // Update margin based on mouse movement
  useEventListener(globalThis, "mousemove", (e: Event) => {
    if (!activeDrag) return;
    const me = e as MouseEvent;

    if (activeDrag === "h") {
      const delta = me.clientX - startPos.x;
      // Constrain horizontal margin: [20, 30% of page]
      const newVal = Math.max(
        20,
        Math.min(initialMargin + delta, settings.pageWidth * 0.35)
      );
      brain.updateSettings({ marginHorizontal: Math.round(newVal) });
    } else {
      const delta = me.clientY - startPos.y;
      // Constrain vertical margin: [20, 300]
      const newVal = Math.max(20, Math.min(initialMargin + delta, 300));
      brain.updateSettings({ marginVertical: Math.round(newVal) });
    }
  });

  // Stop dragging
  useEventListener(globalThis, "mouseup", () => {
    activeDrag = null;
  });

  // Visibility
  const shouldShow = $derived(settings.showMargins && !isNaN(brain.settings.pageWidth));
</script>

{#if shouldShow}
  <div
    class="pointer-events-none absolute inset-0 z-40 overflow-hidden group/margins"
    transition:fade={{ duration: 200 }}
  >
    <!-- 
			Overlay container: only shows indicators on hover or during drag.
			We use group-hover/margins to trigger the fade.
		-->
    <div
      class={cn(
				"h-full w-full transition-opacity duration-500",
				activeDrag ? "opacity-100" : "opacity-20 hover:opacity-100 group-hover/margins:opacity-100"
			)}
    >
      <!-- Left Margin Indicator -->
      <div
        role="presentation"
        class={cn(
					"pointer-events-auto absolute bottom-0 left-0 top-0 cursor-col-resize border-r-2 border-dashed border-primary/20 bg-primary/2 transition-colors hover:bg-primary/5",
					activeDrag === 'h' && "border-primary/40 bg-primary/10"
				)}
        style:width="{settings.marginHorizontal}px"
        onmousedown={(e: MouseEvent) => onMouseDown(e, 'h')}
      ></div>

      <!-- Right Margin Indicator -->
      <div
        role="presentation"
        class={cn(
					"pointer-events-auto absolute bottom-0 right-0 top-0 cursor-col-resize border-l-2 border-dashed border-primary/20 bg-primary/2 transition-colors hover:bg-primary/5",
					activeDrag === 'h' && "border-primary/40 bg-primary/10"
				)}
        style:width="{settings.marginHorizontal}px"
        onmousedown={(e: MouseEvent) => onMouseDown(e, 'h')}
      ></div>

      <!-- Top Margin Indicator -->
      <div
        role="presentation"
        class={cn(
					"pointer-events-auto absolute left-0 right-0 top-0 cursor-row-resize border-b-2 border-dashed border-primary/20 bg-primary/2 transition-colors hover:bg-primary/5",
					activeDrag === 'v' && "border-primary/40 bg-primary/10"
				)}
        style:height="{settings.marginVertical}px"
        onmousedown={(e: MouseEvent) => onMouseDown(e, 'v')}
      ></div>
    </div>
  </div>
{/if}
