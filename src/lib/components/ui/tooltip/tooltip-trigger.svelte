<script lang="ts">
	import { Tooltip as TooltipPrimitive } from "bits-ui";
	import type { Snippet } from "svelte";

	type Props = Omit<TooltipPrimitive.TriggerProps, "children"> & {
		child?: Snippet<[{ props: Record<string, unknown> }]>;
		children?: Snippet;
	};

	let { children, child, ref = $bindable(null), ...restProps }: Props = $props();
</script>

<TooltipPrimitive.Trigger bind:ref data-slot="tooltip-trigger" {...restProps}>
	{#if child}
		{@render child({ props: restProps })}
	{:else}
		{@render children?.()}
	{/if}
</TooltipPrimitive.Trigger>
