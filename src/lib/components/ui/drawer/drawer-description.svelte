<script lang="ts">
  import { Drawer as Vaul } from "vaul-svelte";
  import { cn } from "$lib/utils";

  let {
    class: className,
    children,
    ref = $bindable(null),
    ...restProps
  } = $props();
</script>

<Vaul.Description
  bind:ref
  class={cn("text-sm text-muted-foreground", className)}
  {...restProps}
>
  {@render children?.()}
</Vaul.Description>
