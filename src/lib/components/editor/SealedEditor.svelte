<script lang="ts">
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { Highlight } from '@tiptap/extension-highlight';
import { Underline } from '@tiptap/extension-underline';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import { FontSize } from '$lib/components/editor/extensions/FontSize';
import { FontWeight } from '$lib/components/editor/extensions/FontWeight';
import { onDestroy, onMount } from 'svelte';


interface SealedEditorProps {
	content: any;
	fieldValues?: Record<string, any>;
	settings?: any;
	slots?: any[];
	showBadge?: boolean;
	class?: string;
}

const {
	content: rawContent,
	fieldValues = {},
	settings = {},
	slots = [],
	showBadge = true,
	class: className
}: SealedEditorProps = $props();

const content = $derived.by(() => {
	if (typeof rawContent !== 'string') return rawContent;
	try {
		return JSON.parse(rawContent);
	} catch {
		return rawContent;
	}
});

let element = $state<HTMLElement>();
let editor = $state<Editor>();

onMount(() => {
	if (!element) { return; }

	editor = new Editor({
		element,
		extensions: [
			StarterKit,
			Highlight.configure({ multicolor: true }),
			Underline,
			TextStyle,
			Color,
			FontSize,
			FontWeight
		],
		content,
		editable: false,
		editorProps: {
			attributes: {
				class: 'prose prose-sm focus:outline-none max-w-none',
				style: `font-family: ${settings.fontBody || 'Inter'}, sans-serif`
			}
		}
	});
});

$effect(() => {
	if (editor && content) {
		editor.commands.setContent(content);
	}
});

onDestroy(() => {
	editor?.destroy();
});
</script>

<div class={className}>
	{#if showBadge}
		<div class="pointer-events-none absolute top-4 right-4 z-20">
			<div
				class="flex items-center gap-1.5 rounded-full border border-emerald-500/50 bg-emerald-500/10 px-3 py-1.5 text-emerald-600 dark:text-emerald-400 font-semibold text-xs uppercase tracking-wider"
			>
				<span class="i-lucide-shield w-3.5 h-3.5"></span>
				Sealed
			</div>
		</div>
	{/if}

	<div bind:this={element}></div>
</div>
