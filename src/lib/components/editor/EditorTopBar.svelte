<script lang="ts">
	import { useEditor, useDocument, useModeState } from '$lib/editor/core/editor-context';
	import type { BlockSnapshot } from '$lib/editor/core/EditorModeState.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '$lib/components/ui/tooltip';
	import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator } from '$lib/components/ui/dropdown-menu';
	import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '$lib/components/ui/select';
	import { Spinner } from '$lib/components/ui/spinner';
	import { cn } from '$lib/utils';
	import { api } from '@/convex/_generated/api';
	import type { Id } from '@/convex/_generated/dataModel';
	import CollaboratorAvatars from './CollaboratorAvatars.svelte';

	interface Props {
		documentId?: Id<'documents'>;
		title: string;
		isSaving: boolean;
		lastSavedAt: number | null;
		isSealed: boolean;
		onSave: () => void;
		onSend: () => void;
		onExport?: (type: 'pdf' | 'hdoc') => void;
		isHdocExporting?: boolean;
	}

	let {
		documentId,
		title = $bindable(),
		isSaving,
		lastSavedAt,
		isSealed,
		onSave,
		onSend,
		onExport,
		isHdocExporting = false
	}: Props = $props();

	const engine = useEditor();
	const documentState = useDocument();
	const modeState = useModeState();

	const canUndo = $derived(engine.editor?.can().undo() ?? false);
	const canRedo = $derived(engine.editor?.can().redo() ?? false);

	const handleUndo = () => engine.editor?.chain().focus().undo().run();
	const handleRedo = () => engine.editor?.chain().focus().redo().run();

	const modes = [
		{ id: 'builder', label: 'Edit', icon: 'i-lucide-pen-tool' },
		{ id: 'preview', label: 'Preview', icon: 'i-lucide-eye' },
		{ id: 'signing', label: 'Sign', icon: 'i-lucide-pen-line' }
	] as const;

	function handleModeChange(modeId: string) {
		const editor = engine.editor;

		if (modeId === 'builder') {
			// Exit consumer mode
			const result = modeState.exit();
			
			// If we had a snapshot, restore it
			if (result) {
				if (result.blocks) {
					documentState.setBlocks(result.blocks);
				}
				if (result.layout && editor) {
					// Restore Tiptap document structure
					editor.commands.setContent(result.layout, { emitUpdate: false });
				}
			}
			
			// Re-enable document structure editing
			editor?.setEditable(true);

		} else if (modeId === 'preview') {
			// Enter preview
			const json = editor?.getJSON();
			modeState.enterPreview(documentState.blocksSnapshot, json);
			
			// Disable document structure editing (blocks remain interactive via NodeView)
			editor?.setEditable(false);

		} else if (modeId === 'signing') {
			// Enter signing
			const json = editor?.getJSON();
			
			// Default to first slot if none selected (legacy behavior)
			const slots = documentState.slots;
			const slot = slots.length > 0 
				? { id: String(slots[0].id), name: slots[0].name, color: slots[0].color || '#000000', email: slots[0].email } 
				: { id: 'signer-1', name: 'Signer 1', color: '#6366f1' }; // Fallback dummy slot
			
			modeState.enterSigning(slot, documentState.blocksSnapshot, json);
			
			// Disable document structure editing
			editor?.setEditable(false);
		}
	}

	// Simulation Helpers
	const slots = $derived(documentState.slots || []);
	const activeSlotId = $derived(modeState.activeSlotId);
	
	function handleSlotChange(slotId: string | undefined) {
		if (!slotId) return;
		const slot = slots.find(s => String(s.id) === slotId);
		if (slotId === 'everyone') {
			modeState.setActiveSlot(null);
		} else if (slot) {
			modeState.setActiveSlot({ id: String(slot.id), name: slot.name, color: slot.color || '#000000' });
		}
	}

</script>

<header class="flex h-12 w-full shrink-0 items-center justify-between border-b border-border/40 bg-card px-4 z-50">
	<!-- LEFT: Navigation & Context -->
	<div class="flex items-center gap-3">
		<a href="/dashboard" class="p-2 hover:bg-muted rounded-lg transition-colors group" aria-label="Back to Dashboard">
			<span class="i-lucide-chevron-left w-4 h-4 text-muted-foreground group-hover:text-foreground"></span>
		</a>

		<div class="mx-1 h-4 w-px bg-border"></div>

	<div class="flex flex-col justify-center">
		<input
			bind:value={title}
			class="h-6 w-48 rounded-sm bg-transparent px-1 font-medium text-sm outline-none hover:bg-muted/50 focus:bg-muted focus:ring-1 focus:ring-ring/20 md:w-64"
			placeholder="Untitled Document"
			disabled={modeState.isConsumer}
		/>
	</div>

	{#if !modeState.isConsumer}
		<div class="flex items-center gap-0.5">
			<TooltipProvider delayDuration={500}>
				<Tooltip>
					<TooltipTrigger>
						{#snippet child({ props })}
							<Button
								variant="ghost"
								size="icon"
								onclick={handleUndo}
								disabled={!canUndo}
								class="h-7 w-7 text-muted-foreground hover:text-foreground"
								{...props}
							>
								<span class="i-lucide-undo-2 w-3.5 h-3.5"></span>
							</Button>
						{/snippet}
					</TooltipTrigger>
					<TooltipContent side="bottom" class="">Undo</TooltipContent>
				</Tooltip>

				<Tooltip>
					<TooltipTrigger>
						{#snippet child({ props })}
							<Button
								variant="ghost"
								size="icon"
								onclick={handleRedo}
								disabled={!canRedo}
								class="h-7 w-7 text-muted-foreground hover:text-foreground"
								{...props}
							>
								<span class="i-lucide-redo-2 w-3.5 h-3.5"></span>
							</Button>
						{/snippet}
					</TooltipTrigger>
					<TooltipContent side="bottom" class="text-xs font-medium px-2 py-1">Redo</TooltipContent>
				</Tooltip>
			</TooltipProvider>
		</div>
	{/if}

	<div class="mx-1 h-4 w-px bg-border"></div>

	<div class="flex items-center gap-2 px-1">
		<span class="text-[10px] text-muted-foreground font-mono uppercase tracking-widest tabular-nums">
			{#if isSaving}
				<span class="flex items-center gap-1.5 anim-pulse">
					<span class="i-lucide-refresh-cw w-3 h-3 animate-spin"></span>
					Saving...
				</span>
			{:else if lastSavedAt}
				Last saved at {new Date(lastSavedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
			{:else}
				Not saved yet
			{/if}
		</span>
	</div>
</div>

<!-- CENTER: Mode Switcher -->
<div class="absolute left-1/2 flex -translate-x-1/2 items-center gap-3">
	<!-- Margin Toggle -->
	{#if !modeState.isConsumer}
		<TooltipProvider delayDuration={500}>
			<Tooltip>
				<TooltipTrigger>
					{#snippet child({ props })}
						<Button
							variant="ghost"
							size="icon"
							onclick={() => documentState.updateSettings({ showMargins: !documentState.documentSettings.current.showMargins })}
							class={cn(
								"h-8 w-8 transition-all duration-300",
								documentState.documentSettings.current.showMargins 
									? "bg-primary/10 text-primary shadow-[0_0_10px_rgba(var(--primary),0.3)] hover:bg-primary/20 hover:text-primary hover:shadow-[0_0_15px_rgba(var(--primary),0.4)]" 
									: "text-muted-foreground hover:text-foreground hover:bg-muted"
							)}
							{...props}
						>
							<span class="i-lucide-hash w-4 h-4"></span>
						</Button>
					{/snippet}
				</TooltipTrigger>
				<TooltipContent side="bottom" class="font-medium text-xs">Toggle Margins</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	{/if}

	<div class="flex items-center rounded-md border border-border bg-muted/30 p-1">
		{#each modes as mode}
			<button
				type="button"
				onclick={() => handleModeChange(mode.id)}
				class={cn(
					"flex items-center gap-2 rounded px-3 py-1 font-medium text-xs transition-all",
					mode.id === 'builder' 
						? (modeState.isBuilder ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")
						: (modeState.mode === mode.id ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")
				)}
			>
				<span class={cn(mode.icon, "w-3 h-3")}></span>
				{mode.label}
			</button>
		{/each}
	</div>
</div>

<!-- RIGHT: Actions -->
<div class="flex items-center gap-3">
	{#if modeState.isConsumer}

			<div class="flex items-center gap-2">
				<span class="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Viewing as</span>
				
				<Select 
					value={activeSlotId || 'everyone'}
					onValueChange={(v: string | undefined) => handleSlotChange(v)}
				>
					<SelectTrigger class="h-8 w-40 text-xs bg-muted/20 border-transparent">
						<SelectValue placeholder="Everyone" class="" />
					</SelectTrigger>
					<!-- Use SelectContent instead of Select.Content -->
					<SelectContent align="end" class="">
						<SelectItem value="everyone" label="Everyone" class="text-xs">
							<div class="flex items-center gap-2">
								<span class="i-lucide-users w-3 h-3"></span>
								<span>Everyone</span>
							</div>
						</SelectItem>
						{#each slots as slot}
							<SelectItem value={slot.id} label={slot.name} class="text-xs">
								<div class="flex items-center gap-2">
									<div
										class="h-2 w-2 rounded-full"
										style:background-color={slot.color}
									></div>
									<span>{slot.name}</span>
								</div>
							</SelectItem>
						{/each}
					</SelectContent>
				</Select>
			</div>
		{:else}
			{#if documentId}
				<CollaboratorAvatars {documentId} />
			{/if}

			<div class="mx-1 h-4 w-px bg-border"></div>

			<!-- Export Dropdown -->
			<DropdownMenu>
				<DropdownMenuTrigger>
						<Button
							variant="outline"
							size="sm"
							class="h-7 gap-1.5 border-dashed border-muted-foreground/30 hover:border-muted-foreground/50 bg-transparent text-muted-foreground"
						>
							<span class="i-lucide-download w-3.5 h-3.5"></span>
							<span>Export</span>
						</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end" class="w-48">
					<DropdownMenuLabel class="">Export</DropdownMenuLabel>
					<DropdownMenuSeparator class="" />
					<DropdownMenuItem onclick={() => onExport?.('pdf')} class="gap-2">
						<span class="i-lucide-file-text w-3.5 h-3.5"></span>
						<span>PDF Document</span>
					</DropdownMenuItem>
					<DropdownMenuItem
						onclick={() => onExport?.('hdoc')}
						disabled={isHdocExporting}
						class="gap-2"
					>
						<div class="flex items-center gap-2">
							{#if isHdocExporting}
								<Spinner size="xs" />
							{:else}
								<span class="i-lucide-file-json w-3.5 h-3.5"></span>
							{/if}
							<span>HyprDoc File</span>
						</div>
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>

			<!-- Send Button -->
			<Button
				onclick={onSend}
				size="sm"
				class="h-8 gap-2 bg-foreground text-background hover:bg-foreground/90"
			>
				<span class="i-lucide-send w-3.5 h-3.5"></span>
				<span>Send</span>
			</Button>

			<!-- Share Placeholder -->
			<Button
				variant="ghost"
				size="icon"
				class="h-8 w-8 text-muted-foreground hover:text-foreground"
			>
				<span class="i-lucide-share-2 w-4 h-4"></span>
			</Button>
		{/if}
	</div>
</header>
