<script lang="ts">
import { useConvexClient, useQuery } from 'convex-svelte';
import { goto } from '$app/navigation';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import DocumentViewer from '$lib/editor/ui/DocumentViewer.svelte';
import { Badge } from '$lib/components/ui/badge';
import { Button } from '$lib/components/ui/button';
import { Spinner } from '$lib/components/ui/spinner';
import { Input } from '$lib/components/ui/input';
import { cn } from '$lib/utils';
import EnvelopeTable from './EnvelopeTable.svelte';

interface Document {
	_id: string;
	title: string;
	content: any;
	status: 'draft' | 'pending_signatures' | 'completed' | 'expired' | 'voided';
	version?: number;
	instanceCount?: number;
	settings?: Record<string, any>;
	completedAt?: number;
	sealedAt?: number;
	_creationTime: number; // Required to match Envelope interface
	signers?: any[];
}

interface Props {
	template: Document;
	envelopes: Document[];
	onBack: () => void;
}

const { template, envelopes, onBack }: Props = $props();

const client = useConvexClient();

let searchQuery = $state('');
let statusFilter = $state('all');
let isSendWizardOpen = $state(false);

// Fetch slots and signers for template preview
const slotsQuery = useQuery(api.slots.queries.listByDocument, () => ({
	documentId: template._id as Id<'documents'>
}));
const signersQuery = useQuery(api.signers.queries.listByDocument, () => ({
	documentId: template._id as Id<'documents'>
}));

const filteredEnvelopes = $derived.by(() => {
	let docs = envelopes;

	if (statusFilter !== 'all') {
		docs = docs.filter((d) => d.status === statusFilter);
	}

	if (searchQuery.trim()) {
		const q = searchQuery.toLowerCase();
		docs = docs.filter((d) => d.title.toLowerCase().includes(q));
	}

	return docs;
});

const stats = $derived.by(() => {
	const total = envelopes.length;
	const completed = envelopes.filter((e) => e.status === 'completed').length;
	const pending = envelopes.filter((e) => e.status === 'pending_signatures').length;
	const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

	return { total, completed, pending, completionRate };
});

async function handleDelete(docId: string) {
	if (confirm('Are you sure you want to void this envelope?')) {
		await client.mutation(api.documents.mutations.delete.remove, {
			documentId: docId as Id<'documents'>
		});
	}
}

function handleNewEnvelope() {
	// Navigate to send wizard (or open modal when implemented)
	goto(`/editor/${template._id}?send=true`);
}

const slots = $derived([...(slotsQuery.data ?? []), ...(signersQuery.data ?? [])]);
</script>

<div class="space-y-8 animate-in fade-in duration-500">
	<!-- Header -->
	<div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
		<div class="flex items-center gap-4">
			<Button
				variant="ghost"
				size="sm"
				onclick={onBack}
				class="group px-2 text-muted-foreground hover:text-foreground"
			>
				<span
					class="i-lucide-arrow-left mr-2 w-4 h-4 transition-transform group-hover:-translate-x-1"
				></span>
				Back to Templates
			</Button>
			<div class="h-6 w-px bg-border"></div>
			<div>
				<div class="flex items-center gap-2">
					<h1 class="font-bold text-2xl tracking-tight">{template.title}</h1>
					<Badge variant="secondary" class="border-none bg-primary/10 text-primary">Template</Badge>
				</div>
				<p class="text-muted-foreground text-sm">Folder Overview & Envelope Tracking</p>
			</div>
		</div>

		<div class="flex items-center gap-3">
			<Button variant="outline" onclick={() => goto(`/editor/${template._id}`)} class="gap-2">
				<span class="i-lucide-edit-3 w-4 h-4"></span>
				Edit Template
			</Button>
			<Button onclick={handleNewEnvelope} class="gap-2 shadow-lg shadow-primary/20">
				<span class="i-lucide-plus w-4 h-4"></span>
				New Envelope
			</Button>
		</div>
	</div>

	<div class="grid grid-cols-1 gap-8 lg:grid-cols-12">
		<!-- Left Column: Template Preview -->
		<div class="lg:col-span-5 xl:col-span-4">
			<div class="sticky top-24 space-y-6">
				<!-- Template Card -->
				<div
					class="overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all hover:shadow-md"
				>
					<div
						class="flex items-center justify-between border-border border-b bg-muted/30 px-4 py-3"
					>
						<h3
							class="flex items-center gap-2 font-bold text-[10px] text-muted-foreground uppercase tracking-widest"
						>
							<span class="i-lucide-file-text w-3 h-3"></span>
							Master Reference
						</h3>
						<span class="font-mono text-[10px] text-muted-foreground opacity-60">
							V{template.version ?? 1}
						</span>
					</div>

					<!-- Preview -->
					<div
						class="relative h-[400px] overflow-y-auto overflow-x-hidden bg-white dark:bg-zinc-950"
					>
						<div class="origin-top-left" style="transform: scale(0.55); width: 182%;">
							{#if !slotsQuery.isLoading}
								<DocumentViewer
									content={template.content}
									mode="preview"
									settings={{ ...(template.settings ?? {}), marginVertical: 16, marginHorizontal: 16 }}
									showBadge={false}
									class="border-none shadow-none ring-0"
								/>
							{:else}
								<div class="flex h-[400px] w-full items-center justify-center">
									<Spinner size="lg" />
								</div>
							{/if}
						</div>
					</div>

					<!-- Footer with slot indicators -->
					<div
						class="flex items-center justify-between border-border border-t bg-muted/20 px-4 py-3"
					>
						<div class="flex -space-x-2">
							{#each slots.slice(0, 5) as slot (slot._id)}
								<div
									class="h-6 w-6 rounded-full border-2 border-background shadow-sm"
									style="background-color: {slot.color}"
									title={(slot as any).name || (slot as any).legalName || 'Slot'}
								></div>
							{/each}
						</div>
						<span
							class="rounded-full border border-border bg-background/50 px-2 py-0.5 font-bold text-[9px] text-muted-foreground backdrop-blur-sm"
						>
							{slots.length} SLOTS
						</span>
					</div>
				</div>

				<!-- Analytics Card -->
				<div class="space-y-4 rounded-2xl border border-border bg-card p-5">
					<h4 class="font-bold text-[10px] text-muted-foreground uppercase tracking-widest">
						Analytics
					</h4>
					<div class="space-y-3">
						<div class="flex items-end justify-between">
							<span class="font-medium text-muted-foreground text-xs">
								Total Envelopes Created
							</span>
							<span class="font-bold text-sm">{template.instanceCount || 0}x</span>
						</div>
						<div class="h-1.5 w-full overflow-hidden rounded-full bg-muted">
							<div
								class="h-full rounded-full bg-primary transition-all duration-500"
								style="width: {stats.completionRate}%"
							></div>
						</div>
						<div class="flex items-end justify-between">
							<span class="font-medium text-muted-foreground text-xs">Completion Rate</span>
							<span class="font-bold text-green-600 text-sm">{stats.completionRate}%</span>
						</div>
					</div>
				</div>
			</div>
		</div>

		<!-- Right Column: Envelopes Table -->
		<div class="space-y-6 lg:col-span-7 xl:col-span-8">
			<!-- Stats Strip -->
			<div
				class="flex flex-wrap items-center gap-3 rounded-2xl border border-border/40 bg-card/30 p-3 backdrop-blur-sm"
			>
				{#each [
					{ label: 'Total', value: stats.total, color: 'text-foreground', iconClass: 'i-lucide-file-text' },
					{ label: 'Awaiting', value: stats.pending, color: 'text-blue-500', iconClass: 'i-lucide-clock', animate: true },
					{ label: 'Completed', value: stats.completed, color: 'text-green-500', iconClass: 'i-lucide-check-circle-2' }
				] as stat (stat.label)}
					<div
						class="flex items-center gap-3 px-4 py-1 first:pl-2 last:border-border/20 last:border-l even:border-border/20 even:border-l"
					>
						<div class={cn('rounded-lg bg-muted/40 p-1.5', stat.animate && 'animate-pulse')}>
							<span class={cn(stat.iconClass, 'w-3.5 h-3.5 opacity-70', stat.color)}></span>
						</div>
						<div class="flex flex-col">
							<span
								class="font-bold text-[9px] text-muted-foreground uppercase leading-none tracking-tight"
							>
								{stat.label}
							</span>
							<span class={cn('font-bold text-lg tracking-tight', stat.color)}>{stat.value}</span>
						</div>
					</div>
				{/each}

				<div class="ml-auto flex items-center gap-2 pr-2">
					<div class="mx-2 h-6 w-px bg-border/20"></div>
					<div class="flex flex-col items-end">
						<span class="font-bold text-[9px] text-muted-foreground uppercase tracking-tight">
							Success
						</span>
						<span class="font-bold text-green-500 text-sm">{stats.completionRate}%</span>
					</div>
				</div>
			</div>

			<!-- Search and Filters -->
			<div class="flex flex-col items-center gap-4 sm:flex-row">
				<div class="relative w-full max-w-md">
					<span
						class="i-lucide-search absolute top-1/2 left-3 w-4 h-4 -translate-y-1/2 text-muted-foreground"
					></span>
					<Input
						placeholder="Search..."
						class="h-10 border-border/40 bg-card/50 pl-10 shadow-sm transition-all focus:border-primary/50"
						bind:value={searchQuery}
					/>
				</div>
				<div class="flex w-full rounded-lg border border-border bg-muted/50 p-1 sm:w-auto">
					{#each [
						{ id: 'all', label: 'All' },
						{ id: 'pending_signatures', label: 'Awaiting' },
						{ id: 'completed', label: 'Completed' }
					] as filter (filter.id)}
						<Button
							variant={statusFilter === filter.id ? 'secondary' : 'ghost'}
							size="sm"
							onclick={() => (statusFilter = filter.id)}
							class={cn(
								'flex-1 h-auto py-1.5 font-semibold text-xs transition-all sm:flex-none',
								statusFilter === filter.id
									? 'bg-background text-foreground shadow-sm'
									: 'text-muted-foreground hover:text-foreground'
							)}
						>
							{filter.label}
						</Button>
					{/each}
				</div>
			</div>

			<EnvelopeTable envelopes={filteredEnvelopes} onDelete={handleDelete} />

			{#if filteredEnvelopes.length === 0 && (searchQuery || statusFilter !== 'all')}
				<div class="flex flex-col items-center justify-center space-y-4 py-20 text-center">
					<div class="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
						<span class="i-lucide-search w-8 h-8 text-muted-foreground/40"></span>
					</div>
					<div>
						<p class="font-bold text-sm">No envelopes found</p>
						<p class="text-muted-foreground text-xs">Try adjusting your filters or search terms</p>
					</div>
					<Button
						variant="outline"
						size="sm"
						onclick={() => {
							searchQuery = '';
							statusFilter = 'all';
						}}
					>
						Clear Filters
					</Button>
				</div>
			{/if}
		</div>
	</div>
</div>
