<script lang="ts">
	import { cn } from "$lib/utils";

	const {
		placeholder = "",
		class: className,
		...restProps
	} = $props();
</script>

<span
	class={cn("text-sm", className)}
	data-slot="select-value"
	{...restProps}
>
	{placeholder}
</span>
