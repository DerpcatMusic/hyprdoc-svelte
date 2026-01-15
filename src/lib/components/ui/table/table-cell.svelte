<script lang="ts">
  import type { HTMLTdAttributes } from "svelte/elements";
  import { cn } from "$lib/utils";

  const {
    class: className,
    children,
    ...restProps
  }: HTMLTdAttributes = $props();
</script>

<td
  class={cn("p-4 align-middle [&:has([role=checkbox])]:pr-0", className)}
  {...restProps}
>
  {@render children?.()}
</td>
