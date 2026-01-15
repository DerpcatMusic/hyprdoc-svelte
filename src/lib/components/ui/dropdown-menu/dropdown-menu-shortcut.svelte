<script lang="ts">
  import type { HTMLAttributes } from "svelte/elements";
  import { cn } from "$lib/utils";

  const {
    class: className,
    children,
    ...restProps
  }: HTMLAttributes<HTMLSpanElement> = $props();
</script>

<span
  class={cn("ml-auto text-xs tracking-widest opacity-60", className)}
  {...restProps}
>
  {@render children?.()}
</span>
