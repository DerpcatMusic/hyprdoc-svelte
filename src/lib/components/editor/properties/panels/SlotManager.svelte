<script lang="ts">
	/**
	 * SlotManager - Signer Slot Management Panel
	 *
	 * Allows creating, editing, and deleting signer slots.
	 * Each slot represents a signer who will fill specific fields.
	 */
	import { useDocument } from '$lib/editor/core/editor-context';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Separator } from '$lib/components/ui/separator';
	import * as Popover from '$lib/components/ui/popover';
	import { cn } from '$lib/utils';
	import { Plus, Trash2, Users, Edit2, Check } from 'lucide-svelte';

	const doc = useDocument();

	// Predefined slot colors
	const SLOT_COLORS = [
		'#ef4444', // Red
		'#f97316', // Orange
		'#fbbf24', // Yellow
		'#84cc16', // Lime
		'#10b981', // Emerald
		'#06b6d4', // Cyan
		'#3b82f6', // Blue
		'#8b5cf6', // Violet
		'#d946ef', // Fuchsia
		'#ec4899'  // Pink
	] as const;

	// Editing state
	let editingSlotId = $state<string | null>(null);
	let editingName = $state('');
	let editingEmail = $state('');

	// Derived
	const slots = $derived(doc.slots);

	function addSlot() {
		const nextColor = SLOT_COLORS[slots.length % SLOT_COLORS.length];
		const newSlot = {
			id: crypto.randomUUID(),
			name: `Signer ${slots.length + 1}`,
			color: nextColor,
			email: '',
			initials: `S${slots.length + 1}`
		};
		doc.addSlot(newSlot);
	}

	function removeSlot(id: string) {
		doc.removeSlot(id);
		if (editingSlotId === id) {
			editingSlotId = null;
		}
	}

	function startEditing(slot: typeof slots[number]) {
		editingSlotId = slot.id;
		editingName = slot.name;
		editingEmail = slot.email ?? '';
	}

	function saveEditing() {
		if (!editingSlotId) return;
		doc.updateSlot(editingSlotId, {
			name: editingName,
			email: editingEmail || undefined
		});
		editingSlotId = null;
	}

	function updateSlotColor(slotId: string, color: string) {
		doc.updateSlot(slotId, { color });
	}

	// Count blocks assigned to each slot
	function getAssignedBlockCount(slotId: string): number {
		return doc.blocks.filter((b) => b.slotId === slotId).length;
	}
</script>

<div class="flex flex-col gap-4 p-4">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div class="flex items-center gap-2">
			<Users class="size-4 text-muted-foreground" />
			<h3 class="font-semibold text-sm">Signer Slots</h3>
		</div>
		<Button variant="outline" size="sm" onclick={addSlot} class="h-8 gap-1.5">
			<Plus class="size-3.5" />
			Add Slot
		</Button>
	</div>

	<p class="text-xs text-muted-foreground">
		Create slots for signers and assign fields to each slot. Each signer will only be able to fill their assigned fields.
	</p>

	<Separator />

	<!-- Slot List -->
	{#if slots.length === 0}
		<div class="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed py-8 text-center">
			<div class="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
				<Users class="size-6 text-muted-foreground" />
			</div>
			<div class="space-y-1">
				<p class="font-medium text-sm">No Signer Slots</p>
				<p class="text-xs text-muted-foreground">
					Add slots to assign fields to different signers
				</p>
			</div>
			<Button size="sm" onclick={addSlot} class="gap-1.5">
				<Plus class="size-3.5" />
				Add First Slot
			</Button>
		</div>
	{:else}
		<div class="space-y-3">
			{#each slots as slot (slot.id)}
				<div
					class={cn(
						'group relative rounded-lg border p-3 transition-colors',
						editingSlotId === slot.id && 'ring-2 ring-ring'
					)}
					style:border-color={slot.color}
				>
					{#if editingSlotId === slot.id}
						<!-- Editing Mode -->
						<div class="space-y-3">
							<div class="space-y-1.5">
								<Label class="text-xs">Name</Label>
								<Input
									value={editingName}
									oninput={(e: Event & { currentTarget: HTMLInputElement }) => editingName = e.currentTarget.value}
									placeholder="Signer name"
									class="h-8"
								/>
							</div>
							<div class="space-y-1.5">
								<Label class="text-xs">Email (optional)</Label>
								<Input
									type="email"
									value={editingEmail}
									oninput={(e: Event & { currentTarget: HTMLInputElement }) => editingEmail = e.currentTarget.value}
									placeholder="signer@example.com"
									class="h-8"
								/>
							</div>
							<div class="space-y-1.5">
								<Label class="text-xs">Color</Label>
								<div class="flex flex-wrap gap-1.5">
									{#each SLOT_COLORS as color}
										<button
											type="button"
											class={cn(
												'h-6 w-6 rounded-full transition-transform hover:scale-110',
												slot.color === color && 'ring-2 ring-offset-2 ring-offset-background'
											)}
											style:background-color={color}
											onclick={() => updateSlotColor(slot.id, color)}
										>
											{#if slot.color === color}
												<Check class="size-3 text-white mx-auto" />
											{/if}
										</button>
									{/each}
								</div>
							</div>
							<div class="flex justify-end gap-2 pt-2">
								<Button
									variant="ghost"
									size="sm"
									onclick={() => editingSlotId = null}
								>
									Cancel
								</Button>
								<Button size="sm" onclick={saveEditing}>
									Save
								</Button>
							</div>
						</div>
					{:else}
						<!-- Display Mode -->
						<div class="flex items-start gap-3">
							<div
								class="mt-0.5 h-8 w-8 shrink-0 rounded-full"
								style:background-color={slot.color}
							></div>
							<div class="flex-1 space-y-0.5">
								<p class="font-medium text-sm">{slot.name}</p>
								{#if slot.email}
									<p class="text-xs text-muted-foreground">{slot.email}</p>
								{/if}
								<p class="text-xs text-muted-foreground">
									{getAssignedBlockCount(slot.id)} field{getAssignedBlockCount(slot.id) !== 1 ? 's' : ''} assigned
								</p>
							</div>
							<div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
								<Button
									variant="ghost"
									size="icon"
									class="h-7 w-7"
									onclick={() => startEditing(slot)}
								>
									<Edit2 class="size-3.5" />
								</Button>
								<Button
									variant="ghost"
									size="icon"
									class="h-7 w-7 text-destructive hover:text-destructive"
									onclick={() => removeSlot(slot.id)}
								>
									<Trash2 class="size-3.5" />
								</Button>
							</div>
						</div>
					{/if}
				</div>
			{/each}
		</div>
	{/if}

	<!-- Help Text -->
	<div class="rounded-lg bg-muted/50 p-3">
		<h4 class="mb-1 text-xs font-medium">How it works</h4>
		<ul class="space-y-1 text-xs text-muted-foreground">
			<li>1. Create a slot for each signer</li>
			<li>2. Select fields and assign them to slots</li>
			<li>3. Send the document to signers</li>
			<li>4. Each signer can only fill their fields</li>
		</ul>
	</div>
</div>
