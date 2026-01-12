<script lang="ts">
	import { DropdownMenu as BitsDropdownMenu } from "bits-ui";
	import type { Snippet } from "svelte";

	type Props = Omit<BitsDropdownMenu.TriggerProps, "children"> & {
		child?: Snippet<[{ props: Record<string, unknown> }]>;
		children?: Snippet;
	};

	let {
		children,
		child,
		ref = $bindable(null),
		...restProps
	}: Props = $props();
</script>

<BitsDropdownMenu.Trigger bind:ref {...restProps}>
	{#if child}
		{@render child({ props: restProps })}
	{:else}
		{@render children?.()}
	{/if}
</BitsDropdownMenu.Trigger>
