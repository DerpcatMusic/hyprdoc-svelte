<script lang="ts">
	import { useEditor } from "$lib/editor/core/editor-context";
	import ToolbarButton from "./toolbar/ToolbarButton.svelte";
	import ToolbarDivider from "./toolbar/ToolbarDivider.svelte";
	import ToolbarGroup from "./toolbar/ToolbarGroup.svelte";
	import ToolbarColorPicker from "./toolbar/ToolbarColorPicker.svelte";
	import ToolbarSliderInput from "./ToolbarSliderInput.svelte";

	const engine = useEditor();

	// Derived states for reactive UI
	const heading1Active = $derived(engine.headingLevel === 1);
	const heading2Active = $derived(engine.headingLevel === 2);
	const bulletListActive = $derived(engine.isBulletList);
	const orderedListActive = $derived(engine.isOrderedList);
	const blockquoteActive = $derived(engine.isBlockquote);
	const subscriptActive = $derived(engine.isSubscript);
	const superscriptActive = $derived(engine.isSuperscript);

	let toolbarStyle = $state("top: 5rem; left: 50%; transform: translateX(-50%);"); // Default top position
	let isInteracting = $state(false);

	// Expose a way for child components (sliders, color pickers) to signal interaction
	export function setInteracting(interacting: boolean) {
		isInteracting = interacting;
	}

	$effect(() => {
		if (!engine?.editor || isInteracting) return;

		// Listen to selection changes to update position
		const { from, to } = engine.selection;
		const editorSelection = engine.editor.state.selection;
		
		// Only float if:
		// 1. There is a range selected (from !== to)
		// 2. It's NOT a NodeSelection (NodeSelections have a .node property)
		//    We want to keep the toolbar fixed for block selections like Smart Blocks
		const isTextSelection = from !== to && !('node' in editorSelection);

		if (isTextSelection) {
			const { view } = engine.editor;
			try {
				const start = view.coordsAtPos(from);
				const end = view.coordsAtPos(to);
				
				// Calculate a bounding box-like center from start/end
				// (Simplified, but more stable than window.getSelection during blur)
				const top = Math.min(start.top, end.top);
				const bottom = Math.max(start.bottom, end.bottom);
				const left = (start.left + end.left) / 2;
				const width = Math.abs(end.left - start.left) || 20;

				const HEADER_HEIGHT = 60; 
				const TOOLBAR_HEIGHT = 50;
				
				let finalTop = top - TOOLBAR_HEIGHT - 10;
				if (finalTop < HEADER_HEIGHT) {
					finalTop = bottom + 10;
				}

				toolbarStyle = `top: ${finalTop}px; left: ${left}px; transform: translateX(-50%); transition: all 0.2s cubic-bezier(0.2, 0, 0, 1);`;
			} catch (e) {
				// Fallback to top if coordinates can't be calculated
				toolbarStyle = "top: 5rem; left: 50%; transform: translateX(-50%); transition: all 0.3s ease-out;";
			}
		} else {
			// Default fixed position at the top
			toolbarStyle = "top: 5rem; left: 50%; transform: translateX(-50%); transition: all 0.3s ease-out;";
		}
	});
</script>

{#if engine}
	<div 
		class="fixed z-[100] flex items-center gap-1 p-1.5 rounded-xl border border-border/60 bg-card shadow-premium animate-in fade-in zoom-in-95 duration-300"
		style={toolbarStyle}
	>
		<!-- Text Style Group -->
		<ToolbarGroup>
			<ToolbarButton 
				onclick={() => engine.toggleBold()} 
				isActive={engine.isBold} 
				label="Bold" 
				shortcut="⌘B" 
				iconClass="i-lucide-bold" 
			/>
			<ToolbarButton 
				onclick={() => engine.toggleItalic()} 
				isActive={engine.isItalic} 
				label="Italic" 
				shortcut="⌘I" 
				iconClass="i-lucide-italic" 
			/>
			<ToolbarButton 
				onclick={() => engine.toggleUnderline()} 
				isActive={engine.isUnderline} 
				label="Underline" 
				shortcut="⌘U" 
				iconClass="i-lucide-underline" 
			/>
			<ToolbarButton 
				onclick={() => engine.toggleStrike()} 
				isActive={engine.isStrike} 
				label="Strikethrough" 
				shortcut="⌘⇧X" 
				iconClass="i-lucide-strikethrough" 
			/>
		</ToolbarGroup>

		<ToolbarDivider />

		<!-- Heading & Blocks -->
		<ToolbarGroup>
			<ToolbarButton 
				onclick={() => engine.toggleHeading(1)} 
				isActive={heading1Active} 
				label="Heading 1" 
				shortcut="⌘⌥1" 
				iconClass="i-lucide-heading-1" 
			/>
			<ToolbarButton 
				onclick={() => engine.toggleHeading(2)} 
				isActive={heading2Active} 
				label="Heading 2" 
				shortcut="⌘⌥2" 
				iconClass="i-lucide-heading-2" 
			/>
			<ToolbarButton 
				onclick={() => engine.toggleBlockquote()} 
				isActive={blockquoteActive} 
				label="Blockquote" 
				shortcut="⌘⇧B" 
				iconClass="i-lucide-quote" 
			/>
		</ToolbarGroup>

		<ToolbarDivider />

		<!-- Alignment -->
		<ToolbarGroup>
			<ToolbarButton 
				onclick={() => engine.setTextAlign('left')} 
				isActive={engine.textAlign === 'left'} 
				label="Align Left" 
				iconClass="i-lucide-text-align-start" 
			/>
			<ToolbarButton 
				onclick={() => engine.setTextAlign('center')} 
				isActive={engine.textAlign === 'center'} 
				label="Align Center" 
				iconClass="i-lucide-text-align-center" 
			/>
			<ToolbarButton 
				onclick={() => engine.setTextAlign('right')} 
				isActive={engine.textAlign === 'right'} 
				label="Align Right" 
				iconClass="i-lucide-text-align-end" 
			/>
		</ToolbarGroup>

		<ToolbarDivider />

		<!-- Lists -->
		<ToolbarGroup>
			<ToolbarButton 
				onclick={() => engine.toggleBulletList()} 
				isActive={bulletListActive} 
				label="Bullet List" 
				iconClass="i-lucide-list" 
			/>
			<ToolbarButton 
				onclick={() => engine.toggleOrderedList()} 
				isActive={orderedListActive} 
				label="Numbered List" 
				iconClass="i-lucide-list-ordered" 
			/>
		</ToolbarGroup>

		<ToolbarDivider />

		<!-- Specialized Actions -->
		<ToolbarGroup>
			<ToolbarButton 
				onclick={() => engine.toggleSubscript()} 
				isActive={subscriptActive} 
				label="Subscript" 
				iconClass="i-lucide-subscript" 
			/>
			<ToolbarButton 
				onclick={() => engine.toggleSuperscript()} 
				isActive={superscriptActive} 
				label="Superscript" 
				iconClass="i-lucide-superscript" 
			/>
			<ToolbarColorPicker 
				value={engine.highlightColor} 
				onColorSelect={(c) => engine.setHighlight(c)} 
				label="Highlight" 
				iconClass="i-lucide-highlighter" 
				onInteractionChange={setInteracting}
			/>
			<ToolbarButton 
				onclick={() => engine.setHorizontalRule()} 
				label="Horizontal Rule" 
				iconClass="i-lucide-minus" 
			/>
		</ToolbarGroup>
		
		<ToolbarDivider />

		<!-- Font Properties (Sliders) - Moved to end -->
		<div class="flex items-center gap-1 px-1">
			<ToolbarSliderInput 
				label="Size"
				value={engine.fontSize || 16}
				onValueChange={(v) => engine.setFontSize(v)}
				min={8}
				max={72}
				unit="px"
				onInteractionChange={setInteracting}
			/>
			<ToolbarSliderInput 
				label="Weight"
				value={engine.fontWeight || 400}
				onValueChange={(v) => engine.setFontWeight(v)}
				min={100}
				max={900}
				step={100}
				onInteractionChange={setInteracting}
			/>
		</div>
	</div>
{/if}

<style>
	/* Custom scrollbar for small screens overflow */
	div::-webkit-scrollbar {
		display: none;
	}
</style>
