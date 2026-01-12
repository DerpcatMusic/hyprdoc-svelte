<script lang="ts">
	import { cn } from "$lib/utils";
	import type { HTMLAttributes } from "svelte/elements";

	const {
		class: className,
		children,
		...restProps
	}: HTMLAttributes<HTMLTableSectionElement> = $props();
</script>

<tbody
	class={cn("[&_tr:last-child]:border-0", className)}
	{...restProps}
>
	{@render children?.()}
</tbody>
