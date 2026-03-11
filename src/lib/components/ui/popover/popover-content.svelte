<script lang="ts">
  import { Popover as BitsPopover } from "bits-ui";
  import { cn } from "$lib/utils";

  let {
    class: className,
    children,
    sideOffset = 4,
    align = "center",
    ref = $bindable(null),
    ...restProps
  }: {
    class?: string;
    children?: import("svelte").Snippet;
    sideOffset?: number;
    align?: "center" | "end" | "start";
    ref?: HTMLElement | null;
  } = $props();
</script>

<BitsPopover.Portal>
  <BitsPopover.Content
    {align}
    {sideOffset}
    class={cn(
			"z-50 w-72 rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
			className
		)}
    {...restProps}
  >
    {#snippet child({ props })}
      <div {...props} bind:this={ref}>{@render children?.()}</div>
    {/snippet}
  </BitsPopover.Content>
</BitsPopover.Portal>
