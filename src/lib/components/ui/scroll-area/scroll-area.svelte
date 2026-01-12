<script lang="ts">
	import { ScrollArea as BitsScrollArea } from "bits-ui";
	import { cn } from "$lib/utils";
	import Scrollbar from "./scrollbar.svelte";

	let {
		class: className,
		children,
		orientation = "vertical",
		ref = $bindable(null),
		...restProps
	}: { 
		class?: string; 
		children?: any; 
		orientation?: "vertical" | "horizontal"; 
		ref?: HTMLElement | null 
	} & Record<string, any> = $props();
</script>

<BitsScrollArea.Root
	bind:ref
	class={cn("relative overflow-hidden", className)}
	{...restProps}
>
	<BitsScrollArea.Viewport class="h-full w-full rounded-[inherit]">
		{@render children?.()}
	</BitsScrollArea.Viewport>
	<Scrollbar {orientation} class="" />
	<BitsScrollArea.Corner />
</BitsScrollArea.Root>
