<script lang="ts">
  import type { HTMLAttributes } from "svelte/elements";
  import { cn } from "$lib/utils";

  const {
    class: className,
    children,
    ...restProps
  }: HTMLAttributes<HTMLDivElement> = $props();
</script>

<div class={cn("mt-auto flex flex-col gap-2 p-4", className)} {...restProps}>
  {@render children?.()}
</div>
