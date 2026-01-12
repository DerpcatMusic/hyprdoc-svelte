<script lang="ts">
import { formatDistanceToNow } from 'date-fns';
import { goto } from '$app/navigation';
import { Button } from '$lib/components/ui/button';
import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
import { cn } from '$lib/utils';

type EnvelopeStatus = 'draft' | 'pending_signatures' | 'completed' | 'expired' | 'voided';

interface Envelope {
	_id: string;
	title: string;
	status: string; // strict EnvelopeStatus might contradict Convex generic string
	instanceNumber?: number;
	_creationTime: number; // Changed from createdAt
	signers?: Array<{
		_id: string;
		legalName?: string;
		color: string;
		status?: 'pending' | 'signed';
	}>;
}

interface Props {
	envelopes: Envelope[];
	onDelete: (id: string) => void;
}

const { envelopes, onDelete }: Props = $props();

function handleView(id: string) {
	goto(`/envelope/${id}`);
}

const statusConfig: Record<
	EnvelopeStatus,
	{ label: string; className: string; iconClass: string }
> = {
	draft: {
		label: 'Draft',
		className: 'bg-muted text-muted-foreground',
		iconClass: 'i-lucide-file-text'
	},
	pending_signatures: {
		label: 'Awaiting',
		className: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
		iconClass: 'i-lucide-clock'
	},
	completed: {
		label: 'Completed',
		className: 'bg-green-500/10 text-green-600 dark:text-green-400',
		iconClass: 'i-lucide-check-circle-2'
	},
	expired: {
		label: 'Expired',
		className: 'bg-amber-500/10 text-amber-600',
		iconClass: 'i-lucide-clock'
	},
	voided: {
		label: 'Voided',
		className: 'bg-red-500/10 text-red-600 line-through',
		iconClass: 'i-lucide-x-circle'
	}
};
</script>

{#if !envelopes || envelopes.length === 0}
	<div
		class="flex flex-col items-center justify-center rounded-2xl border border-border border-dashed p-12 text-center"
	>
		<span class="i-lucide-file-text mb-4 h-12 w-12 text-muted-foreground/30"></span>
		<h3 class="mb-1 font-semibold text-lg">No Envelopes Yet</h3>
		<p class="text-muted-foreground text-sm">
			Create an envelope from your template to start collecting signatures
		</p>
	</div>
{:else}
	<div
		class="overflow-hidden rounded-2xl border border-border/60 bg-card/50 shadow-sm backdrop-blur-sm"
	>
		<table class="w-full border-collapse">
			<thead>
				<tr class="border-border/40 border-b bg-muted/20">
					<th
						class="py-4 pr-4 pl-6 text-left font-bold text-[10px] text-muted-foreground uppercase tracking-widest"
					>
						Envelope
					</th>
					<th
						class="px-4 py-4 text-left font-bold text-[10px] text-muted-foreground uppercase tracking-widest"
					>
						Status
					</th>
					<th
						class="px-4 py-4 text-left font-bold text-[10px] text-muted-foreground uppercase tracking-widest"
					>
						Signers
					</th>
					<th
						class="px-4 py-4 text-left font-bold text-[10px] text-muted-foreground uppercase tracking-widest"
					>
						Progress
					</th>
					<th
						class="px-4 py-4 text-left font-bold text-[10px] text-muted-foreground uppercase tracking-widest"
					>
						Created
					</th>
					<th
						class="py-4 pr-6 pl-4 text-right font-bold text-[10px] text-muted-foreground uppercase tracking-widest"
					>
						Actions
					</th>
				</tr>
			</thead>
			<tbody class="divide-y divide-border/20">
				{#each envelopes as envelope (envelope._id)}
					{@const signers = envelope.signers || []}
					{@const signedCount = signers.filter((s) => s.status === 'signed').length}
					{@const progress = signers.length > 0 ? (signedCount / signers.length) * 100 : 0}
					{@const config = statusConfig[envelope.status as EnvelopeStatus] || statusConfig.draft}
					<tr
						class="group cursor-pointer transition-all hover:bg-primary/[0.02]"
						onclick={() => handleView(envelope._id)}
					>
						<!-- Title -->
						<td class="py-5 pr-4 pl-6">
							<div class="flex flex-col">
								<span
									class="font-bold text-foreground text-sm tracking-tight transition-colors group-hover:text-primary"
								>
									{envelope.title}
								</span>
								{#if envelope.instanceNumber}
									<span
										class="mt-0.5 font-mono text-[10px] text-muted-foreground uppercase tracking-tighter opacity-70"
									>
										#{envelope.instanceNumber}
									</span>
								{/if}
							</div>
						</td>

						<!-- Status Badge -->
						<td class="px-4 py-5">
							<div
								class={cn(
									'inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold text-[10px] uppercase tracking-wide',
									config.className
								)}
							>
								<span class={cn(config.iconClass, 'w-2.5 h-2.5')}></span>
								{config.label}
							</div>
						</td>

						<!-- Signers Avatar Stack -->
						<td class="px-4 py-5">
							{#if signers.length === 0}
								<span class="text-muted-foreground text-xs">No signers</span>
							{:else}
								<div class="flex items-center -space-x-2">
									{#each signers.slice(0, 3) as signer (signer._id)}
										<div
											class={cn(
												'h-7 w-7 flex items-center justify-center rounded-full border-2 border-background font-bold text-[9px]',
												signer.status === 'signed' && 'ring-2 ring-green-500/50'
											)}
											style="background-color: {signer.color}20; color: {signer.color}; border-color: {signer.color}"
										>
											{signer.legalName?.slice(0, 2).toUpperCase() || '??'}
										</div>
									{/each}
									{#if signers.length > 3}
										<div
											class="flex h-7 w-7 items-center justify-center rounded-full border-2 border-background bg-muted font-semibold text-[10px] text-muted-foreground"
										>
											+{signers.length - 3}
										</div>
									{/if}
								</div>
							{/if}
						</td>

						<!-- Progress -->
						<td class="px-4 py-5">
							{#if signers.length > 0}
								<div class="flex items-center gap-2">
									<div class="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
										<div
											class={cn(
												'h-full rounded-full transition-all duration-300',
												signedCount === signers.length ? 'bg-green-500' : 'bg-blue-500'
											)}
											style="width: {progress}%"
										></div>
									</div>
									<span class="text-[10px] text-muted-foreground">
										{signedCount}/{signers.length}
									</span>
								</div>
							{/if}
						</td>

						<!-- Created -->
						<td class="px-4 py-5">
							<div class="flex items-center gap-2 text-muted-foreground">
								<span class="i-lucide-clock w-3 h-3 opacity-50"></span>
								<span class="font-medium text-xs">
									{formatDistanceToNow(envelope._creationTime, { addSuffix: true })}
								</span>
							</div>
						</td>

						<!-- Actions -->
						<td class="py-4 pr-6 pl-4 text-right">
							<DropdownMenu.Root>
								<DropdownMenu.Trigger>
									{#snippet child({ props })}
										<Button
											variant="ghost"
											size="icon"
											class="h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100"
											{...props}
											onclick={(e) => e.stopPropagation()}
										>
											<span class="i-lucide-more-horizontal w-3.5 h-3.5"></span>
										</Button>
									{/snippet}
								</DropdownMenu.Trigger>
								<DropdownMenu.Content align="end" class="">
									<DropdownMenu.Item
										class=""
										onclick={(e: any) => {
											e.stopPropagation();
											handleView(envelope._id);
										}}
									>
										<span class="i-lucide-external-link mr-2 w-4 h-4"></span>
										View Details
									</DropdownMenu.Item>
									<DropdownMenu.Item
										class="text-destructive focus:text-destructive"
										onclick={(e: any) => {
											e.stopPropagation();
											onDelete(envelope._id);
										}}
									>
										<span class="i-lucide-x-circle mr-2 w-4 h-4"></span>
										Void Envelope
									</DropdownMenu.Item>
								</DropdownMenu.Content>
							</DropdownMenu.Root>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
{/if}
