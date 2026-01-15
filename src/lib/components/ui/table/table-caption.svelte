<script lang="ts">
  import type { HTMLAttributes } from "svelte/elements";
  import { cn } from "$lib/utils";

  const {
    class: className,
    children,
    ...restProps
  }: HTMLAttributes<HTMLTableCaptionElement> = $props();
</script>

<caption
  class={cn("mt-4 text-sm text-muted-foreground", className)}
  {...restProps}
>
  {@render children?.()}
</caption>
