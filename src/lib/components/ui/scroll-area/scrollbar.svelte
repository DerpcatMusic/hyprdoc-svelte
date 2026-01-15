<script lang="ts">
  import { ScrollArea as BitsScrollArea } from "bits-ui";
  import { cn } from "$lib/utils";

  const {
    class: className,
    orientation = "vertical" as "vertical" | "horizontal",
    ...restProps
  } = $props();
</script>

<BitsScrollArea.Scrollbar
  {orientation}
  class={cn(
		"flex touch-none select-none transition-colors",
		orientation === "vertical" &&
			"h-full w-2.5 border-l border-l-transparent p-[1px]",
		orientation === "horizontal" &&
			"h-2.5 flex-col border-t border-t-transparent p-[1px]",
		className
	)}
  {...restProps}
>
  <BitsScrollArea.Thumb class="relative flex-1 rounded-full bg-border" />
</BitsScrollArea.Scrollbar>
