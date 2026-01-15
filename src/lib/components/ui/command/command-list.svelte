<script lang="ts">
  import { Command as CommandPrimitive } from "cmdk-sv";
  import { cn } from "$lib/utils";

  let {
    class: className = "",
    children,
    ref = $bindable(null),
    ...restProps
  } = $props();
</script>

<CommandPrimitive.List
  bind:el={ref}
  class={cn("max-h-[300px] overflow-y-auto overflow-x-hidden", className)}
  {...restProps}
>
  {@render children?.()}
</CommandPrimitive.List>
