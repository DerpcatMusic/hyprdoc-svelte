<script lang="ts">
	import { NodeViewContent, NodeViewWrapper } from 'svelte-tiptap';
	import { scale } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	const { node, selected, updateAttributes }: {
		node: any;
		selected: boolean;
		updateAttributes: (attrs: Record<string, any>) => void;
	} = $props();

	const columnWidths = $derived(node.attrs.columnWidths || [50, 50]);
	
	function getStyle(widths: number[]) {
		const cols = widths.map((w, i) => `--col-${i}-width: ${w}%`).join('; ');
		return `${cols}; --gap: 1rem;`;
	}
</script>

<NodeViewWrapper
	class="block-row"
	data-type="blockRow"
	style={getStyle(columnWidths)}
>
	<div 
		class="block-row-content contents" 
		in:scale={{ start: 0.98, duration: 300, easing: cubicOut }} 
		out:scale={{ start: 0.98, duration: 300, easing: cubicOut }}
	>
		<NodeViewContent />
	</div>
</NodeViewWrapper>

<style>
	/* Ensure block-row class is defined globally or in global css, but we can add some basics here if needed */
	:global(.block-row) {
		display: grid;
		grid-auto-flow: column;
		grid-gap: var(--gap, 1rem);
		width: 100%;
	}
	/* Dynamic columns usually handled by grid-template-columns generated from the widths, 
	   but the React component set variables. 
	   If the CSS relies on these vars, we keep them. 
	   Ideally, grid-template-columns should use them. */
</style>
