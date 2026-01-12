<script lang="ts">
import { useConvexClient } from 'convex-svelte';
import { fade, slide, fly } from 'svelte/transition';
import { toast } from 'svelte-sonner';
import { goto } from '$app/navigation';
import { api } from '@/convex/_generated/api';
import { Button } from '$lib/components/ui/button';
import { Spinner } from '$lib/components/ui/spinner';
import { uiStore } from '$lib/stores/ui-store.svelte';
import { cn } from '$lib/utils';
import DocumentStack from './DocumentStack.svelte';

interface Props {
	documents: any[];
	searchQuery: string;
	selectedIds: Set<string>;
	onToggleSelect: (id: string) => void;
	onCreate: () => void;
	onDelete: (e: MouseEvent, id: string) => void;
	onDuplicate: (e: MouseEvent, id: string) => void;
	onViewInstances: (id: string) => void;
	onEdit: (id: string) => void;
}

const {
	documents,
	searchQuery,
	selectedIds = $bindable(new Set()),
	onToggleSelect,
	onCreate,
	onDelete,
	onDuplicate,
	onViewInstances,
	onEdit
}: Props = $props();

const client = useConvexClient();
let isDragging = $state(false);
let importState = $state<'idle' | 'loading' | 'success' | 'error'>('idle');
let fileInputRef: HTMLInputElement | undefined = $state();

// Handle external import trigger from sidebar
$effect(() => {
	if (uiStore.importPickerTriggered > 0) {
		fileInputRef?.click();
	}
});

function handleDragOver(e: DragEvent) {
	e.preventDefault();
	isDragging = true;
}

function handleDragLeave() {
	isDragging = false;
}

async function handleFiles(files: FileList | null) {
	if (!files || files.length === 0) { return; }
	const file = files[0];
	if (file.type !== 'application/pdf') {
		toast.error('Only PDF files are supported');
		return;
	}

	importState = 'loading';
	try {
		// Dynamic import to avoid SSR issues with pdfjs-dist (uses DOMMatrix)
		const { parsePDFToTiptap } = await import('$lib/import');
		const result = await parsePDFToTiptap(file);
		if (result.success) {
			const id = await client.mutation(api.documents.mutations.create.createFromImport, {
				title: file.name.replace('.pdf', ''),
				content: JSON.stringify(result.document),
				blocks: result.blocks,
				slots: result.metadata.slots
			});
			importState = 'success';
			toast.success('PDF imported successfully');
			goto(`/editor/${id}`);
		} else {
			throw new Error(result.errors.join(', '));
		}
	} catch (error) {
		console.error('PDF Import failed:', error);
		importState = 'error';
		toast.error(`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
	} finally {
		setTimeout(() => {
			importState = 'idle';
		}, 2000);
	}
}

function handleDrop(e: DragEvent) {
	e.preventDefault();
	isDragging = false;
	handleFiles(e.dataTransfer?.files || null);
}

function onFileInputChange(e: Event) {
	const target = e.target as HTMLInputElement;
	handleFiles(target.files);
	// Reset value so same file can be selected again
	target.value = '';
}
</script>

<div
	class="relative grid grid-cols-1 gap-8 p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5"
>
	<!-- Hidden File Input for Sidebar Import -->
	<input
		bind:this={fileInputRef}
		type="file"
		accept="application/pdf"
		class="hidden"
		onchange={onFileInputChange}
	>
	<!-- Create New Template / PDF Drop Zone -->
	<button
		onclick={onCreate}
		ondragover={handleDragOver}
		ondragleave={handleDragLeave}
		ondrop={handleDrop}
		class={cn(
			'group relative flex aspect-210/297 w-full cursor-pointer flex-col items-center justify-center gap-4 rounded-xl border border-dashed transition-all',
			isDragging
				? 'scale-105 border-primary bg-primary/10 shadow-[0_0_30px_-5px_hsl(var(--primary)/0.6)] ring-4 ring-primary/20'
				: 'border-border bg-transparent hover:border-primary hover:bg-muted/50 hover:shadow-lg',
			importState === 'loading' && 'cursor-wait opacity-80'
		)}
	>
		{#if isDragging}
			<div class="absolute inset-0 animate-pulse rounded-2xl bg-primary/5"></div>
		{/if}

		<div
			class={cn(
				'z-10 flex h-20 w-20 items-center justify-center rounded-full transition-all duration-300',
				isDragging
					? 'scale-110 bg-primary/20 text-primary shadow-lg shadow-primary/20'
					: 'bg-muted text-muted-foreground group-hover:bg-background group-hover:text-primary group-hover:shadow-md'
			)}
		>
			{#if importState === 'loading'}
				<Spinner size="lg" />
			{:else if isDragging}
				<span class="i-lucide-file-up w-10 h-10 animate-bounce"></span>
			{:else}
				<span class="i-lucide-plus w-10 h-10"></span>
			{/if}
		</div>

		<div class="z-10 flex flex-col items-center gap-1 text-center">
			<span
				class={cn(
					'font-bold text-base uppercase tracking-widest transition-colors',
					isDragging ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
				)}
			>
				{importState === 'loading' ? 'Importing...' : isDragging ? 'Drop PDF Here' : 'Create Template'}
			</span>

			{#if !isDragging && importState !== 'loading'}
				<span
					class="max-w-[80%] text-muted-foreground/60 text-xs transition-opacity group-hover:text-muted-foreground"
				>
					Click to create blank or
					<br>
					drop PDF to import
				</span>
			{/if}
		</div>
	</button>

	<!-- Document Stacks -->
	{#each documents as doc, idx (doc._id)}
		<div
			class="relative"
			in:fly={{ y: 20, duration: 400, delay: idx * 50, easing: (t) => t * (2 - t) }}
		>
			<DocumentStack
				document={doc}
				isSelected={selectedIds.has(doc._id)}
				isSelectionMode={selectedIds.size > 0}
				onClick={() => onEdit(doc._id)}
				onEdit={() => onEdit(doc._id)}
				onDelete={(e) => onDelete(e, doc._id)}
				onDuplicate={(e) => onDuplicate(e, doc._id)}
				onToggleSelect={() => onToggleSelect(doc._id)}
				onViewInstances={() => onViewInstances(doc._id)}
			/>
		</div>
	{/each}
</div>

{#if documents.length === 0 && searchQuery}
	<div
		transition:fade
		class="flex h-64 flex-col items-center justify-center gap-4 rounded-3xl border border-muted-foreground/20 border-dashed bg-muted/5"
	>
		<p class="text-muted-foreground text-sm">No documents found matching "{searchQuery}"</p>
		<Button variant="ghost" size="sm" onclick={onCreate}>Create your first document</Button>
	</div>
{/if}

<!-- Bulk Action Bar -->
{#if selectedIds.size > 0}
	<div
		transition:slide={{ axis: 'y' }}
		class="fixed bottom-8 left-1/2 z-50 flex -translate-x-1/2 items-center gap-6 rounded-full border border-border/40 bg-background/95 px-6 py-3 shadow-2xl"
	>
		<div class="flex items-center gap-3 border-border/20 border-r pr-6">
			<span
				class="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground"
			>
				{selectedIds.size}
			</span>
			<span class="font-bold text-sm uppercase tracking-wider">Selected</span>
		</div>

		<div class="flex items-center gap-2">
			<Button
				variant="ghost"
				size="sm"
				class="gap-2 text-red-500 hover:bg-red-500/10 hover:text-red-600"
			>
				<span class="i-lucide-trash-2 w-4 h-4"></span>
				Delete
			</Button>
			<Button variant="ghost" size="sm" class="gap-2" onclick={() => selectedIds.clear()}>
				<span class="i-lucide-x w-4 h-4"></span>
				Cancel
			</Button>
		</div>
	</div>
{/if}
