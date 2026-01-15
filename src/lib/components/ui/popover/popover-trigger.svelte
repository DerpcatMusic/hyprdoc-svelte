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
    asChild = false,
    ...restProps
  }: Props = $props();
</script>

<BitsPopover.Trigger bind:ref {asChild} {...restProps}>
	{#snippet child({ props })}
		{#if asChild && child}
			{@render child({ props: { ...props, ...restProps } })}
		{:else}
			<button {...props} {...restProps}>
				{@render children?.()}
			</button>
		{/if}
	{/snippet}
</BitsPopover.Trigger>
