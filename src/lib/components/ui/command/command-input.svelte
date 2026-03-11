<script lang="ts">
  import { Command as CommandPrimitive } from "cmdk-sv";
  import { cn } from "$lib/utils";

  let {
    class: className,
    value = $bindable(""),
    ref = $bindable(null),
    ...restProps
  } = $props();
</script>

<div class="flex items-center border-b px-3" data-cmdk-input-wrapper="">
  <div class="i-lucide-search mr-2 h-4 w-4 shrink-0 opacity-50"></div>
  <CommandPrimitive.Input
    bind:el={ref}
    bind:value
    class={cn(
			"flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50",
			className
		)}
    {...restProps}
  />
</div>
