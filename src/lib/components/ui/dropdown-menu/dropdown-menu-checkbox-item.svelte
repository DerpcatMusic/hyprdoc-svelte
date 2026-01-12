<script lang="ts">
	import { DropdownMenu as BitsDropdownMenu } from "bits-ui";
	import { cn } from "$lib/utils";

	let {
		class: className,
		children: childrenProp,
		checked = $bindable(false),
		ref = $bindable(null),
		...restProps
	} = $props();
</script>

<BitsDropdownMenu.CheckboxItem
	bind:ref
	bind:checked
	class={cn(
		"relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
		className
	)}
	{...restProps}
>
	{#snippet children({ checked })}
		<span class="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
			{#if checked}
				<div class="i-lucide-check h-4 w-4"></div>
			{/if}
		</span>
		{@render childrenProp?.()}
	{/snippet}
</BitsDropdownMenu.CheckboxItem>
