<script lang="ts">
  /**
   * DocumentViewer - Unified Document Rendering Component
   * Simplified and updated for Svelte 5.
   */
  import { Editor, type JSONContent } from "@tiptap/core";
  import { generateHTML } from "@tiptap/html";
  import { onDestroy, onMount } from "svelte";
  import { createEditorExtensions } from "../core/extensions";
  import { formatFontName } from "$lib/constants/fonts";
  import { loadFont } from "$lib/constants/fontLoader";

  interface Props {
    /** Document content (JSON or string) */
    content: JSONContent | string;
    /** Rendering mode (edit, view, or sign) */
    mode?: "edit" | "view" | "sign";
    /** CSS scale for thumbnails (default: 1) */
    scale?: number;
    /** Show "Sealed" badge */
    showBadge?: boolean;
    /** Document settings for styling */
    settings?: {
      fontBody?: string;
      fontTitle?: string;
      fontSize?: number;
      marginVertical?: number;
      marginHorizontal?: number;
      pageWidth?: number;
      pageHeight?: number;
      paperColor?: string;
    };
    /** Additional CSS class */
    class?: string;
  }

  let {
    content: rawContent,
    mode = "view",
    scale = 1,
    showBadge = false,
    settings = {},
    class: className = "",
  }: Props = $props();

  const parsedContent = $derived.by(() => {
    if (typeof rawContent !== "string") return rawContent;
    try {
      return JSON.parse(rawContent);
    } catch {
      return rawContent;
    }
  });

  const effectiveSettings = $derived({
    fontBody: formatFontName(settings.fontBody ?? "inter"),
    fontTitle: formatFontName(settings.fontTitle ?? "inter"),
    fontSize: settings.fontSize ?? 16,
    marginVertical: settings.marginVertical ?? 48,
    marginHorizontal: settings.marginHorizontal ?? 48,
    pageWidth: settings.pageWidth ?? 816,
    pageHeight: settings.pageHeight ?? 1056,
    paperColor: settings.paperColor ?? "#ffffff",
  });

  const staticHtml = $derived.by(() => {
    if (mode !== "sign" || !parsedContent) return "";
    try {
      const extensions = createEditorExtensions({ placeholder: "" });
      return generateHTML(parsedContent, extensions);
    } catch (e) {
      console.error("Failed to generate static HTML", e);
      return "";
    }
  });

  let element = $state<HTMLElement>();
  let editor = $state<Editor>();

  onMount(() => {
    if (!element || mode === "sign") return;

    // Use a simplified version of extensions for non-edit modes
    const extensions = createEditorExtensions({
      placeholder: "",
    });

    editor = new Editor({
      element,
      extensions,
      content: parsedContent,
      editable: mode === "edit",
      editorProps: {
        attributes: {
          class: "prose prose-sm focus:outline-none max-w-none",
          style: `--hd-font-family: "${effectiveSettings.fontBody}"; --hd-font-title: "${effectiveSettings.fontTitle}"; --hd-font-size: ${effectiveSettings.fontSize}px;`,
        },
      },
    });
  });

  $effect(() => {
    if (editor && parsedContent && mode !== "sign") {
      editor.commands.setContent(parsedContent);
    }
  });

  // Dynamic Font Loading
  $effect(() => {
    if (settings.fontBody) loadFont(settings.fontBody);
    if (settings.fontTitle) loadFont(settings.fontTitle);
  });

  onDestroy(() => {
    editor?.destroy();
  });
</script>

<div
  class="document-viewer relative transition-transform duration-100 ease-out {className}"
  style:transform={!isNaN(scale) && scale > 0 ? `scale(${scale})` : 'none'}
  style:transform-origin="top left"
  style:width={!isNaN(scale) && scale > 0 && scale < 1 ? `${100 / scale}%` : undefined}
>
  {#if showBadge && mode !== 'edit'}
    <div class="pointer-events-none absolute top-4 right-4 z-20">
      <div
        class="flex items-center gap-1.5 rounded-full border border-emerald-500/50 bg-emerald-500/10 px-3 py-1.5 text-emerald-600 dark:text-emerald-400 font-semibold text-xs uppercase tracking-wider"
      >
        <span class="i-lucide-shield w-3.5 h-3.5"></span>
        Sealed
      </div>
    </div>
  {/if}

  <div
    bind:this={element}
    class="relative transition-all duration-100 ease-out border-[3px] border-primary rounded-sm bg-surface-2"
    style:padding-top="{effectiveSettings.marginVertical}px"
    style:padding-bottom="{effectiveSettings.marginVertical}px"
    style:padding-left="{effectiveSettings.marginHorizontal}px"
    style:padding-right="{effectiveSettings.marginHorizontal}px"
    style:background-color={effectiveSettings.paperColor === '#ffffff' ? undefined : effectiveSettings.paperColor}
    style:min-height={!isNaN(effectiveSettings.pageHeight) ? `${effectiveSettings.pageHeight}px` : '1056px'}
    style:--hd-font-family={effectiveSettings.fontBody}
    style:--hd-font-title={effectiveSettings.fontTitle}
    style:--hd-font-size={!isNaN(effectiveSettings.fontSize) ? `${effectiveSettings.fontSize}px` : '16px'}
  >
    {#if mode === 'sign'}
      <div
        class="prose prose-sm focus:outline-none max-w-none"
        style:font-family='"{effectiveSettings.fontBody}", sans-serif'
        style:font-size="{effectiveSettings.fontSize}px"
      >
        {@html staticHtml}
      </div>
    {/if}
  </div>
</div>
