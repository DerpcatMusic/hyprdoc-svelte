<script lang="ts">
	import { cn } from "$lib/utils";
	import type { HTMLAttributes } from "svelte/elements";

	const {
		class: className,
		children,
		...restProps
	}: HTMLAttributes<HTMLSpanElement> = $props();
</script>

<span
	class={cn("ml-auto text-xs tracking-widest opacity-60", className)}
	{...restProps}
>
	{@render children?.()}
</span>
