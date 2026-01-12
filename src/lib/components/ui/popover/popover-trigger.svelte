<script lang="ts">
	import { Popover as BitsPopover } from "bits-ui";
	import type { Snippet } from "svelte";

	type Props = Omit<BitsPopover.TriggerProps, "children"> & {
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

<BitsPopover.Trigger bind:ref {...restProps}>
	{#if child}
		{@render child({ props: restProps })}
	{:else}
		{@render children?.()}
	{/if}
</BitsPopover.Trigger>
