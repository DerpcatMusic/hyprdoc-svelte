<script lang="ts">
	import RoadmapCard from './RoadmapCard.svelte';
	import type { Doc } from '$convex/_generated/dataModel';
	import { cn } from '$lib/utils';

	interface Props {
		itemsByQuarter: Record<string, Doc<'roadmapItems'>[]>;
		quarters: string[];
	}

	let { itemsByQuarter, quarters }: Props = $props();

	const currentDate = new Date();
	const currentYear = currentDate.getFullYear();
	
    // Helper to determine if a quarter is in the past, present, or future
    // Format: "Q1 2026"
	function getTimelineStatus(quarterStr: string) {
        const [q, yearStr] = quarterStr.split(' ');
        const year = parseInt(yearStr);
        // Simple approximation
        if (year < currentYear) return 'past';
        if (year > currentYear) return 'future';
        // Same year logic could be added here
        return 'present'; 
	}
</script>

<div class="relative space-y-16 pl-4 before:absolute before:inset-y-0 before:left-0 before:w-[2px] before:bg-border/40 sm:pl-0 sm:before:hidden">
	{#each quarters as quarter}
		<section id={quarter.replace(' ', '-').toLowerCase()} class="relative scroll-mt-24">
            <!-- Timeline Marker (Mobile) -->
            <div class="absolute -left-[5px] top-6 h-3 w-3 rounded-full border-2 border-primary bg-background ring-4 ring-background sm:hidden"></div>

			<div class="mb-6 flex flex-col gap-2 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
				<div>
					<span class="font-mono text-xs font-semibold uppercase tracking-wider text-muted-foreground/80">
						Timeline
					</span>
					<h2 class="font-heading text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
						{quarter}
					</h2>
				</div>
                <div class="hidden h-[1px] flex-1 bg-border/40 sm:mx-6 sm:mb-2 sm:block"></div>
			</div>

			<div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
				{#each itemsByQuarter[quarter] || [] as item (item._id)}
					<RoadmapCard {item} />
				{/each}
			</div>
		</section>
	{/each}
</div>
