<script lang="ts">
	/**
	 * EditorCanvas - Tiptap Mount Point
	 *
	 * Mounts the Tiptap editor to the DOM and handles document settings styling.
	 * Includes responsive "Paper Mode" scaling using Runed ElementSize.
	 * 
	 * IMPORTANT: Extensions should be passed from createEditorExtensions() factory.
	 */
	import { useEditor, useDocument } from '../core/editor-context';
	import EditorBubbleMenu from '../../components/editor/EditorBubbleMenu.svelte';
	import EditorMargins from '../../components/editor/EditorMargins.svelte';
	import EditorBranding from '../../components/editor/EditorBranding.svelte';
	import { untrack } from 'svelte';
	import { ElementSize } from 'runed';
	import type { AnyExtension, JSONContent } from '@tiptap/core';

	// Props
	interface Props {
		extensions?: AnyExtension[];
		initialContent?: JSONContent;
	}

	let { extensions = [], initialContent }: Props = $props();

	// Context
	const editor = useEditor();
	const doc = useDocument();

	// Refs
	let editorElement = $state<HTMLDivElement>();
	let containerElement = $state<HTMLDivElement>();
	let bubbleMenuElement = $state<HTMLDivElement>();
	let hasMounted = $state(false);

	// ━━━ RESPONSIVE SCALING (Runed) ━━━
	const containerSize = new ElementSize(() => containerElement);
	const settings = $derived(doc.documentSettings.current);

	// Auto-calculate scale to fit document in view
	const scale = $derived.by(() => {
		if (!containerSize.width || !settings.pageWidth) return 1;
		
		// 64px padding (p-8 = 2rem = 32px on each side)
		const availableWidth = containerSize.width - 64;
		const requiredWidth = settings.pageWidth;

		if (availableWidth < requiredWidth) {
			// Limit min scale to 0.4 to prevent becoming microscopic
			return Math.max(0.4, availableWidth / requiredWidth);
		}
		return 1;
	});

	// ━━━ TEXTURE GENERATION ━━━
	import { generateTextureCSS } from '$lib/utils/textures';
	
	const textureStyle = $derived(
		doc.documentSettings.current.paperTexture !== 'none' 
		? generateTextureCSS(doc.documentSettings.current.paperTexture, {
			color: doc.documentSettings.current.paperTextureColor || '#000000',
			opacity: doc.documentSettings.current.paperTextureOpacity,
			scale: doc.documentSettings.current.paperTextureScale ?? 1,
			monochromatic: doc.documentSettings.current.paperTextureMonochromatic
		}) 
		: undefined
	);

	/* ━━━ SCROLLBAR STYLING ━━━ */
	const scrollbarStyles = $derived(`
		.custom-scrollbar::-webkit-scrollbar {
			width: 6px;
		}
		.custom-scrollbar::-webkit-scrollbar-track {
			background: transparent;
			margin: 4px 0;
		}
		.custom-scrollbar::-webkit-scrollbar-thumb {
			background-color: var(--primary);
			opacity: 0.2;
			border-radius: 99px;
		}
		.custom-scrollbar::-webkit-scrollbar-thumb:hover {
			background-color: var(--primary);
			opacity: 0.5;
		}
	`);

	// ━━━ MOUNT EDITOR ━━━
	$effect(() => {
		if (editorElement && !hasMounted) {
			untrack(() => {
				// Extensions come from factory (includes BubbleMenu if configured)
				editor.mount(editorElement!, extensions, initialContent);
				hasMounted = true;
			});
		}
	});
</script>

<svelte:head>
	{@html `<style>${scrollbarStyles}</style>`}
</svelte:head>


<div 
	bind:this={containerElement}
	class="flex h-full w-full items-center justify-center p-8 overflow-hidden"
>
	<div
		id="document-canvas"
		class="relative flex flex-col bg-white transition-all duration-500 origin-center border-2 border-primary/30 rounded-2xl shadow-premium box-border overflow-hidden"
		style:width="{settings.pageWidth}px"
		style:height="{settings.pageHeight}px"
		style:background-color={settings.paperColor}
		style:transform="scale({scale})"
		style:transition-timing-function="cubic-bezier(0.2, 0.8, 0.2, 1)"
	>
		<!-- Margins Overlay -->
		<EditorMargins />

		<!-- Branding Overlay -->
		<EditorBranding />
		<!-- Paper texture overlay -->
		{#if settings.paperTexture !== 'none' && textureStyle}
			<div
				class="pointer-events-none absolute inset-0 mix-blend-multiply z-10"
				style:background-image={textureStyle}
			></div>
		{/if}

		<!-- Tiptap mount point - SCROLLABLE CONTENT -->
		<!-- We use absolute inset to fill the border box, and handle padding inside -->
		<div
			bind:this={editorElement}
			class="custom-scrollbar relative h-full w-full overflow-y-auto outline-none z-0 scroll-smooth"
			style:padding-top="{settings.marginVertical}px"
			style:padding-bottom="{settings.marginVertical}px"
			style:padding-left="{settings.marginHorizontal}px"
			style:padding-right="{settings.marginHorizontal}px"
			style:font-family={settings.fontBody}
			style:font-size="{settings.fontSize}px"
			style:line-height={settings.lineHeight}
		></div>

		<div bind:this={bubbleMenuElement}>
			<EditorBubbleMenu />
		</div>
	</div>
</div>
