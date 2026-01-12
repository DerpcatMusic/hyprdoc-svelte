<script lang="ts">
import { onMount } from 'svelte';
import { gsap } from 'gsap';
import { spring } from 'svelte/motion';
import { fade, scale } from 'svelte/transition';
import { goto } from '$app/navigation';
import { Input } from '$lib/components/ui/input';
import { Button } from '$lib/components/ui/button';
import { page } from '$app/state';
import { cn } from '$lib/utils';

interface Props {
	stats: {
		total: number;
		pending: number;
		completed: number;
		draft: number;
	};
	searchQuery: string;
	statusFilter: string;
	userName?: string | null;
}

let { stats, searchQuery = $bindable(), statusFilter = $bindable(), userName }: Props = $props();

let inputRef = $state<HTMLInputElement | null>(null);
let searchContainerRef = $state<HTMLElement>();
let isFocused = $state(false);

const isExpanded = $derived(isFocused || searchQuery.length > 0);

const filters = $derived.by(() => [
	{ id: 'all', label: 'All', count: stats.total, iconClass: 'i-lucide-file-text' },
	{ id: 'draft', label: 'Draft', count: stats.draft, iconClass: 'i-lucide-file-edit' },
	{ id: 'pending_signatures', label: 'Pending', count: stats.pending, iconClass: 'i-lucide-clock' },
	{
		id: 'completed',
		label: 'Completed',
		count: stats.completed,
		iconClass: 'i-lucide-check-circle'
	}
]);

const currentDate = new Date().toLocaleDateString('en-US', {
	month: 'short',
	day: 'numeric'
});

onMount(() => {
	const handleKeyDown = (e: KeyboardEvent) => {
		if ((e.ctrlKey || e.metaKey) && (e.key === 'f' || e.key === 'k')) {
			e.preventDefault();
			inputRef?.focus();
		}
		if (e.key === 'Escape') {
			inputRef?.blur();
			isFocused = false;
		}
	};
	window.addEventListener('keydown', handleKeyDown);
	return () => window.removeEventListener('keydown', handleKeyDown);
});

// GSAP Search Expansion
$effect(() => {
	if (!searchContainerRef) { return; }

	if (isExpanded) {
		gsap.to(searchContainerRef, {
			maxWidth: '100%',
			duration: 0.4,
			ease: 'expo.out'
		});
	} else {
		gsap.to(searchContainerRef, {
			maxWidth: '12rem', // 48
			duration: 0.3,
			ease: 'power2.inOut'
		});
	}
});

function clearSearch() {
	searchQuery = '';
	inputRef?.focus();
}
</script>

<div class="z-40 flex w-full justify-center px-4 pt-8">
	<div
		class={cn(
			"glass-blur shadow-premium relative flex h-16 items-center overflow-hidden rounded-full border border-border/60 p-1.5 transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] shadow-glass",
			isExpanded ? "w-full max-w-3xl bg-background/90" : "w-auto"
		)}
	>
		<!-- Welcome Section -->
		{#if !isExpanded}
			<div
				transition:fade={{ duration: 200 }}
				class="flex shrink-0 items-center border-border/20 border-r py-1 pr-6 pl-5"
			>
				<div class="flex flex-col whitespace-nowrap">
					<span
						class="font-bold text-[10px] text-muted-foreground uppercase leading-none tracking-widest text-opacity-70"
					>
						{currentDate}
					</span>
					<span class="mt-1 font-bold text-base tracking-tight">
						Hi, {userName || "Creative"}
					</span>
				</div>
			</div>
		{/if}

		<!-- Filters -->
		{#if !isExpanded}
			<div transition:fade={{ duration: 200 }} class="flex shrink-0 items-center gap-1 px-3">
				{#each filters as f}
					<Button
						variant="ghost"
						onclick={() => statusFilter = f.id}
						class={cn(
							"group relative flex h-12 items-center gap-2 rounded-full px-4 transition-all active:scale-95 hover:bg-transparent",
							statusFilter === f.id
								? "text-primary-foreground hover:text-primary-foreground"
								: "text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground"
						)}
					>
						<span class={cn(f.iconClass, "relative z-10 w-4.5 h-4.5")}></span>
						<span class="relative z-10 font-bold text-sm tracking-tight">{f.count}</span>
						{#if statusFilter === f.id}
							<div
								class="absolute inset-x-1 inset-y-1 z-0 rounded-full bg-primary shadow-sm"
								in:scale={{ duration: 300, start: 0.9 }}
							></div>
						{/if}
					</Button>
				{/each}
			</div>
		{/if}

		<!-- Search Container -->
		<div
			bind:this={searchContainerRef}
			class={cn(
				"relative flex h-12 items-center overflow-hidden transition-all duration-300",
				isExpanded ? "flex-1 px-4" : "w-48 pl-2"
			)}
		>
			<div class="pointer-events-none absolute left-6 flex items-center">
				<span
					class={cn(
						"i-lucide-search w-5 h-5 transition-colors duration-300",
						isExpanded ? "text-primary scale-110" : "text-muted-foreground/60"
					)}
				></span>
			</div>
			<Input
				bind:ref={inputRef}
				type="text"
				bind:value={searchQuery}
				onfocus={() => isFocused = true}
				onblur={() => isFocused = false}
				placeholder={isExpanded ? "Search for documents, templates, or recipients..." : "Search..."}
				class={cn(
					"selection:bg-primary selection:text-primary-foreground h-11 w-full border-none bg-transparent pr-4 pl-12 font-medium text-sm outline-none transition-all placeholder:text-muted-foreground/40 hover:bg-black/5 dark:hover:bg-white/5 focus:bg-black/5 dark:focus:bg-white/5",
					isExpanded && "text-base"
				)}
			/>
			{#if searchQuery.length > 0}
				<button
					transition:scale={{ duration: 150 }}
					onclick={clearSearch}
					aria-label="Clear search"
					class="absolute right-6 flex h-8 w-8 items-center justify-center rounded-full bg-background/50 text-muted-foreground shadow-sm transition-all hover:bg-background hover:text-foreground hover:scale-110"
				>
					<span class="i-lucide-x w-4 h-4"></span>
				</button>
			{/if}
		</div>
	</div>
</div>
