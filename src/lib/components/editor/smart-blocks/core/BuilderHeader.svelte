<script lang="ts">
	import { api } from '@/convex/_generated/api';
	import type { Id } from '@/convex/_generated/dataModel';
	import { Button } from '$lib/components/ui/button';
	import * as Popover from '$lib/components/ui/popover';
	import Check from 'lucide-svelte/icons/check';
	import Plus from 'lucide-svelte/icons/plus';
	import Users from 'lucide-svelte/icons/users';
	import GripVertical from 'lucide-svelte/icons/grip-vertical';
	import Link from 'lucide-svelte/icons/link';
	import { cn } from '$lib/utils';
	import { untrack } from 'svelte';
	import { DocumentState } from '$lib/editor/core/DocumentState.svelte';

	/**
	 * BuilderHeader - Block toolbar for builder mode
	 * 
	 * IMPORTANT: This component is rendered inside a Tiptap NodeView.
	 * Tiptap NodeViews break Svelte Context, so all dependencies must be
	 * passed as PROPS, not accessed via context hooks.
	 */

	interface Props {
		blockData: any;
		isHovered: boolean;
		selected: boolean;
		onRename: (val: string) => void;
		onSlotChange: (slotId: string | null) => void;
		onToggleRequired: () => void;
		isAssignable?: boolean;
		// EXPLICIT DEPENDENCIES (no context)
		documentStore: DocumentState | null;
		convexClient: any | null;
	}

	let {
		blockData,
		isHovered,
		selected,
		onRename,
		onSlotChange,
		onToggleRequired,
		isAssignable = true,
		documentStore,
		convexClient
	}: Props = $props();

	// ━━━ DERIVED STATE (from props, not context) ━━━
	const slots = $derived.by(() => documentStore?.slots ?? []);
	const assignedSlot = $derived.by(() => {
		return slots.find((p: any) => String(p.id) === String(blockData.slotId)) ?? null;
	});
	const slotColor = $derived(assignedSlot?.color ?? '#a1a1aa');
	const isTemplate = $derived(documentStore?.kind === 'template');
	const documentId = $derived(documentStore?.documentId);

	// ━━━ LOCAL STATE ━━━
	let isRenaming = $state(false);
	let renameValue = $state('');
	let isSlotOpen = $state(false);
	let isMutating = $state(false);

	$effect(() => {
		// Sync renameValue with blockData.label when not actively renaming
		if (!isRenaming) {
			untrack(() => {
				renameValue = blockData.label;
			});
		}
	});

	const SLOT_COLORS = [
		'#6366f1', '#8b5cf6', '#d946ef', '#ec4899', '#f43f5e',
		'#f97316', '#eab308', '#22c55e', '#14b8a6', '#0ea5e9'
	];

	// ━━━ MUTATION HELPERS (direct client access, no hooks) ━━━
	async function handleAddSlot() {
		if (!documentId || !convexClient) {
			console.error('[BuilderHeader] Cannot add slot: missing documentId or convexClient');
			return;
		}

		isMutating = true;
		const count = slots.length + 1;
		const colorToUse = SLOT_COLORS[(count - 1) % SLOT_COLORS.length];
		const nameToUse = isTemplate ? `Slot ${count}` : `Signer ${count}`;

		try {
			let newId: string;

			if (isTemplate) {
				newId = await convexClient.mutation(api.slots.mutations.addSlot, {
					documentId: documentId as Id<'documents'>,
					name: nameToUse,
					color: colorToUse
				});
			} else {
				newId = await convexClient.mutation(api.signers.mutations.crud.addSigner, {
					documentId: documentId as Id<'documents'>,
					legalName: nameToUse,
					email: '',
					phone: '',
					color: colorToUse
				});
			}

			if (newId) {
				onSlotChange(newId);
			}
			isSlotOpen = false;
		} catch (err) {
			console.error('[BuilderHeader] Failed to add slot/signer:', err);
		} finally {
			isMutating = false;
		}
	}

	function handleSubmit() {
		if (renameValue.trim() && renameValue !== blockData.label) {
			onRename(renameValue);
		}
		isRenaming = false;
	}
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="relative z-20 flex select-none items-center justify-between rounded-sm py-1 transition-all duration-300"
	contenteditable="false"
	onclick={(e: MouseEvent) => e.stopPropagation()}
>
	<!-- Label / Drag Handle -->
	<div
		class="group/handle flex cursor-grab items-center gap-2 active:cursor-grabbing"
		data-drag-handle
		draggable="true"
		ondragstart={(e: DragEvent) => {
			// e.dataTransfer?.setData('application/x-docuflow-block-id', blockData.id);
		}}
		ondblclick={() => (isRenaming = true)}
	>
		<div
			class={cn(
				'rounded-sm p-1 transition-colors',
				isHovered || selected
					? 'text-foreground opacity-100'
					: 'text-muted-foreground/40 opacity-50 group-hover/handle:opacity-100'
			)}
		>
			<GripVertical class="size-3.5" />
		</div>

		{#if isRenaming}
			<input
				class="h-5 min-w-[120px] rounded-sm bg-muted/50 px-1 font-bold text-foreground text-xs uppercase tracking-widest outline-none focus:ring-1 focus:ring-primary/20"
				bind:value={renameValue}
				onblur={handleSubmit}
				onkeydown={(e: KeyboardEvent) => e.key === 'Enter' && handleSubmit()}
				onclick={(e: MouseEvent) => e.stopPropagation()}
			/>
		{:else}
			<span
				class={cn(
					'block max-w-[200px] truncate font-bold text-xs uppercase tracking-widest transition-colors',
					isHovered || selected ? 'text-foreground' : 'text-muted-foreground'
				)}
			>
				{blockData.label}
			</span>
		{/if}
	</div>

	<!-- Controls Toolbar -->
	<div
		class={cn(
			'flex items-center gap-2 transition-all duration-200',
			isHovered || selected
				? 'translate-x-0 opacity-100'
				: 'pointer-events-none translate-x-2 opacity-0'
		)}
	>
		<!-- Linked Indicator -->
		{#if blockData.linkedBlockId}
			<div class="flex items-center justify-center rounded-sm bg-blue-500/10 p-1 text-blue-500">
				<Link class="size-3" />
			</div>
		{/if}

		<!-- Required Toggle -->
		{#if isAssignable}
			<button
				type="button"
				onclick={(e: MouseEvent) => {
					e.stopPropagation();
					onToggleRequired();
				}}
				class={cn(
					'group flex h-6 w-auto min-w-12 items-center justify-center gap-1.5 rounded-sm border px-1.5 transition-all active:scale-95',
					blockData.required
						? 'border-rose-500/30 bg-rose-500/10 text-rose-500 hover:bg-rose-500/20'
						: 'border-border/50 bg-muted/30 text-muted-foreground hover:bg-muted/50 hover:text-foreground'
				)}
				title="Toggle Required"
			>
				<div
					class={cn(
						'h-1.5 w-1.5 rounded-full transition-colors',
						blockData.required
							? 'bg-rose-500'
							: 'bg-muted-foreground/40 group-hover:bg-muted-foreground'
					)}
				></div>
				<span class="font-bold text-[9px] uppercase tracking-widest">
					{blockData.required ? 'Req' : 'Opt'}
				</span>
			</button>
		{/if}

		<!-- Slot Picker -->
		{#if isAssignable && convexClient}
			<Popover.Root bind:open={isSlotOpen}>
				<Popover.Trigger>
                    {#snippet child({ props })}
                        <Button
                            {...props}
                            variant="outline"
                            size="sm"
                            class="h-6 gap-2 rounded-sm border-border/50 bg-background/50 px-2 font-mono text-[10px] text-foreground uppercase hover:bg-background"
                        >
                            <div
                                class="h-2 w-2 rounded-full ring-1 ring-black/10 ring-inset"
                                style:background-color={slotColor}
                            ></div>
                            <span class="max-w-[80px] truncate">{assignedSlot?.name || 'Assign'}</span>
                        </Button>
                    {/snippet}
				</Popover.Trigger>
				<Popover.Content align="end" class="w-56 rounded-md p-1 shadow-md">
					<div class="flex flex-col gap-0.5">
						<div class="px-2 py-1.5">
							<span class="font-bold text-muted-foreground text-xs uppercase tracking-wider">
								Assign to {isTemplate ? 'Slot' : 'Signer'}
							</span>
						</div>

						<button
							type="button"
							onclick={(e: MouseEvent) => {
								e.stopPropagation();
								onSlotChange(null);
								isSlotOpen = false;
							}}
							class={cn(
								'flex items-center gap-3 rounded-sm px-2 py-1.5 text-left transition-colors hover:bg-accent',
								!blockData.slotId && 'bg-accent/50 text-accent-foreground'
							)}
						>
							<div
								class="flex h-3 w-3 shrink-0 items-center justify-center rounded-full border border-gray-400 border-dashed"
							></div>
							<span class="flex-1 truncate font-medium text-xs">Unassigned</span>
							{#if !blockData.slotId}
								<Check class="size-3 opacity-50" />
							{/if}
						</button>

						<div class="my-1 h-px bg-border/50"></div>

						<button
							type="button"
							onclick={(e: MouseEvent) => {
								e.stopPropagation();
								handleAddSlot();
							}}
							disabled={isMutating}
							class="flex w-full items-center gap-3 rounded-sm px-2 py-1.5 text-left transition-colors hover:bg-primary/10 disabled:opacity-50"
						>
							<div
								class="flex h-3 w-3 shrink-0 items-center justify-center rounded-sm bg-primary/20 text-primary"
							>
								<Plus class="size-2.5" />
							</div>
							<span class="flex-1 font-bold text-primary text-xs uppercase tracking-wider">
								Add New {isTemplate ? 'Slot' : 'Signer'}
							</span>
						</button>

						<div class="my-1 h-px bg-border/50"></div>

						{#each slots as slot (slot.id)}
							<button
								type="button"
								onclick={(e: MouseEvent) => {
									e.stopPropagation();
									onSlotChange(slot.id);
									isSlotOpen = false;
								}}
								class={cn(
									'flex items-center gap-3 rounded-sm px-2 py-1.5 text-left transition-colors hover:bg-accent',
									String(slot.id) === String(blockData.slotId) &&
										'bg-accent/50 text-accent-foreground'
								)}
							>
								<div
									class="h-3 w-3 shrink-0 rounded-full ring-1 ring-black/10 ring-inset"
									style:background-color={slot.color}
								></div>
								<span class="flex-1 truncate font-medium text-xs">{slot.name}</span>
								{#if String(slot.id) === String(blockData.slotId)}
									<Check class="size-3 opacity-50" />
								{/if}
							</button>
						{/each}

						{#if slots.length === 0}
							<div class="px-2 py-2 text-center text-muted-foreground text-xs">
								No {isTemplate ? 'slots' : 'signers'} defined.
							</div>
						{/if}

						<div class="my-1 h-px bg-border/50"></div>

						<div
							class="flex items-center justify-center gap-2 rounded-sm p-1.5 text-muted-foreground text-xs"
						>
							<Users class="size-3" />
							<span>Manage in Sidebar</span>
						</div>
					</div>
				</Popover.Content>
			</Popover.Root>
		{/if}
	</div>
</div>
