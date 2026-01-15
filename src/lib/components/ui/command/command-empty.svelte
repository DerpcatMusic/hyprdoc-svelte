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

<CommandPrimitive.Empty
  class={cn("py-6 text-center text-sm", className)}
  {...restProps}
>
  {@render children?.()}
</CommandPrimitive.Empty>
