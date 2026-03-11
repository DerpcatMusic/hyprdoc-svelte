<script lang="ts">
  import { Tabs as BitsTabs } from "bits-ui";
  import { cn } from "$lib/utils";

  const {
    class: className = undefined,
    children,
    value,
    ...restProps
  } = $props();
</script>

<BitsTabs.Trigger
  {value}
  class={cn(
		"inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow",
		className
	)}
  {...restProps}
>
  {@render children?.()}
</BitsTabs.Trigger>
