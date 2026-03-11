<script lang="ts">
  import { Command as CommandPrimitive } from "cmdk-sv";
  import { cn } from "$lib/utils";

  let {
    class: className = "",
    children,
    value = "",
    ref = $bindable(null),
    ...restProps
  } = $props();
</script>

<CommandPrimitive.Item
  bind:ref
  {value}
  class={cn(
		"relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none aria-selected:bg-accent aria-selected:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
		className
	)}
  {...restProps}
>
  {@render children?.()}
</CommandPrimitive.Item>
