<script lang="ts">
	import { Select as BitsSelect } from "bits-ui";
	import { cn } from "$lib/utils";

	let {
		children: children_prop,
		class: className,
		value,
		label,
		ref = $bindable(null),
		...restProps
	} = $props();
</script>

<BitsSelect.Item
	bind:ref
	{value}
	{label}
	class={cn(
		"relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
		className
	)}
	{...restProps}
>
	{#snippet children({ selected })}
		<span class="absolute right-2 flex h-3.5 w-3.5 items-center justify-center">
			{#if selected}
				<div class="i-lucide-check h-4 w-4"></div>
			{/if}
		</span>
		{@render children_prop?.()}
	{/snippet}
</BitsSelect.Item>
