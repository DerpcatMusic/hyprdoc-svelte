<script lang="ts">
	import { getEditorModeState } from '$lib/editor/core/EditorModeState.svelte';
	import { blockRegistry } from './block-registry.svelte.ts';
	import type { RenderContext } from './types';
	import { cn } from '$lib/utils';
	import { fade } from 'svelte/transition';
	import { onMount, onDestroy } from 'svelte';
	import { useDocument } from '$lib/editor/core/editor-context';
	import type { SmartBlockData } from '$lib/types';

	let { node, attrs, editor, extension, selected = false } = $props();

	const modeState = getEditorModeState();
	const definition = $derived(blockRegistry.get(node.attrs.type));

	// ━━━ DERIVED MODE ━━━
	// Map builder -> edit, consumer -> view, sign -> sign
	const activeMode = $derived.by((): 'edit' | 'sign' | 'view' => {
		if (modeState.isBuilder) return 'edit';
		if (modeState.isSigning) return 'sign';
		return 'view';
	});

	// ━━━ DERIVED UI STATE ━━━
	const isVisible = $derived(true); // TODO: Integrate VisibilityEngine
	const slotColor = $derived(attrs.slotId ? 'var(--slot-color)' : 'transparent');

	// ━━━ ACTIONS ━━━
	function deleteBlock() {
		editor.commands.deleteSelection();
	}

	// ━━━ SELF-REGISTRATION (Bridge: Tiptap -> DocumentState) ━━━
	const documentState = useDocument();

	onMount(() => {
		// Register reactive proxy to global state
		// Since 'attrs' is already a proxy in SmartNodeView, 
		// the DocumentState will stay in sync automatically.
		documentState.addBlock({ 
			...attrs, 
			type: node.attrs.type || 'text'
		} as SmartBlockData);
	});

	onDestroy(() => {
		// Clean deregistration
		documentState.removeBlock(attrs.id);
	});
</script>

<div
	class={cn(
		'group relative my-2 rounded-xl transition-all duration-300',
		'border-2 border-transparent',
		selected && 'border-primary/50 shadow-lg ring-1 ring-primary/20',
		!isVisible && 'opacity-30 grayscale'
	)}
	style:--slot-color={attrs.slotId ? '#3b82f6' : 'transparent'}
>
	<!-- ━━━ BUILDER CHROME ━━━ -->
	{#if modeState.isBuilder}
		<div
			class="absolute -left-12 top-0 flex flex-col gap-1 opacity-0 transition-opacity group-hover:opacity-100"
			transition:fade={{ duration: 150 }}
		>
			<button
				class="flex h-8 w-8 items-center justify-center rounded-lg border bg-card shadow-sm hover:bg-accent"
				title="Drag Handle"
			>
				<div class="i-lucide-grip-vertical h-4 w-4 text-muted-foreground"></div>
			</button>
			<button
				class="flex h-8 w-8 items-center justify-center rounded-lg border bg-card shadow-sm hover:bg-destructive hover:text-destructive-foreground"
				onclick={deleteBlock}
				title="Delete Block"
			>
				<div class="i-lucide-trash-2 h-4 w-4"></div>
			</button>
		</div>

		{#if attrs.slotId}
			<div
				class="absolute -top-3 left-4 flex items-center gap-1.5 rounded-full border bg-card px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider shadow-sm"
				style:border-color={slotColor}
				style:color={slotColor}
			>
				<div class="h-1.5 w-1.5 rounded-full" style:background-color={slotColor}></div>
				{attrs.slotId}
			</div>
		{/if}
	{/if}

	<!-- ━━━ BLOCK CONTENT ━━━ -->
	<div class="block-content min-h-[40px]">
		{#if definition}
			<definition.component 
				{attrs} 
				{selected} 
				{editor} 
				{extension} 
				mode={activeMode}
				active={modeState.isBlockInteractive(attrs.slotId)}
				activeSlotId={modeState.activeSlotId}
			/>
		{:else}
			<div class="flex items-center gap-2 rounded-lg border border-dashed p-4 text-muted-foreground">
				<div class="i-lucide-alert-triangle h-5 w-5 text-warning"></div>
				<span>Unknown block type: {node.attrs.type}</span>
			</div>
		{/if}
	</div>

	<!-- ━━━ VALIDATION & STATUS ━━━ -->
	{#if attrs.required && !attrs.value && modeState.isConsumer}
		<div class="absolute -bottom-2 right-4 flex items-center gap-1 rounded-full bg-destructive px-2 py-0.5 text-[10px] text-destructive-foreground animate-bounce">
			Required
		</div>
	{/if}
</div>

