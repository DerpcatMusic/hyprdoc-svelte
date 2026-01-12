<script lang="ts">
	/**
	 * BlockSettingsTab - Block-specific Settings Panel
	 *
	 * Renders common block settings (label, required, placeholder, etc.)
	 * plus lazy-loaded block-specific settings from the registry.
	 */
	import { useDocument } from '$lib/editor/core/editor-context';
	import { blockRegistry } from '$lib/components/editor/smart-blocks/core/block-registry.svelte';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Switch } from '$lib/components/ui/switch';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '$lib/components/ui/select';
	import { Separator } from '$lib/components/ui/separator';
	import { Tabs, TabsList, TabsTrigger, TabsContent } from '$lib/components/ui/tabs';
	import { untrack } from 'svelte';

	const doc = useDocument();

	// Selected block data
	const selectedBlock = $derived(
		doc.selectedBlockId ? doc.blocksMap.get(doc.selectedBlockId) : null
	);

	// Block definition from registry
	const definition = $derived(
		selectedBlock ? blockRegistry.get(selectedBlock.type) : null
	);

	// Update handler
	function handleChange(field: string, value: unknown) {
		if (!doc.selectedBlockId) return;
		doc.updateBlock(doc.selectedBlockId, { [field]: value as any });
	}

	// Block-specific settings component (lazy loaded)
	let SettingsComponent = $state<any>(null);
	let settingsError = $state<string | null>(null);

	$effect(() => {
		const def = definition;
		if (def?.settings) {
			settingsError = null;
			SettingsComponent = def.settings;
		} else {
			SettingsComponent = null;
			settingsError = null;
		}
	});
</script>

{#if selectedBlock}
	<div class="space-y-6 p-4">
		<!-- Block Type Header -->
		<div class="flex items-center gap-3">
			<div
				class="flex h-10 w-10 items-center justify-center rounded-lg border bg-muted"
			>
				{#if definition?.icon}
					<span class={definition.icon.replace('lucide:', 'i-lucide-') + ' size-5 text-muted-foreground'}></span>
				{:else}
					<span class="i-lucide-box size-5 text-muted-foreground"></span>
				{/if}
			</div>
			<div>
				<h3 class="font-semibold text-sm">{definition?.label ?? selectedBlock.type}</h3>
				<p class="text-xs text-muted-foreground">{definition?.description ?? 'Block settings'}</p>
			</div>
		</div>

		<Separator />

		<!-- Tabs for Settings / Visibility / Assignment -->
		<Tabs value="settings" class="w-full">
			<TabsList class="grid w-full grid-cols-3">
				<TabsTrigger value="settings" class="text-xs">Settings</TabsTrigger>
				<TabsTrigger value="visibility" class="text-xs">Visibility</TabsTrigger>
				<TabsTrigger value="assignment" class="text-xs">Assignment</TabsTrigger>
			</TabsList>

			<!-- Settings Tab -->
			<TabsContent value="settings" class="space-y-4 pt-4">
				<!-- ━━━ COMMON SETTINGS ━━━ -->

				<!-- Label -->
				<div class="space-y-2">
					<Label for="block-label" class="text-xs font-medium">Field Label</Label>
					<Input
						id="block-label"
						value={selectedBlock.label}
						oninput={(e: any) => handleChange('label', e.currentTarget.value)}
						placeholder="Enter field label..."
						class="h-9"
					/>
				</div>

				<!-- Placeholder -->
				<div class="space-y-2">
					<Label for="block-placeholder" class="text-xs font-medium">Placeholder</Label>
					<Input
						id="block-placeholder"
						value={selectedBlock.placeholder ?? ''}
						oninput={(e: any) => handleChange('placeholder', e.currentTarget.value)}
						placeholder="Displayed when empty..."
						class="h-9"
					/>
				</div>

				<!-- Variable Name -->
				<div class="space-y-2">
					<Label for="block-varname" class="text-xs font-medium">Variable Name</Label>
					<Input
						id="block-varname"
						value={selectedBlock.variableName ?? ''}
						oninput={(e: any) => handleChange('variableName', e.currentTarget.value)}
						placeholder="my_variable"
						class="h-9 font-mono text-xs"
					/>
					<p class="text-xs text-muted-foreground">
						Use as: <code class="rounded bg-muted px-1">{'{{' + (selectedBlock.variableName || 'variable') + '}}'}</code>
					</p>
				</div>

				<!-- Required Toggle -->
				<div class="flex items-center justify-between py-2">
					<div class="space-y-0.5">
						<Label class="text-xs font-medium">Required Field</Label>
						<p class="text-xs text-muted-foreground">Must be filled to submit</p>
					</div>
					<Switch
						checked={selectedBlock.required ?? false}
						onCheckedChange={(v: boolean) => handleChange('required', v)}
					/>
				</div>

				<!-- Field Width -->
				<div class="space-y-2">
					<Label class="text-xs font-medium">Field Width</Label>
					<Select
						value={selectedBlock.width ?? 'full'}
						onValueChange={(v: string) => handleChange('width', v)}
					>
						<SelectTrigger class="h-9">
							<SelectValue class="text-xs" placeholder="Select width" />
						</SelectTrigger>
							<SelectContent class="">
								<SelectItem class="text-xs" value="full" label="Full Width">Full Width</SelectItem>
								<SelectItem class="text-xs" value="half" label="Half">Half</SelectItem>
								<SelectItem class="text-xs" value="third" label="Third">Third</SelectItem>
								<SelectItem class="text-xs" value="quarter" label="Quarter">Quarter</SelectItem>
							</SelectContent>
					</Select>
				</div>

				<!-- Helper Text -->
				<div class="space-y-2">
					<Label for="block-helper" class="text-xs font-medium">Helper Text</Label>
					<Textarea
						id="block-helper"
						value={selectedBlock.helperText ?? ''}
						oninput={(e: any) => handleChange('helperText', e.currentTarget.value)}
						placeholder="Hint displayed below field..."
						rows={2}
						class="resize-none text-sm"
					/>
				</div>

				<Separator />

				<!-- ━━━ BLOCK-SPECIFIC SETTINGS ━━━ -->
				{#if SettingsComponent}
					<div class="space-y-4">
						<h4 class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
							{definition?.label} Options
						</h4>
						<SettingsComponent
							data={selectedBlock}
							onChange={handleChange}
							slots={doc.slots}
						/>
					</div>
				{:else if settingsError}
					<div class="rounded border border-destructive/50 bg-destructive/5 p-3 text-xs text-destructive">
						{settingsError}
					</div>
				{/if}
			</TabsContent>

			<!-- Visibility Tab -->
			<TabsContent value="visibility" class="space-y-4 pt-4">
				<div class="space-y-2">
					<div class="flex items-center justify-between">
						<Label class="text-xs font-medium">Conditional Visibility</Label>
						<Switch
							checked={selectedBlock.visibilityCondition?.enabled ?? false}
							onCheckedChange={(v: boolean) =>
								handleChange('visibilityCondition', {
									...selectedBlock.visibilityCondition,
									enabled: v
								})
							}
						/>
					</div>
					<p class="text-xs text-muted-foreground">
						Show/hide this field based on another field's value
					</p>
				</div>

				{#if selectedBlock.visibilityCondition?.enabled}
					<div class="space-y-4 rounded border border-dashed p-4">
						<p class="text-center text-xs text-muted-foreground">
							Visibility conditions coming soon...
						</p>
					</div>
				{/if}
			</TabsContent>

			<!-- Assignment Tab -->
			<TabsContent value="assignment" class="space-y-4 pt-4">
				<div class="space-y-2">
					<Label class="text-xs font-medium">Assign to Signer</Label>
					<p class="text-xs text-muted-foreground">
						Select which signer slot should fill this field
					</p>
				</div>

				<Select
					value={selectedBlock.slotId ?? ''}
					onValueChange={(v: string) => handleChange('slotId', v || null)}
				>
					<SelectTrigger class="h-9">
						<SelectValue class="text-xs" placeholder="Select signer slot..." />
					</SelectTrigger>
					<SelectContent class="">
						<SelectItem class="text-xs" value="" label="Unassigned">Unassigned</SelectItem>
						{#each doc.slots as slot}
							<SelectItem class="text-xs" value={slot.id} label={slot.name}>
								<div class="flex items-center gap-2">
									<div
										class="h-3 w-3 rounded-full"
										style:background-color={slot.color}
									></div>
									{slot.name}
								</div>
							</SelectItem>
						{/each}
					</SelectContent>
				</Select>

				{#if selectedBlock.slotId}
					{@const slot = doc.slots.find((s) => s.id === selectedBlock.slotId)}
					{#if slot}
						<div
							class="flex items-center gap-3 rounded border p-3"
							style:border-color={slot.color}
						>
							<div
								class="h-8 w-8 rounded-full"
								style:background-color={slot.color}
							></div>
							<div>
								<p class="text-sm font-medium">{slot.name}</p>
								<p class="text-xs text-muted-foreground">{slot.email ?? 'No email'}</p>
							</div>
						</div>
					{/if}
				{/if}
			</TabsContent>
		</Tabs>
	</div>
{:else}
	<div class="flex flex-col items-center justify-center gap-4 p-8 text-center">
		<div class="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
			<span class="i-lucide-mouse-pointer-click size-8 text-muted-foreground"></span>
		</div>
		<div class="space-y-1">
			<p class="font-medium text-sm">No Block Selected</p>
			<p class="text-xs text-muted-foreground">
				Click on a smart block in the editor to configure its settings
			</p>
		</div>
	</div>
{/if}
