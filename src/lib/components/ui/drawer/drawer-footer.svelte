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
	class={cn("mt-auto flex flex-col gap-2 p-4", className)}
	{...restProps}
>
	{@render children?.()}
</div>
