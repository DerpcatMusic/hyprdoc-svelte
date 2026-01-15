<script lang="ts">
  import { DropdownMenu as BitsDropdownMenu } from "bits-ui";
  import { cn } from "$lib/utils";

  let {
    class: className,
    children,
    inset = false,
    ref = $bindable(null),
    ...restProps
  } = $props();
</script>

<BitsDropdownMenu.SubTrigger
  bind:ref
  class={cn(
		"flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent data-[state=open]:bg-accent",
		inset && "pl-8",
		className
	)}
  {...restProps}
>
  {@render children?.()}
  <div class="i-lucide-chevron-right ml-auto h-4 w-4"></div>
</BitsDropdownMenu.SubTrigger>
