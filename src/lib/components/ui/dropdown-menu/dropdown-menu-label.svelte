<script lang="ts">
	import { DropdownMenu as BitsDropdownMenu } from "bits-ui";
	import { cn } from "$lib/utils";

	const {
		class: className,
		children,
		inset = false,
		...restProps
	} = $props();
</script>

<BitsDropdownMenu.GroupHeading
	class={cn(
		"px-2 py-1.5 text-sm font-semibold",
		inset && "pl-8",
		className
	)}
	{...restProps}
>
	{@render children?.()}
</BitsDropdownMenu.GroupHeading>
