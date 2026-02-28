<script lang="ts">
  import type { AnyExtension, JSONContent } from "@tiptap/core";
  import { Debounced, ElementSize, useEventListener } from "runed";
  import { untrack } from "svelte";
  import EditorBranding from "../../components/editor/EditorBranding.svelte";
  import EditorBubbleMenu from "../../components/editor/EditorBubbleMenu.svelte";
  import EditorMargins from "../../components/editor/EditorMargins.svelte";
  import EditorRulers from "../../components/editor/EditorRulers.svelte";
  import EditorAlignmentGuides from "../../components/editor/EditorAlignmentGuides.svelte";
  import { useEditorBrain } from "../core/EditorBrain.svelte";
  import { formatFontName } from "$lib/constants/fonts";
  import { loadFont } from "$lib/constants/fontLoader";
  import { generateTextureCSS } from "$lib/utils/textures";
  import "./editor-styles.css";

  /**
   * EditorCanvas - Professional Canvas with Zoom/Pan
   * Ctrl+Scroll to zoom, Middle-mouse to pan, Double-middle to reset
   */

  interface Props {
    extensions?: AnyExtension[];
    initialContent?: JSONContent;
  }

  let { extensions = [], initialContent }: Props = $props();

  const brain = useEditorBrain();

  // Refs
  let editorElement = $state<HTMLDivElement>();
  let containerElement = $state<HTMLDivElement>();
  let hasMounted = $state(false);

  // ━━━ CANVAS STATE ━━━
  let zoom = $state(1);
  let panX = $state(0);
  let panY = $state(0);
  let isPanning = $state(false);
  let panStart = $state({ x: 0, y: 0, panX: 0, panY: 0 });

  const MIN_ZOOM = 0.25;
  const MAX_ZOOM = 3;
  const ZOOM_STEP = 0.1;

  // Container size for responsive scaling
  const containerSize = new ElementSize(() => containerElement);
  const settings = $derived(brain.settings);

  // Auto-fit scale (when zoom is 1, this is the base scale)
  const autoScale = $derived.by(() => {
    if (!(containerSize.width && settings.pageWidth)) return 1;
    const availableWidth = containerSize.width - 120; // Extra padding for rulers
    const availableHeight = (containerSize.height || 800) - 120;
    const scaleW = availableWidth / settings.pageWidth;
    const scaleH = availableHeight / settings.pageHeight;
    const s = Math.min(scaleW, scaleH, 1);
    return isNaN(s) ? 1 : Math.max(0.1, s);
  });

  // Final scale = auto-fit * user zoom
  const scale = $derived(autoScale * zoom);

  // ━━━ ZOOM HANDLER (Ctrl + Scroll) ━━━
  function handleWheel(e: WheelEvent) {
    if (!e.ctrlKey) return;
    
    e.preventDefault();
    const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
    const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom + delta));
    
    // Zoom towards cursor position
    if (containerElement) {
      const rect = containerElement.getBoundingClientRect();
      const cursorX = e.clientX - rect.left - rect.width / 2;
      const cursorY = e.clientY - rect.top - rect.height / 2;
      
      const zoomRatio = newZoom / zoom;
      panX = panX * zoomRatio - cursorX * (zoomRatio - 1);
      panY = panY * zoomRatio - cursorY * (zoomRatio - 1);
    }
    
    zoom = newZoom;
  }

  // ━━━ PAN HANDLER (Middle Mouse) ━━━
  function handleMouseDown(e: MouseEvent) {
    // Middle mouse button = 1
    if (e.button !== 1) return;
    
    e.preventDefault();
    isPanning = true;
    panStart = { x: e.clientX, y: e.clientY, panX, panY };
    
    // Change cursor
    if (containerElement) {
      containerElement.style.cursor = 'grabbing';
    }
  }

  function handleMouseMove(e: MouseEvent) {
    if (!isPanning) return;
    
    const dx = e.clientX - panStart.x;
    const dy = e.clientY - panStart.y;
    
    panX = panStart.panX + dx;
    panY = panStart.panY + dy;
  }

  function handleMouseUp(e: MouseEvent) {
    if (e.button !== 1) return;
    
    isPanning = false;
    if (containerElement) {
      containerElement.style.cursor = '';
    }
  }

  // ━━━ RESET (Double Middle Click) ━━━
  function handleDoubleClick(e: MouseEvent) {
    // Middle mouse button = 1
    if (e.button !== 1) return;
    
    e.preventDefault();
    zoom = 1;
    panX = 0;
    panY = 0;
  }

  // Register global mouse events for pan (to handle mouse leaving container)
  useEventListener(() => document, "mousemove", handleMouseMove);
  useEventListener(() => document, "mouseup", handleMouseUp);

  // Direct texture style
  const textureStyle = $derived.by(() => {
    const s = settings;
    if (!s || s.paperTexture === "none") return undefined;
    
    return generateTextureCSS(s.paperTexture, {
      color: s.paperTextureColor || "#000000",
      opacity: 1,
      scale: s.paperTextureScale ?? 1,
      monochromatic: s.paperTextureMonochromatic,
    });
  });

  $effect(() => {
    if (editorElement && !hasMounted) {
      untrack(() => {
        brain.mount(editorElement!, extensions, initialContent);
        hasMounted = true;
      });
    }
  });

  // Debounced Font Loading
  const debouncedFonts = new Debounced(() => ({
    body: settings.fontBody,
    title: settings.fontTitle,
  }), 300);

  $effect(() => {
    const fonts = debouncedFonts.current;
    if (fonts.body) loadFont(fonts.body);
    if (fonts.title) loadFont(fonts.title);
  });

  // Typography Engine
  const docFontBody = $derived(formatFontName(settings.fontBody || 'inter'));
  const docFontTitle = $derived(formatFontName(settings.fontTitle || 'inter'));
  const docBaseSize = $derived(`${settings.fontSize || 16}px`);
  const docLineHeight = $derived(settings.lineHeight || 1.5);

  // WCAG Contrast-Aware Placeholder
  const placeholderColor = $derived.by(() => {
    let bg = settings.backgroundColor || '#ffffff';
    if (bg === '#ffffff') return 'var(--hd-placeholder-theme-aware)';

    const hex = bg.replace('#', '');
    if (hex.length !== 6) return 'rgba(0, 0, 0, 0.4)';
    
    const r = parseInt(hex.substring(0, 2), 16) / 255;
    const g = parseInt(hex.substring(2, 4), 16) / 255;
    const b = parseInt(hex.substring(4, 6), 16) / 255;
    const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    
    return luminance > 0.5 ? 'rgba(0, 0, 0, 0.4)' : 'rgba(255, 255, 255, 0.6)';
  });

  // Ruler dimensions (10% larger than document)
  const rulerScale = $derived(scale * 1.1);
</script>

<style>
  :global(#document-canvas .ProseMirror) {
    padding: 0 !important;
  }
  
  .canvas-container {
    position: relative;
    overflow: hidden;
    background: linear-gradient(
      180deg,
      color-mix(in srgb, var(--canvas-bg) 92%, transparent) 0%,
      color-mix(in srgb, var(--canvas-bg) 100%, black 4%) 100%
    );
    background-image: 
      radial-gradient(circle at 1px 1px, color-mix(in srgb, var(--border) 45%, transparent) 0.8px, transparent 0);
    background-size: 24px 24px;
  }
</style>

<div class="relative h-full w-full overflow-hidden bg-canvas-bg">
  <div class="pointer-events-none absolute inset-0 z-0">
    <div class="absolute -top-20 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-primary/6 blur-3xl"></div>
    <div class="absolute bottom-10 left-10 h-56 w-56 rounded-full bg-secondary/10 blur-3xl"></div>
  </div>

  <!-- Controls Overlay -->
  {#if !brain.isPreview}
    <div class="absolute bottom-5 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3">
    <!-- Zoom Indicator -->
    <div class="flex items-center gap-2 rounded-2xl border border-border/70 bg-card/92 px-4 py-2 text-sm font-medium shadow-xl shadow-black/10 backdrop-blur-xl supports-[backdrop-filter]:bg-card/80">
      <span class="text-muted-foreground">Zoom</span>
      <span class="min-w-[3rem] text-center">{Math.round(zoom * 100)}%</span>
      <div class="h-4 w-px bg-border mx-1"></div>
      <button 
        class="rounded-md p-1 transition-colors hover:bg-muted/70 hover:text-primary" 
        onclick={() => zoom = Math.max(MIN_ZOOM, zoom - 0.1)}
        aria-label="Zoom Out"
        title="Zoom Out"
      >
        <span class="i-lucide-minus size-4"></span>
      </button>
      <button 
        class="rounded-md p-1 transition-colors hover:bg-muted/70 hover:text-primary" 
        onclick={() => zoom = 1}
        aria-label="Reset Zoom"
        title="Reset Zoom"
      >
        <span class="i-lucide-rotate-ccw size-3.5"></span>
      </button>
      <button 
        class="rounded-md p-1 transition-colors hover:bg-muted/70 hover:text-primary" 
        onclick={() => zoom = Math.min(MAX_ZOOM, zoom + 0.1)}
        aria-label="Zoom In"
        title="Zoom In"
      >
        <span class="i-lucide-plus size-4"></span>
      </button>
    </div>

    <!-- Navigation Tip -->
    <div class="group relative">
      <div class="cursor-help rounded-2xl border border-border/70 bg-card/92 p-2 shadow-xl shadow-black/10 backdrop-blur-xl supports-[backdrop-filter]:bg-card/80">
        <span class="i-lucide-info size-5 text-muted-foreground group-hover:text-primary transition-colors"></span>
      </div>
      <div class="absolute bottom-full right-0 mb-3 w-64 scale-95 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:scale-100 transition-all origin-bottom-right duration-200">
        <div class="rounded-xl border border-border/70 bg-card/96 p-4 shadow-xl shadow-black/10 backdrop-blur-xl supports-[backdrop-filter]:bg-card/85">
          <p class="text-sm font-semibold mb-2">Canvas Navigation</p>
          <ul class="space-y-2 text-xs text-muted-foreground">
            <li class="flex items-center gap-2">
              <kbd class="px-1.5 py-0.5 rounded border border-border bg-muted">Ctrl</kbd> + <kbd class="px-1.5 py-0.5 rounded border border-border bg-muted">Scroll</kbd>
              <span>to zoom in/out</span>
            </li>
            <li class="flex items-center gap-2">
              <kbd class="px-1.5 py-0.5 rounded border border-border bg-muted">Middle Click</kbd>
              <span>to pan around</span>
            </li>
            <li class="flex items-center gap-2">
              <kbd class="px-1.5 py-0.5 rounded border border-border bg-muted">2x Middle Click</kbd>
              <span>to reset view</span>
            </li>
          </ul>
        </div>
      </div>
      </div>
    </div>
  {/if}

  <!-- Canvas Container -->
<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div
  bind:this={containerElement}
  class="canvas-container flex h-full w-full items-center justify-center"
  onwheel={handleWheel}
  onmousedown={handleMouseDown}
  ondblclick={handleDoubleClick}
  onkeydown={() => {}}
  tabindex="-1"
  role="application"
  aria-label="Document canvas - Ctrl+scroll to zoom, middle-click to pan"
>
  <!-- Rulers (outside document, same scale, but extend slightly) -->
  {#if brain.showRulers && !brain.isPreview}
    <EditorRulers 
      scale={scale} 
      pageWidth={settings.pageWidth}
      pageHeight={settings.pageHeight}
      marginH={settings.marginHorizontal}
      marginV={settings.marginVertical}
      offsetX={panX}
      offsetY={panY}
    />
  {/if}

  <!-- Document Canvas -->
  <div
    id="document-canvas"
    class="relative flex flex-col origin-center overflow-hidden rounded-lg border border-border/80 bg-document shadow-2xl ring-1 ring-border/30"
    style:width="{settings.pageWidth}px"
    style:height="{settings.pageHeight}px"
    style:background-color={settings.backgroundColor || 'var(--document)'}
    style:transform="translate({panX}px, {panY}px) scale({scale})"
    style:transition={isPanning ? 'none' : 'transform 0.15s cubic-bezier(0.2, 0.8, 0.2, 1)'}
    style:z-index="10"
  >
    <EditorMargins />
    {#if !brain.isPreview}
      <EditorBranding />
    {/if}

    <!-- Alignment Guides -->
    <EditorAlignmentGuides guides={brain.alignmentGuides} />

    {#if settings.paperTexture !== 'none' && textureStyle}
      <div
        class="pointer-events-none absolute inset-0 mix-blend-multiply transition-opacity duration-75"
        style:z-index="1"
        style:background-image={textureStyle}
        style:opacity={settings.paperTextureOpacity}
      ></div>
    {/if}

    <div
      bind:this={editorElement}
      role="textbox"
      aria-multiline="true"
      aria-label="Document editor"
      class="custom-scrollbar relative h-full w-full overflow-y-auto outline-none scroll-smooth"
      style:z-index="2"
      style:padding-top="{settings.marginVertical}px"
      style:padding-bottom="{settings.marginVertical}px"
      style:padding-left="{settings.marginHorizontal}px"
      style:padding-right="{settings.marginHorizontal}px"
      style:--hd-font-family={docFontBody}
      style:--hd-font-title={docFontTitle}
      style:--hd-font-size={docBaseSize}
      style:--hd-line-height={docLineHeight}
      style:--hd-placeholder-color={placeholderColor}
    ></div>

    <EditorBubbleMenu />
  </div>

  </div>
</div>
