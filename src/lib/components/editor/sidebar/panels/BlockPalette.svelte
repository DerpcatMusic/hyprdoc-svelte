<script lang="ts">
	import { useDocument, useEditor } from '$lib/editor/core/editor-context';
	import { blockRegistry, CATEGORY_CONFIG, CATEGORY_STYLES } from '$lib/components/editor/smart-blocks/core/block-registry.svelte';
	import { cn } from '$lib/utils';
	import { ScrollArea } from '$lib/components/ui/scroll-area';
	import { Search, Plus } from 'lucide-svelte';
	import { Input } from '$lib/components/ui/input';
	import { Button } from '$lib/components/ui/button';
	import { fly } from 'svelte/transition';

	const doc = useDocument();
	const engine = useEditor();
	
	let searchQuery = $state('');

	// Group blocks by category
	const blocksByCategory = $derived.by(() => {
		const all = blockRegistry.getAll();
		const groups = new Map<string, typeof all>();
		
		const query = searchQuery.toLowerCase();
		
		for (const block of all) {
			if (query && !block.label.toLowerCase().includes(query) && !block.type.includes(query)) {
				continue;
			}
			
			const cat = block.category || 'other';
			if (!groups.has(cat)) groups.set(cat, []);
			groups.get(cat)?.push(block);
		}
		
		return groups;
	});

	function insertBlock(def: any) {
		if (!engine.editor) return;

		const id = crypto.randomUUID();
		const newBlock = {
			id,
			type: def.type,
			label: `New ${def.label}`,
			placeholder: 'Enter value',
			required: false,
			variableName: `${def.type}_${id.slice(0, 4)}`,
			value: null,
			...def.defaults
		};

		engine.editor
			.chain()
			.focus()
			.insertContent({
				type: 'smartBlock',
				attrs: newBlock
			})
			.run();
	}

	function getIconClass(icon: string) {
		return icon ? icon.replace('lucide:', 'i-lucide-') : 'i-lucide-box';
	}
</script>

<div class="flex h-full w-full flex-col bg-transparent">
	<!-- Search Header -->
	<div class="sticky top-0 z-10 border-b border-border/20 bg-card/80 px-3 py-3 backdrop-blur-md">
		<div class="group relative w-full">
			<Search class="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/60 transition-colors group-hover:text-primary/70" />
			<Input 
				placeholder="Search blocks..." 
				bind:value={searchQuery}
				class="w-full h-8 rounded-lg border-border/10 bg-muted/40 pl-8 text-[11px] transition-all focus-visible:border-primary/20 focus-visible:bg-muted/60 focus-visible:ring-0"
			/>
		</div>
	</div>

	<!-- Blocks List -->
	<ScrollArea class="flex-1">
		<div class="space-y-6 px-2 py-4">
			{#if blocksByCategory.size === 0}
				<div class="text-center text-sm text-muted-foreground py-8">
					No blocks found
				</div>
			{/if}

			{#each CATEGORY_CONFIG as category}
				{#if blocksByCategory.has(category.id)}
					<div class="space-y-3">
						<div class="flex items-center gap-2">
							<div class="h-px flex-1 bg-border/40"></div>
							<span class="font-bold text-[10px] uppercase tracking-widest text-muted-foreground/60">
								{category.label}
							</span>
							<div class="h-px flex-1 bg-border/40"></div>
						</div>

						<div class="grid grid-cols-2 gap-2.5">
							{#each blocksByCategory.get(category.id) || [] as block}
								<button
									type="button"
									onclick={() => insertBlock(block)}
									class="group relative flex flex-col gap-2 rounded-xl border border-border/20 bg-card/40 p-2.5 text-left transition-all hover:border-primary/20 hover:bg-card hover:shadow-md hover:scale-[1.02]"
								>
									<!-- Icon Box -->
									<div class={cn(
										"flex h-8 w-8 items-center justify-center rounded-lg border transition-colors",
										CATEGORY_STYLES[category.color] || CATEGORY_STYLES['default']
									)}>
										<span class={cn(getIconClass(block.icon), "size-4")}></span>
									</div>

									<!-- Info -->
									<div class="flex flex-col gap-0.5">
										<span class="font-medium text-xs text-foreground/90 group-hover:text-foreground">
											{block.label}
										</span>
										<span class="line-clamp-1 text-[10px] text-muted-foreground/70">
											{block.description || block.type}
										</span>
									</div>

									<!-- Plus Indicator (Hover) -->
									<div class="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100">
										<div class="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary">
											<span class="i-lucide-plus size-3"></span>
										</div>
									</div>
								</button>
							{/each}
						</div>
					</div>
				{/if}
			{/each}

			<!-- Handle Uncategorized or Other Categories -->
			{#each Array.from(blocksByCategory.keys()) as cat}
				{#if !CATEGORY_CONFIG.find(c => c.id === cat)}
					<div class="space-y-3">
						<div class="flex items-center gap-2">
							<div class="h-px flex-1 bg-border/40"></div>
							<span class="font-bold text-[10px] uppercase tracking-widest text-muted-foreground/60">
								{cat}
							</span>
							<div class="h-px flex-1 bg-border/40"></div>
						</div>
						<div class="grid grid-cols-2 gap-2">
							{#each blocksByCategory.get(cat) || [] as block}
								<button
									type="button"
									onclick={() => insertBlock(block)}
									class="group relative flex flex-col gap-2 rounded-xl border border-border/40 bg-card p-3 text-left transition-all hover:border-border hover:shadow-sm"
								>
									<div class="flex h-8 w-8 items-center justify-center rounded-lg border bg-muted border-border">
										<span class={cn(getIconClass(block.icon), "size-4")}></span>
									</div>
									<div class="flex flex-col gap-0.5">
										<span class="font-medium text-xs text-foreground/90">{block.label}</span>
									</div>
								</button>
							{/each}
						</div>
					</div>
				{/if}
			{/each}
		</div>
	</ScrollArea>
</div>
