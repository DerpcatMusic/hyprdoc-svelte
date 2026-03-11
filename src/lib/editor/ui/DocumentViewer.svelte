<script lang="ts">
  /**
   * DocumentViewer - Unified Document Rendering Component
   * Simplified and updated for Svelte 5.
   */
  import { Editor, type JSONContent } from "@tiptap/core";
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
    paperColor: settings.paperColor ?? "var(--document)",
  });

  const isEditable = $derived(mode === "edit");

  let element = $state<HTMLElement>();
  let editor = $state<Editor>();
  let renderedContent = $state("");

  function syncEditor(): void {
    if (!element || !parsedContent) return;

    const newContent = JSON.stringify(parsedContent);
    const extensions = createEditorExtensions({
      placeholder: "",
    });

    if (editor) {
      editor.setEditable(isEditable);
      if (newContent !== renderedContent) {
        editor.commands.setContent(parsedContent);
        renderedContent = newContent;
      }
      return;
    }

    editor = new Editor({
      element,
      extensions,
      content: parsedContent,
      editable: isEditable,
      editorProps: {
        attributes: {
          class: "prose prose-sm focus:outline-none max-w-none",
          style: `--hd-font-family: "${effectiveSettings.fontBody}"; --hd-font-title: "${effectiveSettings.fontTitle}"; --hd-font-size: ${effectiveSettings.fontSize}px;`,
        },
      },
    });
    renderedContent = newContent;
  }

  onMount(() => {
    syncEditor();
  });

  $effect(() => {
    if (editor) {
      syncEditor();
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
    style:background-color={effectiveSettings.paperColor}
    style:min-height={!isNaN(effectiveSettings.pageHeight) ? `${effectiveSettings.pageHeight}px` : '1056px'}
    style:--hd-font-family={effectiveSettings.fontBody}
    style:--hd-font-title={effectiveSettings.fontTitle}
    style:--hd-font-size={!isNaN(effectiveSettings.fontSize) ? `${effectiveSettings.fontSize}px` : '16px'}
  >
  </div>
</div>
