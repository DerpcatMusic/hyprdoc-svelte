<script lang="ts">
  import { Dialog as BitsDialog } from "bits-ui";
  import { cn } from "$lib/utils";

  let {
    class: className,
    children,
    ref = $bindable(null),
    ...restProps
  } = $props();
</script>

<BitsDialog.Title
  bind:ref
  class={cn(
		"text-lg font-semibold leading-none tracking-tight",
		className
	)}
  {...restProps}
>
  {@render children?.()}
</BitsDialog.Title>
