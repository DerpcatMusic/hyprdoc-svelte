<script lang="ts">
	import { useQuery } from 'convex-svelte';
	import { api } from '$convex/_generated/api';
	import RoadmapTimeline from '$lib/components/marketing/roadmap/RoadmapTimeline.svelte';
	import RoadmapFilters from '$lib/components/marketing/roadmap/RoadmapFilters.svelte';
	import { type Doc } from '$convex/_generated/dataModel';
    import { Button } from "$lib/components/ui/button";

	const roadmapQuery = useQuery(api.roadmap.queries.getPublicRoadmap, {});
	
	let activeFilter = $state('all');

	// Derived state for filtering
	const filteredData = $derived.by(() => {
		if (!roadmapQuery.data) return { itemsByQuarter: {}, quarters: [] };

		const { items, byQuarter } = roadmapQuery.data;

		if (activeFilter === 'all') {
			return { 
                itemsByQuarter: byQuarter, 
                quarters: Object.keys(byQuarter).sort() 
            };
		}

		// Filter items
		const filteredItems = items.filter(item => item.category === activeFilter);
		
		// Re-group by quarter
        const newByQuarter: Record<string, Doc<'roadmapItems'>[]> = {};
        
        filteredItems.forEach(item => {
            if (!newByQuarter[item.quarter]) {
                newByQuarter[item.quarter] = [];
            }
            newByQuarter[item.quarter].push(item);
        });

		return {
			itemsByQuarter: newByQuarter,
			quarters: Object.keys(newByQuarter).sort()
		};
	});
</script>

<div class="container mx-auto px-4 py-24 sm:px-6 lg:px-8">
	<!-- Header -->
	<div class="mx-auto max-w-3xl text-center">
		<h1 class="font-heading text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
			The HyprDoc Roadmap
		</h1>
		<p class="mt-6 text-lg leading-8 text-muted-foreground">
			Our strategic path to a dominant "Doc-as-App" moat. 
            We're building the future of contracts, one logic block at a time.
		</p>
	</div>

	<!-- Stats / Filters -->
	<div class="mt-16 flex flex-col items-center justify-between gap-8 border-b border-border/40 pb-8 sm:flex-row">
        {#if roadmapQuery.data}
            <div class="flex gap-6 text-sm text-muted-foreground">
                <div class="flex items-center gap-2">
                    <span class="block h-2 w-2 rounded-full bg-emerald-500"></span>
                    <span class="font-medium text-foreground">{roadmapQuery.data.stats.completed}</span> Shipped
                </div>
                <div class="flex items-center gap-2">
                    <span class="block h-2 w-2 rounded-full bg-blue-500"></span>
                    <span class="font-medium text-foreground">{roadmapQuery.data.stats.inProgress}</span> In Progress
                </div>
                <div class="flex items-center gap-2">
                    <span class="block h-2 w-2 rounded-full bg-slate-300"></span>
                    <span class="font-medium text-foreground">{roadmapQuery.data.stats.planned}</span> Planned
                </div>
            </div>
        {:else}
            <div class="h-6 w-full animate-pulse rounded bg-muted/50 sm:w-64"></div>
        {/if}

		<RoadmapFilters 
            {activeFilter} 
            onFilterChange={(id) => activeFilter = id} 
        />
	</div>

	<!-- Content -->
	<div class="mt-12">
        {#if roadmapQuery.isLoading}
            <div class="space-y-12">
                 {#each [1, 2, 3] as _}
                    <div class="space-y-6">
                        <div class="flex items-center gap-4">
                            <div class="h-8 w-32 rounded bg-muted"></div>
                            <div class="h-[1px] flex-1 bg-border/40"></div>
                        </div>
                        <div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                            <div class="h-64 rounded-xl border border-border/40 bg-card/50"></div>
                            <div class="h-64 rounded-xl border border-border/40 bg-card/50"></div>
                            <div class="h-64 rounded-xl border border-border/40 bg-card/50"></div>
                        </div>
                    </div>
                 {/each}
            </div>
        {:else if roadmapQuery.error}
            <div class="rounded-xl border border-red-200 bg-red-50 p-8 text-center text-red-900">
                <p>Failed to load roadmap data. Please try again later.</p>
                <p class="text-sm opacity-75">{roadmapQuery.error.toString()}</p>
            </div>
        {:else if roadmapQuery.data}
            {#if filteredData.quarters.length === 0}
                 <div class="py-24 text-center">
                    <p class="text-lg text-muted-foreground">No items found for this filter.</p>
                    <Button variant="link" onclick={() => activeFilter = 'all'}>Clear filters</Button>
                 </div>
            {:else}
			    <RoadmapTimeline 
                    itemsByQuarter={filteredData.itemsByQuarter} 
                    quarters={filteredData.quarters} 
                />
            {/if}
        {/if}
	</div>
</div>
