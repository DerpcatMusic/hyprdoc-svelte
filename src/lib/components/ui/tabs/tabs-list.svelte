<script lang="ts">
  import { Tabs as BitsTabs } from "bits-ui";
  import { cn } from "$lib/utils";

  const { class: className = undefined, children, ...restProps } = $props();
</script>

<BitsTabs.List
  class={cn(
		"inline-flex h-9 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground",
		className
	)}
  {...restProps}
>
  {@render children?.()}
</BitsTabs.List>
