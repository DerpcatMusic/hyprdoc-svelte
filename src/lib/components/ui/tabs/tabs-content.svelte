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

<BitsTabs.Content
  {value}
  class={cn(
		"mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
		className
	)}
  {...restProps}
>
  {@render children?.()}
</BitsTabs.Content>
