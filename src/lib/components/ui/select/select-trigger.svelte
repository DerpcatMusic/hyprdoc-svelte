<script lang="ts">
  import { Select as BitsSelect } from "bits-ui";
  import { cn } from "$lib/utils";

  let {
    ref = $bindable(null),
    class: className = undefined,
    children,
    ...restProps
  } = $props();
</script>

<BitsSelect.Trigger
  bind:ref
  class={cn(
		"flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-surface-2 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1",
		className
	)}
  {...restProps}
>
  {@render children?.()}
  <div class="i-lucide-chevron-down h-4 w-4 opacity-50"></div>
</BitsSelect.Trigger>
