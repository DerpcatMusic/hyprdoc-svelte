<script lang="ts">
	/**
	 * GlobalVariablesPanel - Sidebar Panel
	 * 
	 * Manages global variables for the document and user.
	 * specific for Svelte 5 + Runes + UnoCSS Solid Design.
	 */
	import { useQuery, useConvexClient } from 'convex-svelte';
	import { api } from '@/convex/_generated/api';
	import type { Id } from '@/convex/_generated/dataModel';
	import { useDocument } from '$lib/editor/core/editor-context';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { ScrollArea } from '$lib/components/ui/scroll-area';
	import * as Select from '$lib/components/ui/select';
	import { cn } from '$lib/utils';
	import { 
		Plus, Search, Type, Hash, Calendar, CircleDollarSign, 
		ToggleLeft, MoreHorizontal, Copy, Check, Braces, Trash2
	} from 'lucide-svelte';
	import { fly, slide } from 'svelte/transition';

	// ━━━ TYPES ━━━
	type VariableType = 'text' | 'number' | 'date' | 'currency' | 'boolean';

	interface VariableData {
		_id: Id<'globalVariables'>;
		name: string;
		value: any;
		type: string; // Keep as string for loose matching, but cast on save
		scope: 'document' | 'user' | 'system';
		category?: string;
	}

	// ━━━ STATE ━━━
	const doc = useDocument();
	const convex = useConvexClient();
	
	let searchQuery = $state('');
	let isAddingMode = $state(false);
	let editingId = $state<string | null>(null);
	let copiedId = $state<string | null>(null);

	// Form State
	let formData = $state({
		name: '',
		value: '',
		type: 'text' as VariableType, 
		scope: 'document' as 'document' | 'user' | 'system'
	});

	// ━━━ QUERY ━━━
	const queryArgs = $derived({
		query: searchQuery,
		documentId: doc.documentId ?? undefined
	});

	const variablesQuery = useQuery(api.globalVariables.queries.search, () => queryArgs);
	const variables = $derived(variablesQuery.data as VariableData[] | undefined);

	// ━━━ CONFIG ━━━
	const TYPE_CONFIG: Record<VariableType, { icon: any, color: string, label: string }> = {
		text: { icon: Type, color: "text-blue-500", label: "Text" },
		number: { icon: Hash, color: "text-purple-500", label: "Number" },
		date: { icon: Calendar, color: "text-amber-500", label: "Date" },
		currency: { icon: CircleDollarSign, color: "text-emerald-500", label: "Currency" },
		boolean: { icon: ToggleLeft, color: "text-pink-500", label: "Boolean" },
	} as const;

	// ━━━ HELPERS ━━━
	const groupedVariables = $derived.by(() => {
		if (!variables) return {};
		return variables.reduce((acc: Record<string, VariableData[]>, v: VariableData) => {
			const category = v.category || v.scope;
			if (!acc[category]) acc[category] = [];
			acc[category].push(v);
			return acc;
		}, {} as Record<string, VariableData[]>);
	});

	function resetForm() {
		formData = { name: '', value: '', type: 'text', scope: 'document' };
		isAddingMode = false;
		editingId = null;
	}

	function handleEditClick(v: VariableData) {
		editingId = v._id;
		formData = {
			name: v.name,
			value: String(v.value || ''),
			type: v.type as VariableType,
			scope: v.scope === 'system' ? 'user' : v.scope
		};
		isAddingMode = true;
	}

	async function handleSave() {
		if (!editingId && !formData.name) return;

		try {
			if (editingId) {
				await convex.mutation(api.globalVariables.mutations.update, {
					id: editingId as Id<'globalVariables'>,
					value: formData.value || null
				});
			} else {
				const actualScope = formData.scope === 'document' && doc.documentId ? 'document' : 'user';
				await convex.mutation(api.globalVariables.mutations.create, {
					name: formData.name,
					value: formData.value || null,
					type: formData.type as VariableType, // Cast to fix assignment error
					scope: actualScope,
					documentId: actualScope === 'document' ? doc.documentId! : undefined
				});
			}
			resetForm();
		} catch (error) {
			console.error('Failed to save variable', error);
		}
	}

	async function handleDelete(id: string | null) {
		if (!id) return;
		if (editingId === id) resetForm();

		try {
			await convex.mutation(api.globalVariables.mutations.remove, { 
				id: id as Id<'globalVariables'> 
			});
		} catch (error) {
			console.error('Failed to delete', error);
		}
	}

	function handleCopy(name: string, id: string) {
		navigator.clipboard.writeText(`{{${name}}}`);
		copiedId = id;
		setTimeout(() => copiedId = null, 1500);
	}
</script>

<div class="flex h-full w-full flex-col font-sans bg-transparent">
	<!-- Header Area -->
	<div class="sticky top-0 z-20 flex flex-col gap-3 bg-card px-4 py-4 border-b border-border/30">
		<div class="flex items-center justify-between">
			<h2 class="font-display font-semibold text-foreground text-sm tracking-tight opacity-90">Dataset</h2>
			<Button
				size="icon"
				variant="ghost"
				class={cn(
					"h-6 w-6 rounded-full transition-all duration-300 hover:bg-primary hover:text-primary-foreground",
					isAddingMode && "rotate-45 bg-muted text-foreground"
				)}
				onclick={() => isAddingMode ? resetForm() : isAddingMode = true}
			>
				<Plus class="size-3.5" />
			</Button>
		</div>

		<div class="group relative w-full">
			<Search class="absolute top-1/2 left-2.5 h-3 w-3 -translate-y-1/2 text-muted-foreground transition-colors group-hover:text-primary" />
			<Input
				placeholder="Find variable..."
				bind:value={searchQuery}
				class="w-full h-8 rounded-lg border-transparent bg-muted/40 pl-8 text-xs transition-all focus-visible:bg-muted/60 focus-visible:ring-1 focus-visible:ring-primary/20"
			/>
		</div>
	</div>

	<!-- Form Area -->
	{#if isAddingMode}
		<div
			transition:slide={{ duration: 200, axis: 'y' }}
			class="overflow-hidden border-b border-border/40 bg-muted/20"
		>
			<div class="space-y-3 p-4">
				<div class="flex items-center justify-between">
					<span class="font-mono font-bold text-[10px] text-muted-foreground uppercase tracking-wider">
						{editingId ? "Edit" : "New"} Variable
					</span>
					{#if editingId}
						<button
							class="text-[10px] text-destructive hover:underline"
							onclick={() => handleDelete(editingId)}
						>
							Delete
						</button>
					{/if}
				</div>

				<div class="space-y-2">
					<div class="flex gap-2">
						<div class="relative flex-1">
							<span class="absolute top-1/2 left-2 -translate-y-1/2 font-mono text-[10px] text-muted-foreground/60">
								{'{{'}
							</span>
							<Input
								bind:value={formData.name}
								placeholder="name"
								class="h-7 border-border/50 bg-background px-6 font-mono text-xs shadow-none focus-visible:border-primary/50 focus-visible:ring-0"
								disabled={!!editingId}
							/>
							<span class="absolute top-1/2 right-2 -translate-y-1/2 font-mono text-[10px] text-muted-foreground/60">
								{'}}'}
							</span>
						</div>
						
						<Select.Root 
							type="single"
							value={formData.type}
							onValueChange={(v: string) => formData.type = v as VariableType}
						>
							<Select.Trigger class="h-7 w-[80px] border-border/50 bg-background text-[10px] shadow-none focus:ring-0">
								<Select.Value placeholder="Type" class="" />
							</Select.Trigger>
							<Select.Content class="w-[120px]" side="bottom" align="end">
								{#each Object.entries(TYPE_CONFIG) as [type, config]}
									<Select.Item value={type} label={config.label} class="text-xs">
										<div class="flex items-center gap-2">
											<config.icon class="size-3 opacity-70" />
											<span>{config.label}</span>
										</div>
									</Select.Item>
								{/each}
							</Select.Content>
						</Select.Root>
					</div>

					<Input
						bind:value={formData.value}
						placeholder="Value..."
						class="h-7 border-border/50 bg-background text-xs shadow-none focus-visible:border-primary/50 focus-visible:ring-0"
						onkeydown={(e: KeyboardEvent) => e.key === 'Enter' && handleSave()}
					/>

					<Button
						class="h-6 w-full text-[10px] font-medium"
						size="sm"
						variant="secondary"
						onclick={handleSave}
						disabled={!formData.name}
					>
						{editingId ? "Update Variable" : "Create Variable"}
					</Button>
				</div>
			</div>
		</div>
	{/if}

	<!-- List -->
	<ScrollArea class="flex-1">
		<div class="px-2 pb-24">
			{#if variablesQuery.isLoading}
				<div class="p-8 text-center text-[10px] text-muted-foreground/50 uppercase tracking-widest">Loading dataset...</div>
			{:else if !variables || variables.length === 0}
				<div class="flex flex-col items-center justify-center py-16 text-center text-muted-foreground/40">
					<Braces class="mb-2 size-6 opacity-20" />
					<p class="font-medium text-xs">No variables defined</p>
				</div>
			{:else}
				{#each Object.entries(groupedVariables) as [category, vars]}
					<div class="mb-2">
						{#if category !== 'document'} 
							<div class="flex items-center gap-2 bg-muted/20 px-4 py-1.5">
								<span class="font-bold text-[9px] text-muted-foreground/60 uppercase tracking-widest">
									{category}
								</span>
							</div>
						{/if}

						<div class="flex flex-col">
							{#each vars as variable (variable._id)}
								{@const config = TYPE_CONFIG[variable.type as VariableType]}
								<!-- svelte-ignore a11y_click_events_have_key_events -->
								<div
									role="button"
									tabindex="0"
									onclick={() => handleEditClick(variable)}
									class="group relative flex w-full items-center justify-between border-b border-border/30 px-4 py-3 transition-colors hover:bg-muted/40"
								>
									<!-- Left: Icon & Name -->
									<div class="flex items-center gap-3 min-w-0 flex-1">
										<div class={cn(
											"flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-muted/50 text-muted-foreground transition-colors group-hover:text-foreground",
										)}>
											{#if config}
												<config.icon class="size-3" />
											{:else}
												<Type class="size-3" />
											{/if}
										</div>
										<div class="flex flex-col gap-0.5 min-w-0">
											<span class="font-mono font-medium text-foreground/80 text-xs transition-colors group-hover:text-primary truncate">
												{variable.name}
											</span>
											
											<!-- Value Preview -->
											<div class="truncate text-[10px] text-muted-foreground/60">
												{#if variable.value === null || variable.value === ''}
													<span class="italic opacity-50">Empty</span>
												{:else}
													{String(variable.value)}
												{/if}
											</div>
										</div>
									</div>

									<!-- Right: Actions -->
									<div class="flex shrink-0 items-center gap-1 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
										<Button
											variant="ghost"
											size="icon"
											class="h-6 w-6 text-muted-foreground hover:bg-background hover:text-foreground"
											onclick={(e: MouseEvent) => {
												e.stopPropagation();
												handleCopy(variable.name, variable._id);
											}}
										>
											{#if copiedId === variable._id}
												<Check class="size-3 text-green-500" />
											{:else}
												<Copy class="size-3" />
											{/if}
										</Button>
									</div>
								</div>
							{/each}
						</div>
					</div>
				{/each}
			{/if}
		</div>
	</ScrollArea>
</div>
