<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { cn } from '$lib/utils';

	interface Props {
		activeFilter: string;
		onFilterChange: (filter: string) => void;
	}

	let { activeFilter, onFilterChange } = $props<Props>();

	const filters = [
		{ id: 'all', label: 'All Items' },
		{ id: 'core_engine', label: 'Core Engine' },
		{ id: 'integration', label: 'Integrations' },
		{ id: 'business_model', label: 'Business Model' },
		{ id: 'sdk', label: 'SDK' }
	];
</script>

<div class="flex w-full overflow-x-auto pb-4 sm:justify-center sm:pb-0">
	<div class="inline-flex items-center rounded-lg border border-border bg-background p-1 shadow-sm">
		{#each filters as filter}
			<button
				onclick={() => onFilterChange(filter.id)}
				class={cn(
					'flex h-8 items-center justify-center whitespace-nowrap rounded-md px-3 text-sm font-medium transition-all ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
					activeFilter === filter.id
						? 'bg-primary text-primary-foreground shadow-sm'
						: 'text-muted-foreground hover:bg-muted hover:text-foreground'
				)}
			>
				{filter.label}
			</button>
		{/each}
	</div>
</div>
