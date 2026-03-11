<script lang="ts">
  import type { HTMLAttributes } from "svelte/elements";
  import { cn } from "$lib/utils";

  const {
    class: className,
    children,
    ...restProps
  }: HTMLAttributes<HTMLTableRowElement> = $props();
</script>

<tr
  class={cn(
		"border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted",
		className
	)}
  {...restProps}
>
  {@render children?.()}
</tr>
