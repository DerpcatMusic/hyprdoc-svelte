<script lang="ts">
  import { Tooltip as TooltipPrimitive } from "bits-ui";
  import type { Snippet } from "svelte";

  type Props = Omit<TooltipPrimitive.TriggerProps, "children"> & {
    child?: Snippet<[{ props: Record<string, unknown> }]>;
    children?: Snippet;
  };

  let {
    children,
    child,
    ref = $bindable(null),
    asChild = false,
    ...restProps
  }: Props = $props();
</script>

<TooltipPrimitive.Trigger bind:ref data-slot="tooltip-trigger" {asChild} {...restProps}>
	{#snippet child({ props })}
		{#if asChild && child}
			{@render child({ props: { ...props, ...restProps } })}
		{:else}
			<button {...props} {...restProps}>
				{@render children?.()}
			</button>
		{/if}
	{/snippet}
</TooltipPrimitive.Trigger>
