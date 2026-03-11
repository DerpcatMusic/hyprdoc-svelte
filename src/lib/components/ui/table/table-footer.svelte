<script lang="ts">
  import type { HTMLAttributes } from "svelte/elements";
  import { cn } from "$lib/utils";

  const {
    class: className,
    children,
    ...restProps
  }: HTMLAttributes<HTMLTableSectionElement> = $props();
</script>

<tfoot
  class={cn(
		"border-t bg-muted/50 font-medium [&>tr]:last:border-b-0",
		className
	)}
  {...restProps}
>
  {@render children?.()}
</tfoot>
