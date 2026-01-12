<script lang="ts">
	import { cn } from "$lib/utils";
	import type { HTMLAttributes } from "svelte/elements";

	const {
		class: className,
		children,
		...restProps
	}: HTMLAttributes<HTMLTableCaptionElement> = $props();
</script>

<caption
	class={cn("mt-4 text-sm text-muted-foreground", className)}
	{...restProps}
>
	{@render children?.()}
</caption>
