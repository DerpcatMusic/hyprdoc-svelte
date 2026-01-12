<script lang="ts">
	import { useEditor } from '$lib/editor/core/editor-context';
	import ToolbarButton from './toolbar/ToolbarButton.svelte';
	import ToolbarDivider from './toolbar/ToolbarDivider.svelte';
	import { cn } from '$lib/utils';
	import { onMount, onDestroy } from 'svelte';

	const engine = useEditor();

	let element: HTMLDivElement | undefined = $state();
	let showAIImprover = $state(false);

	function handleOpenAI() {
		showAIImprover = true;
		engine?.editor?.commands.setAISelection();
	}

	function handleClose() {
		showAIImprover = false;
		engine?.editor?.commands.unsetAISelection();
	}

	// This component will be passed to Tiptap's BubbleMenu extension
	// but we need to export it or expose the element
	export function getElement() {
		return element;
	}
</script>

<div 
	bind:this={element}
	class="hidden" 
>
	{#if engine?.editor}
		<div
			class={cn(
				"flex items-center gap-1 p-1 rounded-full border border-border/40 bg-card shadow-premium animate-in fade-in zoom-in-95 duration-200",
				showAIImprover ? "p-0 border-none shadow-none" : "flex"
			)}
		>
			{#if showAIImprover}
				<div 
					class="flex items-center gap-2 bg-primary p-2 rounded-full text-primary-foreground shadow-lg"
				>
					<span class="i-lucide-sparkles w-4 h-4"></span>
					<span class="text-xs font-medium">AI Magic...</span>
					<button 
						onclick={handleClose}
						class="hover:bg-primary-foreground/20 rounded-full p-1"
						aria-label="Close"
					>
						<span class="i-lucide-x w-3 h-3"></span>
					</button>
				</div>
			{:else}
				<button
					onclick={handleOpenAI}
					class="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-all"
					title="Ask AI"
				>
					<span class="i-lucide-sparkles w-4 h-4"></span>
				</button>

				<ToolbarDivider />

				<ToolbarButton 
					onclick={() => engine.toggleBold()} 
					isActive={engine.isBold} 
					label="Bold" 
					iconClass="i-lucide-bold" 
					className="rounded-full"
				/>
				<ToolbarButton 
					onclick={() => engine.toggleItalic()} 
					isActive={engine.isItalic} 
					label="Italic" 
					iconClass="i-lucide-italic" 
					className="rounded-full"
				/>
				<ToolbarButton 
					onclick={() => engine.toggleUnderline()} 
					isActive={engine.isUnderline} 
					label="Underline" 
					iconClass="i-lucide-underline" 
					className="rounded-full"
				/>
				<ToolbarButton 
					onclick={() => engine.toggleStrike()} 
					isActive={engine.isStrike} 
					label="Strikethrough" 
					iconClass="i-lucide-strikethrough" 
					className="rounded-full"
				/>

				<ToolbarDivider />

				<ToolbarButton 
					onclick={() => engine.toggleHeading(1)} 
					isActive={engine.headingLevel === 1} 
					label="Heading 1" 
					iconClass="i-lucide-heading-1" 
					className="rounded-full"
				/>
				<ToolbarButton 
					onclick={() => engine.toggleHeading(2)} 
					isActive={engine.headingLevel === 2} 
					label="Heading 2" 
					iconClass="i-lucide-heading-2" 
					className="rounded-full"
				/>
			{/if}
		</div>
	{/if}
</div>
