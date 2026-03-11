<script lang="ts">
	import { cn } from '$lib/utils';
	import { Badge } from '$lib/components/ui/badge';
	import type { Doc } from '$convex/_generated/dataModel';

	interface Props {
		item: Doc<'roadmapItems'>;
	}

	let { item }: Props = $props();

	type Status = 'planned' | 'in_progress' | 'completed';

	const statusColors: Record<Status, string> = {
		planned: 'bg-slate-100 text-slate-600 border-slate-200',
		in_progress: 'bg-blue-50 text-blue-700 border-blue-200',
		completed: 'bg-emerald-50 text-emerald-700 border-emerald-200'
	};

	const statusLabels: Record<Status, string> = {
		planned: 'Planned',
		in_progress: 'In Progress',
		completed: 'Shipped'
	};

	const priorityColors = {
		p0_critical: 'bg-red-50 text-red-700 border-red-200',
		p1_high: 'bg-orange-50 text-orange-700 border-orange-200',
		p2_medium: 'bg-yellow-50 text-yellow-700 border-yellow-200'
	};

	const categoryLabels: Record<string, string> = {
		core_engine: 'Core Engine',
		integration: 'Integration',
		business_model: 'Business Model',
		sdk: 'SDK'
	};
</script>

<div
	class="group relative flex flex-col gap-3 rounded-xl border border-border/40 bg-card p-5 transition-all hover:border-border/80 hover:shadow-sm"
>
	<div class="flex items-start justify-between gap-4">
		<div class="space-y-1">
			<div class="flex items-center gap-2">
				<Badge variant="outline" class={cn('rounded-md px-2 py-0.5 text-xs font-medium', statusColors[item.status])}>
					{statusLabels[item.status]}
				</Badge>
				{#if item.priority === 'p0_critical'}
					<Badge variant="outline" class="rounded-md border-red-200 bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
						Critical
					</Badge>
				{/if}
			</div>
			<h3 class="font-heading text-lg font-semibold tracking-tight text-foreground">
				{item.title}
			</h3>
		</div>
		<div
			class="flex h-8 w-8 items-center justify-center rounded-full border border-border/50 bg-background text-xs font-semibold text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
		>
			#{item.order}
		</div>
	</div>

	<p class="text-sm leading-relaxed text-muted-foreground">
		{item.description}
	</p>

	{#if item.competitorKill}
		<div
			class="mt-2 flex items-center gap-2 rounded-lg border border-red-100 bg-red-50/50 px-3 py-2 text-xs text-red-900 dark:border-red-900/30 dark:bg-red-900/10 dark:text-red-300"
		>
			<span class="font-semibold uppercase tracking-wider text-red-600/80 dark:text-red-400">Kill</span>
			<span class="opacity-80">{item.competitorKill}</span>
		</div>
	{/if}

	<div class="mt-auto flex items-center justify-between border-t border-border/30 pt-4 text-xs text-muted-foreground">
		<div class="flex items-center gap-2">
			<span>{categoryLabels[item.category] ?? item.category}</span>
		</div>
		{#if item.valueProposition}
			<span class="hidden sm:inline-block opacity-60 truncate max-w-[200px]" title={item.valueProposition}>
				{item.valueProposition}
			</span>
		{/if}
	</div>
</div>
