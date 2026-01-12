<script lang="ts">
import { Skeleton } from '$lib/components/ui/skeleton';
import { blockRegistry } from './block-registry.svelte';

interface Props {
	type: string;
	data: any;
	value: any;
}

const { type, data, value }: Props = $props();

const definition = $derived(blockRegistry.get(type));

// Reactive component loader
let Component = $state<any>(null);
let error = $state<string | null>(null);
let loading = $state(true);

$effect(() => {
	if (definition) {
		loading = true;
		error = null;
		Component = (definition as any).component;
		loading = false;
	} else {
		loading = false;
		error = 'Block definition not found';
	}
});
</script>

{#if loading}
	<div class="space-y-2">
		<Skeleton class="h-4 w-1/4" />
		<Skeleton class="h-10 w-full" />
	</div>
{:else if error}
	<div
		class="rounded border border-destructive/50 bg-destructive/5 p-4 text-center text-xs text-destructive"
	>
		<span class="i-lucide-alert-circle mr-2 inline-block h-4 w-4 align-text-bottom"></span>
		{error} ({type})
	</div>
{:else if Component}
	<Component {data} {value} />
{/if}
