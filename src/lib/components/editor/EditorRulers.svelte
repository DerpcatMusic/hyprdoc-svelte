<script lang="ts">
  /**
   * EditorRulers - Visual rulers positioned outside the document
   * Shows horizontal and vertical rulers with margin indicators & draggable guides
   */
  import { useEditorBrain } from "$lib/editor/core/EditorBrain.svelte";
  import { useEventListener } from "runed";

  interface Props {
    scale?: number;
    pageWidth?: number;
    pageHeight?: number;
    marginH?: number;
    marginV?: number;
    offsetX?: number;
    offsetY?: number;
  }

  let { 
    scale = 1,
    pageWidth = 816,
    pageHeight = 1056,
    marginH = 72,
    marginV = 72,
    offsetX = 0,
    offsetY = 0
  }: Props = $props();

  const brain = useEditorBrain();

  // Unit conversion (pixels to inches at 96 DPI)
  const PX_PER_INCH = 96;
  const MARK_STEP = 10; // Minor mark every 10px
  const MAJOR_STEP = 100; // Major mark every 100px

  // Ruler dimensions
  const RULER_SIZE = 24;

  // Draggable guide state
  let guides = $state<Array<{ id: string; position: number; axis: 'h' | 'v' }>>([]);
  let draggingGuide = $state<{ id: string; axis: 'h' | 'v' } | null>(null);

  // Generate horizontal ruler marks
  const horizontalMarks = $derived.by(() => {
    const marks: { position: number; isMajor: boolean; label: string | null }[] = [];
    const extent = pageWidth * 1.1; // 10% more as requested
    for (let px = 0; px <= extent; px += MARK_STEP) {
      const isMajor = px % MAJOR_STEP === 0;
      marks.push({
        position: px,
        isMajor,
        label: isMajor ? `${Math.round(px / PX_PER_INCH * 10) / 10}"` : null,
      });
    }
    return marks;
  });

  // Generate vertical ruler marks
  const verticalMarks = $derived.by(() => {
    const marks: { position: number; isMajor: boolean; label: string | null }[] = [];
    const extent = pageHeight * 1.1; // 10% more
    for (let px = 0; px <= extent; px += MARK_STEP) {
      const isMajor = px % MAJOR_STEP === 0;
      marks.push({
        position: px,
        isMajor,
        label: isMajor ? `${Math.round(px / PX_PER_INCH * 10) / 10}"` : null,
      });
    }
    return marks;
  });

  // Add guide on double-click
  function handleRulerDoubleClick(axis: 'h' | 'v', position: number) {
    const id = `guide-${Date.now()}`;
    guides = [...guides, { id, position, axis }];
  }

  // Start dragging guide
  function startDragGuide(id: string, axis: 'h' | 'v') {
    draggingGuide = { id, axis };
  }

  // Handle mouse move for dragging
  function handleGlobalMouseMove(e: MouseEvent) {
    if (!draggingGuide) return;
    
    const guide = guides.find(g => g.id === draggingGuide!.id);
    if (!guide) return;
    
    // Calculate new position based on mouse movement
    // This is simplified - a full implementation would use container rect
    const delta = draggingGuide.axis === 'h' ? e.movementX : e.movementY;
    guide.position += delta / scale;
    guides = [...guides]; // Trigger reactivity
  }

  // Stop dragging
  function handleGlobalMouseUp() {
    if (draggingGuide) {
      // Remove guide if dragged off ruler (position < 0 or > page size)
      const guide = guides.find(g => g.id === draggingGuide!.id);
      if (guide) {
        const max = draggingGuide.axis === 'h' ? pageWidth : pageHeight;
        if (guide.position < 0 || guide.position > max) {
          guides = guides.filter(g => g.id !== draggingGuide!.id);
        }
      }
      draggingGuide = null;
    }
  }

  // Register global events for guide dragging
  useEventListener(() => document, "mousemove", handleGlobalMouseMove);
  useEventListener(() => document, "mouseup", handleGlobalMouseUp);

  // Computed transform for rulers
  const rulerTransform = $derived(`translate(${offsetX}px, ${offsetY}px)`);
</script>

<!-- Rulers Container (positioned absolutely in canvas) -->
<div 
  class="pointer-events-none absolute inset-0 z-10"
  style:transform={rulerTransform}
>
  <!-- Corner Box -->
  <div 
    class="absolute bg-muted border-r border-b border-border flex items-center justify-center pointer-events-auto"
    style:width="{RULER_SIZE}px"
    style:height="{RULER_SIZE}px"
    style:left="calc(50% - {(pageWidth * scale) / 2 + RULER_SIZE}px)"
    style:top="calc(50% - {(pageHeight * scale) / 2 + RULER_SIZE}px)"
  >
    <span class="i-lucide-ruler text-muted-foreground size-3"></span>
  </div>

  <!-- Horizontal Ruler -->
  <div 
    class="absolute bg-muted border-b border-border pointer-events-auto z-30"
    role="button"
    tabindex="-1"
    aria-label="Horizontal Ruler - Double click to add guide"
    style:height="{RULER_SIZE}px"
    style:width="{pageWidth * 1.1 * scale}px"
    style:left="calc(50% - {(pageWidth * scale) / 2}px)"
    style:top="calc(50% - {(pageHeight * scale) / 2 + RULER_SIZE}px)"
    onkeydown={(e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        handleRulerDoubleClick('h', pageWidth / 2);
      }
    }}
    ondblclick={(e: MouseEvent) => {
      const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
      const pos = (e.clientX - rect.left) / scale;
      handleRulerDoubleClick('h', pos);
    }}
  >
    {#each horizontalMarks as mark (mark.position)}
      <div
        class="absolute bottom-0 bg-muted-foreground/50"
        class:major={mark.isMajor}
        style:left="{mark.position * scale}px"
        style:width="1px"
        style:height={mark.isMajor ? "10px" : "4px"}
      ></div>
      {#if mark.label}
        <span 
          class="absolute text-[8px] font-mono text-muted-foreground select-none"
          style:left="{mark.position * scale + 2}px"
          style:top="2px"
        >{mark.label}</span>
      {/if}
    {/each}

    <!-- Left Margin Indicator -->
    <div
      class="absolute top-0 bottom-0 w-0.5 bg-primary/60 cursor-ew-resize hover:bg-primary transition-colors"
      style:left="{marginH * scale}px"
      title="Left margin: {marginH}px"
    ></div>

    <!-- Right Margin Indicator -->
    <div
      class="absolute top-0 bottom-0 w-0.5 bg-primary/60 cursor-ew-resize hover:bg-primary transition-colors"
      style:left="{(pageWidth - marginH) * scale}px"
      title="Right margin: {marginH}px"
    ></div>

    <!-- Center Marker -->
    <div
      class="absolute top-0 bottom-0 w-px bg-primary/30"
      style:left="{(pageWidth / 2) * scale}px"
    ></div>
  </div>

  <!-- Vertical Ruler -->
  <div 
    class="absolute bg-muted/90 backdrop-blur-sm border-r border-border pointer-events-auto"
    role="button"
    tabindex="-1"
    aria-label="Vertical Ruler - Double click to add guide"
    style:width="{RULER_SIZE}px"
    style:height="{pageHeight * 1.1 * scale}px"
    style:left="calc(50% - {(pageWidth * scale) / 2 + RULER_SIZE}px)"
    style:top="calc(50% - {(pageHeight * scale) / 2}px)"
    onkeydown={(e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        handleRulerDoubleClick('v', pageHeight / 2);
      }
    }}
    ondblclick={(e: MouseEvent) => {
      const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
      const pos = (e.clientY - rect.top) / scale;
      handleRulerDoubleClick('v', pos);
    }}
  >
    {#each verticalMarks as mark (mark.position)}
      <div
        class="absolute right-0 bg-muted-foreground/50"
        class:major={mark.isMajor}
        style:top="{mark.position * scale}px"
        style:height="1px"
        style:width={mark.isMajor ? "10px" : "4px"}
      ></div>
      {#if mark.label}
        <span 
          class="absolute text-[8px] font-mono text-muted-foreground select-none"
          style:top="{mark.position * scale + 2}px"
          style:left="2px"
          style:writing-mode="vertical-rl"
          style:text-orientation="mixed"
        >{mark.label}</span>
      {/if}
    {/each}

    <!-- Top Margin Indicator -->
    <div
      class="absolute left-0 right-0 h-0.5 bg-primary/60 cursor-ns-resize hover:bg-primary transition-colors"
      style:top="{marginV * scale}px"
      title="Top margin: {marginV}px"
    ></div>

    <!-- Bottom Margin Indicator -->
    <div
      class="absolute left-0 right-0 h-0.5 bg-primary/60 cursor-ns-resize hover:bg-primary transition-colors"
      style:top="{(pageHeight - marginV) * scale}px"
      title="Bottom margin: {marginV}px"
    ></div>

    <!-- Center Marker -->
    <div
      class="absolute left-0 right-0 h-px bg-primary/30"
      style:top="{(pageHeight / 2) * scale}px"
    ></div>
  </div>

  <!-- Custom Guides (draggable) -->
  {#each guides as guide (guide.id)}
    {#if guide.axis === 'h'}
      <!-- Horizontal guide line -->
      <div
        class="absolute h-px bg-blue-500 pointer-events-auto cursor-ew-resize z-40"
        role="button"
        aria-label="Horizontal guide"
        tabindex="0"
        style:left="calc(50% - {(pageWidth * scale) / 2}px)"
        style:width="{pageWidth * scale}px"
        style:top="calc(50% - {(pageHeight * scale) / 2}px + {guide.position * scale}px)"
        onmousedown={() => startDragGuide(guide.id, 'h')}
        onkeydown={(e: KeyboardEvent) => {
          if (e.key === 'Delete' || e.key === 'Backspace') {
            guides = guides.filter(g => g.id !== guide.id);
          }
        }}
      >
        <div class="absolute -left-2 -top-1 w-2 h-2 bg-blue-500 rounded-full"></div>
      </div>
    {:else}
      <!-- Vertical guide line -->
      <div
        class="absolute w-px bg-blue-500 pointer-events-auto cursor-ns-resize z-40"
        role="button"
        aria-label="Vertical guide"
        tabindex="0"
        style:top="calc(50% - {(pageHeight * scale) / 2}px)"
        style:height="{pageHeight * scale}px"
        style:left="calc(50% - {(pageWidth * scale) / 2}px + {guide.position * scale}px)"
        onmousedown={() => startDragGuide(guide.id, 'v')}
        onkeydown={(e: KeyboardEvent) => {
          if (e.key === 'Delete' || e.key === 'Backspace') {
            guides = guides.filter(g => g.id !== guide.id);
          }
        }}
      >
        <div class="absolute -top-2 -left-1 w-2 h-2 bg-blue-500 rounded-full"></div>
      </div>
    {/if}
  {/each}
</div>
