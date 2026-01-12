<script lang="ts">
	import { cn } from "$lib/utils";
	import type { HTMLAttributes } from "svelte/elements";

	const {
		class: className,
		children,
		...restProps
	}: HTMLAttributes<HTMLDivElement> = $props();
</script>

<div
	class={cn("grid gap-1.5 p-4 text-center sm:text-left", className)}
	{...restProps}
>
	{@render children?.()}
</div>
