<script lang="ts">
	import { cn } from "$lib/utils";
	import type { HTMLThAttributes } from "svelte/elements";

	const {
		class: className,
		children,
		...restProps
	}: HTMLThAttributes = $props();
</script>

<th
	class={cn(
		"h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0",
		className
	)}
	{...restProps}
>
	{@render children?.()}
</th>
