<script lang="ts">
  import type { AnyExtension, JSONContent } from "@tiptap/core";
  import { ElementSize } from "runed";
  import { untrack } from "svelte";
  import EditorBranding from "../../components/editor/EditorBranding.svelte";
  import EditorBubbleMenu from "../../components/editor/EditorBubbleMenu.svelte";
  import EditorMargins from "../../components/editor/EditorMargins.svelte";
  import { useEditorBrain } from "../core/EditorBrain.svelte";
  import { formatFontName } from "$lib/constants/fonts";
  import { loadFont } from "$lib/constants/fontLoader";
  import { generateTextureCSS } from "$lib/utils/textures";
  import "./editor-styles.css";

  /**
   * EditorCanvas - Tiptap Mount Point
   * Simplified with Unified EditorBrain.
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

  // ━━━ RESPONSIVE SCALING (Runed) ━━━
  const containerSize = new ElementSize(() => containerElement);
  const settings = $derived(brain.settings);

  const scale = $derived.by(() => {
    if (!(containerSize.width && settings.pageWidth)) return 1;
    const availableWidth = containerSize.width - 64;
    const requiredWidth = settings.pageWidth;
    let s = availableWidth < requiredWidth ? availableWidth / requiredWidth : 1;
    return isNaN(s) ? 1 : Math.max(0.1, s);
  });

  // Direct texture style - no throttling for instant response
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

  // Dynamic Font Loading
  $effect(() => {
    if (settings.fontBody) loadFont(settings.fontBody);
    if (settings.fontTitle) loadFont(settings.fontTitle);
  });
  // --- Typography Engine ---
  const docFontBody = $derived(formatFontName(settings.fontBody || 'inter'));
  const docFontTitle = $derived(formatFontName(settings.fontTitle || 'inter'));
  const docBaseSize = $derived(`${settings.fontSize || 16}px`);
  const docLineHeight = $derived(settings.lineHeight || 1.5);

  // WCAG Contrast-Aware Placeholder Logic
  const placeholderColor = $derived.by(() => {
    let bg = settings.backgroundColor || '#ffffff';
    
    // If we're in dark mode and the background is the default white, 
    // it will be replaced by our dark background color in the class.
    // We should assume the dark background for the luminance check.
    if (bg === '#ffffff') {
      // Check if we are in dark mode (this is a bit tricky without a store, 
      // but we can assume the placeholder should be white if the dark:bg class is active)
      return 'var(--hd-placeholder-theme-aware)';
    }

    // Simple hex to RGB
    const hex = bg.replace('#', '');
    if (hex.length !== 6) return 'rgba(0, 0, 0, 0.4)';
    
    const r = parseInt(hex.substring(0, 2), 16) / 255;
    const g = parseInt(hex.substring(2, 4), 16) / 255;
    const b = parseInt(hex.substring(4, 6), 16) / 255;

    // Luminance formula: 0.2126R + 0.7152G + 0.0722B
    const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    
    return luminance > 0.5 ? 'rgba(0, 0, 0, 0.4)' : 'rgba(255, 255, 255, 0.6)';
  });
</script>

<style>
  :global(#document-canvas .ProseMirror) {
    padding: 0 !important; /* Managed by container padding */
  }
</style>

<div
  bind:this={containerElement}
  class="flex h-full w-full items-center justify-center p-8 overflow-hidden"
>
  <div
    id="document-canvas"
    class="relative flex flex-col bg-white dark:bg-[#0a0a0b] origin-center border-[3px] border-primary rounded-sm shadow-none box-border overflow-hidden"
    style:width="{settings.pageWidth}px"
    style:height="{settings.pageHeight}px"
    style:background-color={settings.backgroundColor === '#ffffff' ? undefined : settings.backgroundColor}
    style:transform="scale({scale})"
    style:transition-timing-function="cubic-bezier(0.2, 0.8, 0.2, 1)"
  >
    <EditorMargins />
    <EditorBranding />

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
