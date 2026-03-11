<script lang="ts">
  import { Dialog as BitsDialog } from "bits-ui";
  import { cn } from "$lib/utils";

  let {
    class: className,
    ref = $bindable(null),
    ...restProps
  }: { class?: string; ref?: HTMLElement | null } & Record<
    string,
    any
  > = $props();
</script>

<BitsDialog.Overlay
  class={cn(
		"fixed inset-0 z-50 bg-black/80  data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
		className
	)}
  {...restProps}
>
  {#snippet child({ props })}
    <div {...props} bind:this={ref}></div>
  {/snippet}
</BitsDialog.Overlay>
