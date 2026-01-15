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

<CommandPrimitive.Root
  class={cn(
		"flex h-full w-full flex-col overflow-hidden rounded-md bg-popover text-popover-foreground",
		className
	)}
  {...restProps}
>
  {@render children?.()}
</CommandPrimitive.Root>
