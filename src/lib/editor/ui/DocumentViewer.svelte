<script lang="ts">
	/**
	 * DocumentViewer - Unified Document Rendering Component
	 *
	 * Renders Tiptap content in three modes:
	 * - builder: Full editing with all interactions
	 * - viewer: Read-only with full fidelity (sealed/signing)
	 * - preview: Minimal rendering for thumbnails
	 *
	 * @module lib/editor/ui/DocumentViewer.svelte
	 */
	import { Editor, type JSONContent } from '@tiptap/core';
	import { onMount, onDestroy } from 'svelte';
	import { createEditorExtensions, type EditorMode } from '../core/extensions';
	import { DocumentState } from '../core/DocumentState.svelte';

	interface Props {
		/** Document content (JSON or string) */
		content: JSONContent | string;
		/** Rendering mode */
		mode?: EditorMode;
		/** CSS scale for thumbnails (default: 1) */
		scale?: number;
		/** Show "Sealed" badge */
		showBadge?: boolean;
		/** Document state for block context (optional) */
		documentState?: DocumentState | null;
		/** Document settings for styling */
		settings?: {
			fontBody?: string;
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
		mode = 'viewer',
		scale = 1,
		showBadge = false,
		documentState = null,
		settings = {},
		class: className = ''
	}: Props = $props();

	// Parse content if string
	const parsedContent = $derived.by(() => {
		if (typeof rawContent !== 'string') return rawContent;
		try {
			return JSON.parse(rawContent);
		} catch {
			return rawContent;
		}
	});

	// Defaults for settings
	const effectiveSettings = $derived({
		fontBody: settings.fontBody ?? 'Inter',
		fontSize: settings.fontSize ?? 16,
		marginVertical: settings.marginVertical ?? 48,
		marginHorizontal: settings.marginHorizontal ?? 48,
		pageWidth: settings.pageWidth ?? 816,
		pageHeight: settings.pageHeight ?? 1056,
		paperColor: settings.paperColor ?? '#ffffff'
	});

	// Editor state
	let element = $state<HTMLElement>();
	let editor = $state<Editor>();

	onMount(() => {
		if (!element) return;

		const extensions = createEditorExtensions({
			mode,
			documentState
		});

		editor = new Editor({
			element,
			extensions,
			content: parsedContent,
			editable: mode === 'builder',
			editorProps: {
				attributes: {
					class: 'prose prose-sm focus:outline-none max-w-none',
					style: `font-family: ${effectiveSettings.fontBody}, sans-serif; font-size: ${effectiveSettings.fontSize}px;`
				}
			}
		});
	});

	// Update content when it changes externally
	$effect(() => {
		if (editor && parsedContent) {
			editor.commands.setContent(parsedContent);
		}
	});

	onDestroy(() => {
		editor?.destroy();
	});
</script>

<div
	class="document-viewer relative {className}"
	style:transform="scale({scale})"
	style:transform-origin="top left"
	style:width={scale < 1 ? `${100 / scale}%` : undefined}
>
	{#if showBadge && mode !== 'builder'}
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
		class="relative"
		style:padding-top="{effectiveSettings.marginVertical}px"
		style:padding-bottom="{effectiveSettings.marginVertical}px"
		style:padding-left="{effectiveSettings.marginHorizontal}px"
		style:padding-right="{effectiveSettings.marginHorizontal}px"
		style:background-color={effectiveSettings.paperColor}
		style:min-height="{effectiveSettings.pageHeight}px"
		style:font-family="{effectiveSettings.fontBody}, sans-serif"
	></div>
</div>
