<script lang="ts">
	import { NodeViewContent, NodeViewWrapper } from 'svelte-tiptap';

	const props: any = $props();
	const { extension, node, updateAttributes, selected } = $derived(props);

	const columnWidths = $derived(node.attrs.columnWidths || [50, 50]);

	// Generate CSS variables for column widths
	const styles = $derived(
		columnWidths
			.map((w: number, i: number) => `--col-${i}-width: ${w}%`)
			.concat('--gap: 1rem')
			.join('; ')
	);
</script>

<NodeViewWrapper
	class="block-row relative isolate"
	data-type="blockRow"
	style={styles}
>
	<div class="block-row-content grid grid-flow-col gap-[--gap]">
		<NodeViewContent class="contents" />
	</div>
</NodeViewWrapper>

<style>
	.block-row-content {
		/* Grid template columns based on the CSS variables */
		grid-template-columns: var(--col-0-width, 1fr) var(--col-1-width, 1fr) var(--col-2-width, 1fr);
	}

	:global(.block-row .smart-block-wrapper) {
		margin-top: 0 !important;
		margin-bottom: 0 !important;
	}
</style>
